import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const views: [string, string[]][] = [
  ['/', ['about', 'work', 'agents', 'skills', 'timeline', 'linkedin']],
  ['/life/', ['life', 'photography', 'sport', 'adventure', 'making']],
];

for (const [path, sections] of views)
  test(`nav links land each section below the navbar on ${path}`, async ({ page }) => {
    await page.goto(path);
    for (const id of sections) {
      await page.locator(`header nav[aria-label="Main"] a[href="#${id}"]`).click();
      await expect
        .poll(
          async () => {
            const navBottom = await page
              .locator('header[data-nav]')
              .evaluate((el) => el.getBoundingClientRect().bottom);
            const top = await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);
            return top >= navBottom - 2 && top < 400;
          },
          { timeout: 4000 },
        )
        .toBe(true);
    }
  });

test('mobile menu: open, trap, Esc, closes on widen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('.nav-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#mobile-menu')).toBeVisible();
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('header'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('html')).not.toHaveClass(/menu-open/);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('every section heading becomes visible', async ({ page }) => {
    await page.goto('/');
    for (const h of await page.locator('main h1, main h2').all()) {
      await h.scrollIntoViewIfNeeded();
      await expect(h).toBeVisible();
      await expect
        .poll(async () => Number(await h.evaluate((el) => getComputedStyle(el).opacity)), {
          timeout: 3000,
        })
        .toBe(1);
    }
  });
  // RESPECT_REDUCED_MOTION is false (owner's choice): the OS setting is ignored
  test('plays the full animations even when the OS asks for reduced motion', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/reduced-motion/);
    await expect(page.locator('html')).toHaveClass(/lenis/);
    await expect
      .poll(() => page.evaluate(() => document.querySelectorAll('#about .word').length))
      .toBeGreaterThan(0);
  });
});

test.describe('no javascript', () => {
  test.use({ javaScriptEnabled: false });
  test('content is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#contact h2')).toBeVisible();
  });
});

test('content becomes visible if the motion bundle fails to load', async ({ page }) => {
  await page.route(/\/_astro\/.*\.js$/, (r) => r.abort());
  await page.goto('/');
  await page.waitForTimeout(3000);
  await expect(page.locator('html')).not.toHaveClass(/js-motion/);
  expect(Number(await page.locator('#work h2').evaluate((el) => getComputedStyle(el).opacity))).toBe(1);
});

test('no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  // The About paragraph's words start dim and brighten with scroll: scan its settled state
  await page.evaluate(() => {
    const p = document.querySelector('.about-body')!;
    window.scrollTo(0, p.getBoundingClientRect().bottom + scrollY - innerHeight * 0.3);
  });
  await expect
    .poll(() => page.$eval('.about-body .word:last-child', (el) => getComputedStyle(el).opacity))
    .toBe('1');
  // Re-scan until fades triggered by the scroll finish; a persistent violation still fails
  await expect
    .poll(
      async () => {
        const results = await new AxeBuilder({ page }).analyze();
        return results.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}: ${v.nodes.length}`);
      },
      { timeout: 5000 },
    )
    .toEqual([]);
});

test('view switch moves between the professional and personal pages', async ({ page }) => {
  await page.goto('/');
  const sw = page.locator('header nav[aria-label="View"]');
  await expect(sw.locator('a[aria-current="page"]')).toHaveText('Professional');
  await expect(page.locator('#photography')).toHaveCount(0);
  await sw.getByRole('link', { name: 'Personal' }).click();
  await expect(page).toHaveURL(/\/life\/$/);
  await expect(sw.locator('a[aria-current="page"]')).toHaveText('Personal');
  await expect(page.locator('#photography')).toHaveCount(1);
  await expect(page.locator('#work')).toHaveCount(0);
});

test('personal page has no serious accessibility violations', async ({ page }) => {
  await page.goto('/life/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(
      async () => {
        const results = await new AxeBuilder({ page }).analyze();
        return results.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}: ${v.nodes.length}`);
      },
      { timeout: 6000 },
    )
    .toEqual([]);
});

for (const path of ['/', '/life/', '/card/'])
  for (const [w, h] of [
    [390, 844],
    [360, 640],
    [1440, 900],
  ]) {
    test(`no horizontal overflow on ${path} at ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(path);
      const { scrollW, clientW } = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      }));
      expect(scrollW).toBeLessThanOrEqual(clientW);
    });
  }

test.describe('card view', () => {
  test('visitors get the card, Save contact and links, but no sharing tools', async ({ page }) => {
    await page.goto('/card/?met=BCG%20<b>Finals</b>');
    await expect(page.locator('[data-greeting]')).toHaveText('Great meeting you at BCG bFinalsb');
    await expect(page.locator('header nav[aria-label="View"] a[aria-current="page"]')).toHaveText('Card');
    await expect(page.locator('[data-share-open]')).toBeHidden();
    await expect(page.locator('[data-flip-toggle]')).toBeHidden();
    await expect(page.locator('.owner-chip')).toBeHidden();
    await page.locator('[data-flip]').click();
    await expect(page.locator('[data-flip]')).not.toHaveAttribute('data-flipped', '');
    const save = page.locator('a[href="/rodo-armas.vcf"]');
    await expect(save).toBeVisible();
    await expect(save).toHaveAttribute('download', /\.vcf$/);
    const res = await page.request.get('/rodo-armas.vcf');
    expect(res.ok()).toBe(true);
    expect(await res.text()).toContain('FN:Rodo Armas');
  });

  test('?me unlocks owner tools on this device only, and can be turned off', async ({ page }) => {
    await page.goto('/card/?me');
    await expect(page).toHaveURL(/\/card\/$/);
    await expect(page.locator('[data-share-open]')).toBeVisible();
    await expect(page.locator('[data-flip-toggle]')).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-share-open]')).toBeVisible();
    await page.locator('[data-owner-exit]').click();
    await expect(page.locator('[data-share-open]')).toBeHidden();
  });

  test('owner share sheet: event greeting preview, no visible URL, copy, WhatsApp, event QR', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/card/?me');
    await page.locator('[data-share-open]').click();
    const sheet = page.locator('[data-share-sheet]');
    await expect(sheet).toBeVisible();
    await expect(page.locator('[data-share-preview]')).toHaveText('Your card, without a greeting');
    await page.getByLabel('Where did you meet? (optional)').fill('BCG Finals');
    await expect(page.locator('[data-share-preview]')).toHaveText('Great meeting you at BCG Finals');
    await expect(sheet.getByText('rarmas.cl/card', { exact: false })).toHaveCount(0);
    await expect(page.locator('[data-share-whatsapp]')).toHaveAttribute(
      'href',
      /wa\.me\/\?text=.*BCG%20Finals.*rarmas\.cl%2Fcard%2F%3Fmet%3DBCG%2BFinals/,
    );
    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.locator('[data-share-status]')).toHaveText('Link copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'https://rarmas.cl/card/?met=BCG+Finals',
    );
    await page.locator('[data-share-qr]').click();
    await expect(sheet).toBeHidden();
    await expect(page.locator('[data-flip]')).toHaveAttribute('data-flipped', '');
    await expect(page.locator('.qr-url')).toHaveText('rarmas.cl/card · BCG Finals');
    await page.reload();
    await page.locator('[data-share-open]').click();
    await expect(page.getByLabel('Where did you meet? (optional)')).toHaveValue('BCG Finals');
  });

  test('?admin=key shows stats from the private function and offers QR downloads', async ({ page }) => {
    let tracked = 0;
    await page.route('**/rest/v1/card_events', (r) => {
      tracked++;
      return r.fulfill({ status: 201, body: '' });
    });
    await page.route('**/rest/v1/rpc/card_stats', async (r) => {
      const body = r.request().postDataJSON();
      if (body.admin_key !== 'test-key') return r.fulfill({ status: 401, body: '{}' });
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totals: { view: 12, save: 5, copy: 2, whatsapp: 1 },
          bySource: { qr: 7, link: 4, direct: 1 },
          byEvent: [{ event: '<b>BCG</b>', views: 9, saves: 4, shares: 3, last: '2026-10-01' }],
          byDay: [{ day: '2026-10-01', views: 12, saves: 5 }],
        }),
      });
    });
    await page.goto('/card/?admin=test-key');
    await expect(page).toHaveURL(/\/card\/$/);
    const panel = page.locator('[data-admin]');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.tile b').first()).toHaveText('12');
    await expect(panel.locator('.events td').first()).toHaveText('<b>BCG</b>'); // rendered as text, not HTML
    await page.locator('[data-share-open]').click();
    await page.getByLabel('Where did you meet? (optional)').fill('BCG Finals');
    const dl = page.waitForEvent('download');
    await page.locator('[data-qr-dl="svg"]').click();
    expect((await dl).suggestedFilename()).toBe('rarmas-card-qr-bcg-finals.svg');
    expect(tracked).toBe(0); // localhost never sends stats
  });

  test('a wrong admin key shows a clear message', async ({ page }) => {
    await page.route('**/rest/v1/rpc/card_stats', (r) => r.fulfill({ status: 401, body: '{}' }));
    await page.goto('/card/?admin=nope');
    await expect(page.locator('[data-admin] .admin-msg')).toContainText('not accepted');
  });

  test('has link-preview tags', async ({ page }) => {
    await page.goto('/card/');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://rarmas.cl/og/card.png',
    );
    expect((await page.request.get('/og/card.png')).ok()).toBe(true);
  });

  for (const path of ['/card/?met=BCG', '/card/?me'])
    test(`no serious accessibility violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(800);
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id),
      ).toEqual([]);
    });
});

test('email links open a chooser with mail app, Gmail, Outlook and copy', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/card/');
  await page.locator('.links a[href^="mailto:"]').click();
  const menu = page.locator('[data-email-menu]');
  await expect(menu).toBeVisible();
  await expect(menu.locator('[data-email-opt="gmail"]')).toHaveAttribute(
    'href',
    /mail\.google\.com.*rodoarmas%40gmail\.com/,
  );
  await expect(menu.locator('[data-email-opt="outlook"]')).toHaveAttribute(
    'href',
    /outlook\.live\.com.*rodoarmas%40gmail\.com/,
  );
  await menu.getByRole('button', { name: 'Copy address' }).click();
  await expect(menu.locator('[data-email-status]')).toHaveText('Address copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('rodoarmas@gmail.com');
});

test('structured data describes the person', async ({ page }) => {
  await page.goto('/');
  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
  expect(data['@type']).toBe('Person');
  expect(data.sameAs).toContain('https://www.instagram.com/rodo_armass/');
});

test('CV is downloadable', async ({ page }) => {
  const res = await page.request.get('/cv/Rodo-Armas-CV.pdf');
  expect(res.ok()).toBe(true);
  expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-');
});
