import { z } from 'zod';
import raw from './content.json';

const Text = z.string().min(1);
const Link = z.object({ label: Text, href: Text });

export const ContentSchema = z.object({
  meta: z.object({ title: Text, description: Text }),
  nav: z.object({ links: z.array(Link).min(1), cta: Link }),
  hero: z.object({ eyebrow: Text, headline: Text, lede: Text, primary: Link, secondary: Link }),
  stats: z.array(z.object({ value: z.number(), suffix: z.string(), label: Text })).length(4),
  about: z.object({ eyebrow: Text, body: Text }),
  story: z.object({
    eyebrow: Text,
    chapters: z.array(z.object({ kicker: Text, title: Text, body: Text })).length(4),
  }),
  work: z.object({
    eyebrow: Text,
    title: Text,
    projects: z.array(z.object({ tag: Text, title: Text, summary: Text, href: Text, cta: Text })).length(3),
  }),
  bento: z.object({
    eyebrow: Text,
    title: Text,
    tiles: z
      .array(
        z.object({
          title: Text,
          body: Text,
          size: z.enum(['sm', 'md', 'lg']),
          visual: z.enum(['gradient', 'pulse', 'chart', 'orbit', 'grid', 'number']),
        }),
      )
      .length(6),
  }),
  skills: z.object({
    eyebrow: Text,
    title: Text,
    rows: z.tuple([z.array(Text).min(4), z.array(Text).min(4)]),
    interests: z.array(z.object({ title: Text, body: Text })).length(3),
  }),
  timeline: z.object({
    eyebrow: Text,
    title: Text,
    entries: z.array(z.object({ date: Text, role: Text, org: Text, body: Text })).length(4),
  }),
  writing: z.object({
    eyebrow: Text,
    title: Text,
    cta: Text,
    placeholders: z.array(z.object({ date: Text, title: Text, href: Text })).length(3),
  }),
  contact: z.object({ eyebrow: Text, headline: Text, cta: Link, footerNote: Text }),
});

export type Content = z.infer<typeof ContentSchema>;
export const content: Content = ContentSchema.parse(raw);
