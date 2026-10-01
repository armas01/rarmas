/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import raw from '../../src/content/content.json';
import { ContentSchema, content } from '../../src/content/schema';

describe('content', () => {
  it('placeholder content parses', () => {
    expect(content.hero.headline.length).toBeGreaterThan(0);
    expect(content.stats).toHaveLength(4);
    expect(content.story.chapters).toHaveLength(4);
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
