import { z } from 'zod';
import raw from './content.json';

const Text = z.string().min(1);
const Link = z.object({ label: Text, href: Text });

const Meta = z.object({ title: Text, description: Text });
const Hero = z.object({ eyebrow: Text, headline: Text, lede: Text, primary: Link, secondary: Link });

export const ContentSchema = z.object({
  meta: Meta,
  lifeMeta: Meta,
  nav: z.object({
    views: z.array(Link).length(2),
    links: z.array(Link).min(1),
    lifeLinks: z.array(Link).min(1),
    cta: Link,
  }),
  hero: Hero,
  lifeHero: Hero,
  stats: z.array(z.object({ value: z.number(), suffix: z.string(), label: Text })).length(4),
  about: z.object({
    eyebrow: Text,
    body: Text,
    // src: a path under public/ (e.g. "/me.jpg"); null renders a placeholder frame.
    portrait: z.object({ src: Text.nullable(), alt: Text }),
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
  }),
  timeline: z.object({
    eyebrow: Text,
    title: Text,
    entries: z.array(z.object({ date: Text, role: Text, org: Text, body: Text })).length(4),
  }),
  linkedin: z.object({ eyebrow: Text, title: Text, cta: Text }),
  life: z.object({
    eyebrow: Text,
    title: Text,
    interests: z.array(z.object({ title: Text, body: Text })).length(3),
  }),
  photography: z.object({
    eyebrow: Text,
    title: Text,
    body: Text,
    cta: Link,
    // src: a path under public/ (e.g. "/photos/andes.jpg"); null renders a placeholder tile.
    photos: z.array(z.object({ src: Text.nullable(), alt: Text, caption: z.string() })).min(1),
  }),
  contact: z.object({ eyebrow: Text, headline: Text, cta: Link, footerNote: Text }),
});

export type Content = z.infer<typeof ContentSchema>;
export const content: Content = ContentSchema.parse(raw);
