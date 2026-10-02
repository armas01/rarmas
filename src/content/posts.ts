import { z } from 'zod';

export type PlaceholderPost = { date: string; title: string; href: string };
export type DisplayPost = PlaceholderPost & { external: boolean };

const Post = z.object({
  id: z.string(),
  canonicalUrl: z.url(),
  publishedAt: z.string().refine((v) => !Number.isNaN(Date.parse(v))),
  text: z.string().min(1),
  draft: z.boolean(),
});

function valid(source: unknown) {
  if (!Array.isArray(source)) return [];
  return source.flatMap((item) => {
    const r = Post.safeParse(item);
    return r.success && !r.data.draft ? [r.data] : [];
  });
}

export function selectPosts(
  generated: unknown,
  fallback: unknown,
  placeholders: PlaceholderPost[],
  locale = 'en',
): DisplayPost[] {
  const fmt = new Intl.DateTimeFormat(locale === 'es' ? 'es-CL' : 'en', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  });
  const g = valid(generated);
  const posts = g.length ? g : valid(fallback);
  if (!posts.length) return placeholders.map((p) => ({ ...p, external: false }));
  return posts
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 3)
    .map((p) => ({
      date: fmt.format(new Date(p.publishedAt)),
      title: p.text,
      href: p.canonicalUrl,
      external: true,
    }));
}
