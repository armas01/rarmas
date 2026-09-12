import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { z } from 'zod';

const generatedDir = new URL('../src/generated/', import.meta.url);
const outputPath = new URL('../src/generated/linkedin.json', import.meta.url);
const tempPath = new URL('../src/generated/linkedin.json.tmp', import.meta.url);
const fallbackPath = new URL('../src/data/linkedin.json', import.meta.url);

const linkedInPost = z.object({
  id: z.string(),
  commentary: z.string().optional().default(''),
  createdAt: z.number().optional(),
  lastModifiedAt: z.number().optional(),
});
const responseSchema = z.object({ elements: z.array(linkedInPost) });

const token = process.env.LINKEDIN_ACCESS_TOKEN;
const author = process.env.LINKEDIN_PERSON_URN;
const version = process.env.LINKEDIN_VERSION || '202608';
let records = JSON.parse(await readFile(fallbackPath, 'utf8'));

if (token && author) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const query = new URLSearchParams({ q: 'author', author, count: '10', sortBy: 'LAST_MODIFIED' });
    const response = await fetch(`https://api.linkedin.com/rest/posts?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'LinkedIn-Version': version,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`LinkedIn ${response.status}`);
    records = responseSchema.parse(await response.json()).elements
      .filter((post) => post.commentary.trim())
      .map((post) => ({
        id: post.id,
        canonicalUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(post.id)}/`,
        publishedAt: new Date(post.createdAt || post.lastModifiedAt || 0).toISOString(),
        text: post.commentary.trim(),
        topic: null,
        image: null,
        draft: false,
      }))
      .filter((post) => post.publishedAt !== '1970-01-01T00:00:00.000Z')
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .filter((post, index, all) => all.findIndex((item) => item.canonicalUrl === post.canonicalUrl) === index)
      .slice(0, 3);
  } catch (error) {
    console.warn(`LinkedIn sync kept the curated fallback: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
} else {
  console.warn('LinkedIn sync skipped: official API credentials are not configured.');
}

await mkdir(generatedDir, { recursive: true });
await writeFile(tempPath, `${JSON.stringify(records, null, 2)}\n`);
await rename(tempPath, outputPath);
