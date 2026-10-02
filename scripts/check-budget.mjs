// Fails the build if any page loads more than 60 KB (gzip) of JavaScript up front.
// Per page: module scripts it references + their static imports (followed recursively)
// + inline scripts. Lazy chunks pulled in with import() only when needed don't count
// against the initial load; they are reported separately.
import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, posix } from 'node:path';

const LIMIT = 60 * 1024;
const DIST = 'dist';

async function* walk(dir, ext) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p, ext);
    else if (p.endsWith(ext)) yield p;
  }
}

const gz = (s) => gzipSync(s).length;
const cache = new Map();
async function graph(urlPath, seen, lazy) {
  if (seen.has(urlPath)) return;
  seen.add(urlPath);
  const src = await readFile(join(DIST, urlPath), 'utf8');
  cache.set(urlPath, gz(src));
  const base = posix.dirname(urlPath);
  for (const m of src.matchAll(/(?:\bfrom|\bimport)\s*["'`]([^"'`]+\.js)["'`]/g))
    await graph(posix.normalize(posix.join(base, m[1])), seen, lazy);
  for (const m of src.matchAll(/\bimport\(\s*["'`]([^"'`]+\.js)["'`]\s*\)/g))
    lazy.add(posix.normalize(posix.join(base, m[1])));
}

let failed = false;
const lazyAll = new Set();
for await (const html of walk(DIST, '.html')) {
  const doc = await readFile(html, 'utf8');
  const seen = new Set();
  let inline = 0;
  for (const m of doc.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const src = /\bsrc="([^"]+\.js)"/.exec(m[1]);
    if (src && src[1].startsWith('/')) await graph(src[1], seen, lazyAll);
    else if (m[2].trim()) inline += gz(m[2]);
  }
  const total = [...seen].reduce((n, p) => n + cache.get(p), 0) + inline;
  const page = '/' + posix.relative(DIST, html.split('\\').join('/')).replace(/index\.html$/, '');
  console.log(`${page.padEnd(16)} ${(total / 1024).toFixed(1)} KB gzip`);
  if (total > LIMIT) failed = true;
}
for (const p of lazyAll) {
  const size = gz(await readFile(join(DIST, p)));
  console.log(`  lazy ${p} ${(size / 1024).toFixed(1)} KB gzip (loaded on demand)`);
}
console.log(`limit ${LIMIT / 1024} KB per page`);
if (failed) {
  console.error('JS budget exceeded');
  process.exit(1);
}
