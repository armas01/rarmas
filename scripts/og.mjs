// Renders the 1200×630 link-preview images into public/og/. Run: npm run og
// Uses Playwright's Chromium (set PW_CHROMIUM to a custom executable if needed).
import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';

const load = (f) => readFile(new URL(`../src/content/${f}`, import.meta.url), 'utf8').then(JSON.parse);
const langs = [
  [
    '',
    await load('content.json'),
    {
      pro: 'Strategy & Planning · Uber Eats · AI agents',
      life: 'Photography · Robotics · Ski, tennis & adventure',
    },
  ],
  [
    '-es',
    await load('content.es.json'),
    {
      pro: 'Strategy & Planning · Uber Eats · Agentes de IA',
      life: 'Fotografía · Robótica · Ski, tenis y aventura',
    },
  ],
];
const font = await readFile(
  new URL(
    '../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',
    import.meta.url,
  ),
);
const logo = await readFile(new URL('../public/logo.png', import.meta.url));
const fontUrl = `data:font/woff2;base64,${font.toString('base64')}`;
const logoUrl = `data:image/png;base64,${logo.toString('base64')}`;

const views = langs.flatMap(([suffix, content, subs]) => {
  const prefix = suffix ? 'rarmas.cl/es' : 'rarmas.cl';
  return [
    { file: `pro${suffix}`, eyebrow: prefix, title: content.hero.headline, sub: subs.pro },
    { file: `life${suffix}`, eyebrow: `${prefix}/life`, title: content.lifeHero.headline, sub: subs.life },
    {
      file: `card${suffix}`,
      eyebrow: `${prefix}/card`,
      title: content.card.name,
      sub: `${content.card.role} · ${content.card.org}`,
    },
  ];
});

const html = (v) => `<!doctype html><html><head><style>
@font-face { font-family: M; src: url(${fontUrl}) format('woff2'); font-weight: 200 800; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; font-family: M; color: #f5f5f7; background: #0a0a0b; overflow: hidden; position: relative; }
.o { position: absolute; border-radius: 50%; }
.a { width: 900px; height: 900px; right: -300px; top: -380px; background: radial-gradient(closest-side, rgb(61 123 255 / .55), rgb(61 123 255 / .18) 45%, transparent); }
.b { width: 820px; height: 820px; left: -320px; bottom: -420px; background: radial-gradient(closest-side, rgb(139 92 246 / .5), rgb(139 92 246 / .15) 45%, transparent); }
.wrap { position: absolute; inset: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; }
.top { display: flex; align-items: center; gap: 16px; font-size: 26px; font-weight: 600; color: rgb(245 245 247 / .7); }
.top img { width: 52px; height: 52px; padding: 7px; border-radius: 14px; background: #fff; }
h1 { font-size: 112px; font-weight: 800; letter-spacing: -0.045em; line-height: .98; max-width: 980px; }
p { margin-top: 26px; font-size: 32px; font-weight: 600; background: linear-gradient(135deg, #3d7bff, #8b5cf6); -webkit-background-clip: text; color: transparent; }
</style></head><body><span class="o a"></span><span class="o b"></span>
<div class="wrap"><div class="top"><img src="${logoUrl}">Rodo Armas · ${v.eyebrow}</div>
<div><h1>${v.title}</h1><p>${v.sub}</p></div></div></body></html>`;

await mkdir(new URL('../public/og/', import.meta.url), { recursive: true });
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const v of views) {
  await page.setContent(html(v));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: new URL(`../public/og/${v.file}.png`, import.meta.url).pathname });
  console.log(`og/${v.file}.png`);
}
await browser.close();
