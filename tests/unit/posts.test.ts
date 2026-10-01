import { describe, it, expect } from 'vitest';
import { selectPosts } from '../../src/content/posts';

const ph = [1, 2, 3].map((i) => ({ date: `Jan ${i}, 2026`, title: `Lorem ${i}`, href: '#' }));
const post = (id: string, publishedAt: string, extra: object = {}) => ({
  id,
  canonicalUrl: `https://www.linkedin.com/feed/update/${id}`,
  publishedAt,
  text: `Post ${id}`,
  draft: false,
  ...extra,
});

describe('selectPosts', () => {
  it('uses placeholders when both sources empty', () => {
    expect(selectPosts([], [], ph).map((p) => p.title)).toEqual(['Lorem 1', 'Lorem 2', 'Lorem 3']);
  });
  it('prefers generated over fallback', () => {
    const r = selectPosts([post('g', '2026-01-01')], [post('f', '2026-02-01')], ph);
    expect(r.map((p) => p.title)).toEqual(['Post g']);
  });
  it('uses fallback when generated is not an array', () => {
    expect(selectPosts(undefined, [post('f', '2026-02-01')], ph)[0].title).toBe('Post f');
  });
  it('drops drafts and invalid records, sorts newest first, caps at 3', () => {
    const r = selectPosts(
      [
        post('a', '2026-01-01'),
        post('b', '2026-03-01'),
        post('c', '2026-02-01'),
        post('d', '2026-04-01', { draft: true }),
        { id: 'x' },
        post('e', '2025-12-01'),
      ],
      [],
      ph,
    );
    expect(r.map((p) => p.title)).toEqual(['Post b', 'Post c', 'Post a']);
  });
  it('external posts carry formatted date and href', () => {
    const [p] = selectPosts([post('a', '2026-01-15T00:00:00Z')], [], ph);
    expect(p.href).toBe('https://www.linkedin.com/feed/update/a');
    expect(p.date).toBe('Jan 15, 2026');
    expect(p.external).toBe(true);
  });
});
