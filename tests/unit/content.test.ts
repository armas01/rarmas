/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import raw from '../../src/content/content.json';
import { ContentSchema, content } from '../../src/content/schema';

describe('content', () => {
  it('placeholder content parses', () => {
    expect(content.hero.headline.length).toBeGreaterThan(0);
    expect(content.stats).toHaveLength(4);
    expect(content.life.interests).toHaveLength(3);
    expect(content.work.projects).toHaveLength(3);
    expect(content.bento.tiles).toHaveLength(6);
    expect(content.timeline.entries).toHaveLength(4);
  });
  it('rejects missing headline', () => {
    const broken = structuredClone(raw) as any;
    delete broken.hero.headline;
    expect(ContentSchema.safeParse(broken).success).toBe(false);
  });
  it('rejects non-numeric stat value', () => {
    const broken = structuredClone(raw) as any;
    broken.stats[0].value = 'twelve';
    expect(ContentSchema.safeParse(broken).success).toBe(false);
  });
  it('rejects unknown bento visual', () => {
    const broken = structuredClone(raw) as any;
    broken.bento.tiles[0].visual = 'sparkles';
    expect(ContentSchema.safeParse(broken).success).toBe(false);
  });
});

describe('locales', () => {
  it('Spanish content is complete and swaps paths', async () => {
    const { getContent, otherLocalePath } = await import('../../src/content/schema');
    const es = getContent('es');
    expect(es.hero.headline).not.toBe(getContent('en').hero.headline);
    expect(es.nav.views.map((v) => v.href)).toEqual(['/es/', '/es/life/', '/es/card/']);
    expect(otherLocalePath('/', 'en')).toBe('/es/');
    expect(otherLocalePath('/life/', 'en')).toBe('/es/life/');
    expect(otherLocalePath('/es/card/', 'es')).toBe('/card/');
    expect(otherLocalePath('/es/', 'es')).toBe('/');
  });
});
