import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const sections = ['about', 'story', 'work', 'skills', 'timeline', 'writing'];

test('nav links land each section below the navbar', async ({ page }) => {
  await page.goto('/');
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
      .poll(() => page.evaluate(() => document.querySelectorAll('.pin-spacer').length))
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

for (const [w, h] of [
  [390, 844],
  [360, 640],
  [1440, 900],
]) {
  test(`no horizontal overflow at ${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    const { scrollW, clientW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(scrollW).toBeLessThanOrEqual(clientW);
  });
}
