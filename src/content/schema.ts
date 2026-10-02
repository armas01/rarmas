import { z } from 'zod';
import en from './content.json';
import es from './content.es.json';

const Text = z.string().min(1);
const Link = z.object({ label: Text, href: Text });

const Meta = z.object({ title: Text, description: Text });
const Hero = z.object({ eyebrow: Text, headline: Text, lede: Text, primary: Link, secondary: Link });

export const ContentSchema = z.object({
  meta: Meta,
  lifeMeta: Meta,
  cardMeta: Meta,
  nav: z.object({
    // short: label used on phones, where the full labels don't fit
    views: z.array(Link.extend({ short: Text })).length(3),
    links: z.array(Link).min(1),
    lifeLinks: z.array(Link).min(1),
    cta: Link,
  }),
  hero: Hero,
  lifeHero: Hero,
  card: z.object({
    name: Text,
    role: Text,
    org: Text,
    tagline: Text,
    location: Text,
    // {event} is replaced with the sanitized ?met= query value
    greeting: Text.refine((v) => v.includes('{event}')),
    save: Text,
    share: Text,
    shareTitle: Text,
    eventLabel: Text,
    eventPlaceholder: Text,
    previewLabel: Text,
    more: Text,
    previewNone: Text,
    ownerNote: Text,
    ownerExit: Text,
    copy: Text,
    copied: Text,
    copyFailed: Text,
    whatsapp: Text,
    showEventQr: Text,
    close: Text,
    message: Text.refine((v) => v.includes('{event}')),
    messageNoEvent: Text,
    flip: Text,
    flipBack: Text,
    cv: Text,
    qrHint: Text,
  }),
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
  agents: z.object({
    eyebrow: Text,
    title: Text,
    body: Text,
    left: z.object({ title: Text, body: Text }),
    hub: z.object({ title: Text, body: Text }),
    sources: z.array(Text).min(3),
    points: z.array(z.object({ title: Text, body: Text })).length(3),
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
  // Galleries on the Personal page. Photo src: a path under public/ (e.g. "/photos/andes.jpg");
  // null renders a placeholder tile. The first photo of each gallery is shown large.
  galleries: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z][a-z0-9-]*$/),
        eyebrow: Text,
        title: Text,
        body: Text,
        cta: Link.nullable(),
        photos: z.array(z.object({ src: Text.nullable(), alt: Text, caption: z.string() })).min(1),
      }),
    )
    .min(1),
  ui: z.object({
    skip: Text,
    scrollNext: Text,
    menu: Text,
    photoSoon: Text,
    readOnLinkedIn: Text,
    postsSoon: Text,
    mainNav: Text,
    viewNav: Text,
    langSwitch: Text,
    langShort: Text,
    cardAria: Text,
    qrAria: Text,
    moreAboutMe: Text,
    proSite: Text,
    personalSite: Text,
    printQr: Text,
    linkToShare: Text,
    downloadCv: Text,
    emailMenu: z.object({
      title: Text,
      mailApp: Text,
      gmail: Text,
      outlook: Text,
      copy: Text,
      copied: Text,
      copyFailed: Text,
      close: Text,
    }),
  }),
  contact: z.object({ eyebrow: Text, headline: Text, cta: Link, footerNote: Text }),
});

export type Content = z.infer<typeof ContentSchema>;
export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];

const byLocale: Record<Locale, Content> = { en: ContentSchema.parse(en), es: ContentSchema.parse(es) };

/** Content for a locale (Astro.currentLocale); English is the default. */
export function getContent(locale?: string): Content {
  return locale === 'es' ? byLocale.es : byLocale.en;
}
export const content: Content = byLocale.en;

/** The same page in the other language: /life/ ⇄ /es/life/. */
export function otherLocalePath(pathname: string, locale?: string): string {
  if (locale === 'es') return pathname.replace(/^\/es(?=\/|$)/, '') || '/';
  return `/es${pathname === '/' ? '/' : pathname}`;
}
