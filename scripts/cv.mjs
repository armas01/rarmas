// Renders scripts/cv/cv.json to public/cv/Rodo-Armas-CV.pdf (A4, one page). Run: npm run cv
import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';

const cv = JSON.parse(await readFile(new URL('./cv/cv.json', import.meta.url), 'utf8'));
const font = await readFile(
  new URL(
    '../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',
    import.meta.url,
  ),
);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const item = (it) => `
  <div class="item">
    ${it.org ? `<div class="row"><b>${esc(it.org)}</b><span>${esc(it.place)}</span></div>` : ''}
    ${it.roles.map((r) => `<div class="row role"><i>${esc(r.role)}</i><span>${esc(r.date)}</span></div>`).join('')}
    <ul>${it.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
  </div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: M; src: url(data:font/woff2;base64,${font.toString('base64')}) format('woff2'); font-weight: 200 800; }
@page { size: A4; margin: 14mm 15mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: M; color: #111; font-size: 9.6pt; line-height: 1.38; }
header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 8pt; border-bottom: 2pt solid #111; }
h1 { font-size: 21pt; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }
.headline { margin-top: 4pt; font-weight: 600; color: #3d7bff; }
.contact { text-align: right; font-size: 8.6pt; color: #444; line-height: 1.5; }
h2 { margin: 11pt 0 5pt; font-size: 8.4pt; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #3d7bff; }
.item { margin-bottom: 7pt; }
.row { display: flex; justify-content: space-between; gap: 12pt; }
.row b { font-weight: 800; }
.row span { color: #555; white-space: nowrap; font-size: 8.8pt; }
.role i { font-style: normal; font-weight: 600; }
ul { margin-top: 3pt; padding-left: 11pt; }
li { margin-bottom: 1.8pt; }
li::marker { color: #8b5cf6; }
</style></head><body>
<header><div><h1>${esc(cv.name)}</h1><p class="headline">${esc(cv.headline)}</p></div>
<div class="contact">${cv.contact.map(esc).join('<br>')}</div></header>
${cv.sections.map((s) => `<h2>${esc(s.title)}</h2>${s.items.map(item).join('')}`).join('')}
</body></html>`;

await mkdir(new URL('../public/cv/', import.meta.url), { recursive: true });
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);
const page = await browser.newPage();
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
const out = new URL('../public/cv/Rodo-Armas-CV.pdf', import.meta.url).pathname;
await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
const pages = await page.evaluate(() => Math.ceil(document.body.scrollHeight / (297 * 3.78 - 28 * 3.78)));
console.log(`cv → public/cv/Rodo-Armas-CV.pdf (~${pages} page)`);
await browser.close();
