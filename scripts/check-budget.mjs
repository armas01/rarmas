import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const LIMIT = 60 * 1024;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (p.endsWith('.js')) yield p;
  }
}

let total = 0;
for await (const file of walk('dist')) total += gzipSync(await readFile(file)).length;
console.log(`client JS: ${(total / 1024).toFixed(1)} KB gzip (limit ${LIMIT / 1024} KB)`);
if (total > LIMIT) {
  console.error('JS budget exceeded');
  process.exit(1);
}
