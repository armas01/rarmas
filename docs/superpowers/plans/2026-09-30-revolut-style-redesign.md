# rarmas.cl Revolut-style Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild rarmas.cl as a dark, Revolut-style single page with scroll-driven animation, componentized Astro markup, a tested motion registry and placeholder copy.

**Architecture:** Astro static page composed of section components that only declare `data-motion` attributes. One client entry boots Lenis + a registry that dispatches each attribute to an isolated motion module `(el, ctx) => cleanup`. All copy lives in `src/content/content.json`, validated by zod at build time.

**Tech Stack:** Astro 7.3.2, TypeScript 6.0.3, gsap 3.15.0 (ScrollTrigger, SplitText), lenis 1.3.26, zod 4.6.2, Vitest 5.0.3 + happy-dom 20.14.5, Playwright 1.63.0 + @axe-core/playwright 4.13.0, Prettier 3.9.9.

**Spec:** `docs/superpowers/specs/2026-09-30-revolut-style-redesign-design.md` — read it before starting any task.

## Global Constraints

- Node ≥ 22.12; static output; GitHub Pages; keep `public/CNAME`.
- No UI framework runtime. Client code = plain TS under `src/motion/` and `src/scripts/`.
- Section/layout components never import gsap or lenis; they use `data-motion="name [name2]"` and `data-motion-<opt>` attributes.
- Every visible string comes from `src/content/content.json` (lorem ipsum). Real URLs only for LinkedIn/GitHub (from `src/data/site.json`).
- Exact dependency versions only (no `^`, no `latest`).
- Hidden initial states only under `html.js-motion`. Reduced motion → no module runs.
- Total client JS in `dist/` ≤ 60 KB gzip.
- Do not edit `scripts/sync-*.mjs`, `src/data/linkedin.json`, `src/data/github.seed.json`, `src/data/site.json`, `tests/content.test.mjs`.
- Do NOT run `git commit`; the controller reviews and commits each task.
- Windows machine: use forward slashes in code; npm scripts must work in PowerShell and Git Bash.

## Review Focus

1. **Client script fails to load/throws at boot** → content must not stay hidden: an inline head watchdog removes `js-motion` if `motion-ready` isn't set within 2500 ms. (Task 1 inline script; Task 8 e2e "blocked JS" test.)
2. **Anchor link lands under the fixed navbar** → section heading must be visible below the navbar after nav click (Lenis `scrollTo` with offset, `scroll-margin-top` fallback). (Task 5 + Task 8 e2e.)
3. **Mobile menu open, then viewport widened to desktop** → menu closes and body scroll unlocks. (Task 5 navbar.ts + Task 8 e2e.)
4. **Resize / late font load after pins are created** → ScrollTrigger.refresh after `document.fonts.ready` and debounced resize, so pinned sections don't overlap. (Task 2 index.ts unit test for refresh wiring.)
5. **Empty or partially-invalid LinkedIn data** → Writing shows placeholders; drafts excluded; max 3, newest first. (Task 1 `selectPosts` unit test.)

---

## File map

| Path | Responsibility | Task |
|---|---|---|
| `package.json`, `vitest.config.ts`, `.prettierrc`, `eslint.config.js` | tooling, pinned deps, scripts | 1 |
| `src/styles/tokens.css`, `base.css`, `utilities.css` | design tokens, reset, motion initial states | 1 |
| `src/layouts/BaseLayout.astro` | html shell, head inline js-motion + watchdog, loads `src/motion/index.ts` | 1 |
| `src/content/schema.ts`, `content.json`, `posts.ts` | typed placeholder content, post selection | 1 |
| `src/motion/types.ts`, `prefers.ts`, `registry.ts`, `lenis.ts`, `index.ts` | motion core | 2 |
| `src/motion/modules/{reveal-words,reveal-up,scrub-words,counter,cursor-glow,hero-scale,magnetic,tilt}.ts` | motion modules A | 3 |
| `src/motion/modules/{pin-story,stack-cards,draw-line,marquee}.ts` | motion modules B | 4 |
| `src/components/layout/*`, `src/components/ui/*`, `src/scripts/navbar.ts` | navbar, footer, section shell, primitives | 5 |
| `src/components/sections/{Hero,Stats,About,Story,Work}.astro` | sections 1–5 | 6 |
| `src/components/sections/{Bento,Skills,Timeline,Writing,Contact}.astro`, `src/pages/index.astro`, `404.astro` | sections 6–10 + page composition | 7 |
| `playwright.config.ts`, `tests/e2e/*`, `scripts/check-budget.mjs`, `.github/workflows/deploy.yml`, `README.md`, `CONTENT_TODO.md` | e2e, budget, CI, docs | 8 |

Removed in Task 1: `src/styles/global.css`, `hero-motion.css`, `mobile-menu.css`, `branding.css`, `src/assets/hero-santiago.png`. (`index.astro` is temporarily replaced by a minimal page in Task 1 so the build stays green.)

---

### Task 1: Foundation — tooling, tokens, layout, content

**Files:**
- Modify: `package.json`, `src/layouts/BaseLayout.astro`, `src/pages/index.astro` (temporary minimal), `src/pages/404.astro`, `.gitignore`
- Create: `vitest.config.ts`, `.prettierrc`, `.prettierignore`, `eslint.config.js`, `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/utilities.css`, `src/content/schema.ts`, `src/content/content.json`, `src/content/posts.ts`
- Delete: files listed above
- Test: `tests/unit/content.test.ts`, `tests/unit/posts.test.ts`

**Interfaces:**
- Produces: `import { content } from '../content/schema'` → typed `Content`; `selectPosts(generated: unknown, fallback: unknown, placeholders: PlaceholderPost[]): DisplayPost[]`; CSS custom properties listed in spec; `BaseLayout` props `{ title?: string; description?: string }`; classes `js-motion` / `motion-ready` on `<html>`.

- [ ] **Step 1: Dependencies.** Set `package.json`:

```json
{
  "name": "rodo-armas-personal-site",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev --host 127.0.0.1",
    "sync:github": "node scripts/sync-github.mjs",
    "sync:linkedin": "node scripts/sync-linkedin.mjs",
    "sync": "npm run sync:github && npm run sync:linkedin",
    "check": "astro check",
    "test": "node --test tests/*.test.mjs && vitest run",
    "test:e2e": "playwright test",
    "build": "astro build",
    "budget": "node scripts/check-budget.mjs",
    "preview": "astro preview --host 127.0.0.1",
    "format": "prettier --write .",
    "lint": "eslint ."
  },
  "dependencies": {
    "astro": "7.3.2",
    "@astrojs/sitemap": "3.7.4",
    "@fontsource-variable/manrope": "5.3.0",
    "gsap": "3.15.0",
    "lenis": "1.3.26",
    "zod": "4.6.2"
  },
  "devDependencies": {
    "@astrojs/check": "0.9.10",
    "typescript": "6.0.3",
    "vitest": "5.0.3",
    "happy-dom": "20.14.5",
    "prettier": "3.9.9",
    "prettier-plugin-astro": "1.1.0"
  }
}
```

Then `npm install`. Then try `npm install -D -E eslint@10.11.0 typescript-eslint@8.71.0 eslint-plugin-astro@3.2.1`. If it errors on peer deps, skip ESLint (remove the `lint` script, don't create `eslint.config.js`) and report it. Playwright deps are added in Task 8.

- [ ] **Step 2: Tool configs.**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'happy-dom', include: ['tests/unit/**/*.test.ts'] } });
```
`.prettierrc`: `{ "singleQuote": true, "printWidth": 110, "plugins": ["prettier-plugin-astro"] }`. `.prettierignore`: `dist`, `node_modules`, `.astro`, `package-lock.json`, `src/generated`. `eslint.config.js` (if installed): flat config using `typescript-eslint` recommended + `eslint-plugin-astro` recommended, ignoring `dist`, `.astro`, `node_modules`. Add `test-results/`, `playwright-report/` to `.gitignore`.

- [ ] **Step 3: Write failing content tests** `tests/unit/content.test.ts`:

```ts
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
```

- [ ] **Step 4: Run** `npx vitest run tests/unit/content.test.ts` → FAIL (module not found).

- [ ] **Step 5: Implement `src/content/schema.ts`:**

```ts
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
```

Create `src/content/content.json` that satisfies it with lorem ipsum. Requirements: hero.headline ≤ 6 words ("Lorem ipsum dolor sit amet."); nav.links = About `#about`, Story `#story`, Work `#work`, Skills `#skills`, Timeline `#timeline`, Writing `#writing`; nav.cta = "Let's talk" `#contact`; hero.primary → `#work`, hero.secondary → `#about`; stats e.g. `{value:12,suffix:"+",label:"Lorem ipsum"}`, `{value:3,suffix:"",...}`, `{value:98,suffix:"%",...}`, `{value:40,suffix:"k",...}`; about.body ~60 words; project/post hrefs `#`; contact.cta href `#top` (Contact section overrides with LinkedIn URL from `src/data/site.json`); skills rows ≥ 6 short words each.

- [ ] **Step 6: Run content tests** → PASS.

- [ ] **Step 7: Failing posts tests** `tests/unit/posts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { selectPosts } from '../../src/content/posts';

const ph = [1, 2, 3].map((i) => ({ date: `Jan ${i}, 2026`, title: `Lorem ${i}`, href: '#' }));
const post = (id: string, publishedAt: string, extra: object = {}) => ({
  id, canonicalUrl: `https://www.linkedin.com/feed/update/${id}`, publishedAt, text: `Post ${id}`, draft: false, ...extra,
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
      [post('a', '2026-01-01'), post('b', '2026-03-01'), post('c', '2026-02-01'), post('d', '2026-04-01', { draft: true }), { id: 'x' }, post('e', '2025-12-01')],
      [], ph);
    expect(r.map((p) => p.title)).toEqual(['Post b', 'Post c', 'Post a']);
  });
  it('external posts carry formatted date and href', () => {
    const [p] = selectPosts([post('a', '2026-01-15T00:00:00Z')], [], ph);
    expect(p.href).toBe('https://www.linkedin.com/feed/update/a');
    expect(p.date).toBe('Jan 15, 2026');
    expect(p.external).toBe(true);
  });
});
```

- [ ] **Step 8: Run** → FAIL. **Implement `src/content/posts.ts`:**

```ts
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
const fmt = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });

function valid(source: unknown) {
  if (!Array.isArray(source)) return [];
  return source.flatMap((item) => {
    const r = Post.safeParse(item);
    return r.success && !r.data.draft ? [r.data] : [];
  });
}

export function selectPosts(generated: unknown, fallback: unknown, placeholders: PlaceholderPost[]): DisplayPost[] {
  const g = valid(generated);
  const posts = g.length ? g : valid(fallback);
  if (!posts.length) return placeholders.map((p) => ({ ...p, external: false }));
  return posts
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 3)
    .map((p) => ({ date: fmt.format(new Date(p.publishedAt)), title: p.text, href: p.canonicalUrl, external: true }));
}
```

Run → PASS.

- [ ] **Step 9: Styles.** `tokens.css`: all tokens from the spec's "Visual system" as custom properties on `:root`, plus `[data-theme="light"]` remap (`--bg: var(--light-bg); --text: var(--light-text); --muted: rgb(10 10 11 / .62); --surface: #fff; --surface-2: #EAEAE6; --line: rgb(0 0 0 / .08)`), plus `--ease-out: cubic-bezier(.16,1,.3,1)`, `--dur-1:.4s; --dur-2:.8s; --dur-3:1.2s`, `--nav-h: 72px`. `base.css`: modern reset, `html{scroll-behavior:auto}` (Lenis handles smooth), `body{background:var(--bg);color:var(--text);font-family:'Manrope Variable',system-ui,sans-serif}`, `section[id]{scroll-margin-top:calc(var(--nav-h) + 16px)}`, `:focus-visible` ring, `.skip-link`, `.visually-hidden`, `@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}`. `utilities.css`: `.shell` (max-width 1240px, padding-inline clamp(20px,4vw,48px)), `.eyebrow`, `.display`, `.h2`, `.gradient-text` (accent gradient with background-clip:text), and motion initial states:

```css
html.js-motion [data-motion~='reveal-up']:not([data-motion-state='done']) { opacity: 0; transform: translateY(28px); }
html.js-motion [data-motion~='reveal-words']:not([data-motion-state='done']) { opacity: 0; }
html.js-motion [data-motion~='reveal-up'][data-motion-stagger]:not([data-motion-state='done']) { opacity: 1; transform: none; }
html.js-motion [data-motion~='reveal-up'][data-motion-stagger]:not([data-motion-state='done']) > * { opacity: 0; transform: translateY(28px); }
```
(Staggered containers hide their children instead of themselves. `reveal-words` modules set the element visible right after splitting.)

- [ ] **Step 10: BaseLayout.** Replace `src/layouts/BaseLayout.astro`:

```astro
---
import '@fontsource-variable/manrope';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/utilities.css';
import { content } from '../content/schema';
interface Props { title?: string; description?: string }
const { title = content.meta.title, description = content.meta.description } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <meta name="theme-color" content="#0A0A0B" />
    <link rel="canonical" href={new URL(Astro.url.pathname, 'https://rarmas.cl')} />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <title>{title}</title>
    <script is:inline>
      (function () {
        var d = document.documentElement;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        d.classList.add('js-motion');
        setTimeout(function () { if (!d.classList.contains('motion-ready')) d.classList.remove('js-motion'); }, 2500);
      })();
    </script>
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <slot />
    <script>import '../motion/index';</script>
  </body>
</html>
```

Because `src/motion/index.ts` arrives in Task 2, create a temporary stub `src/motion/index.ts` with `document.documentElement.classList.add('motion-ready');` (Task 2 overwrites it).

- [ ] **Step 11: Temporary page + cleanup.** Replace `src/pages/index.astro` with a minimal page: `<BaseLayout><main id="main"><h1 class="display">{content.hero.headline}</h1></main></BaseLayout>`. Update `404.astro` to use new classes (`.shell`, `.display`, a link back home styled inline in a `<style>` block) and keep copy "404" / "Lorem ipsum." / "Back home". Delete the old CSS files and `src/assets/hero-santiago.png`. Keep `public/logo.png`, `src/assets/ra-logo.png`.

- [ ] **Step 12: Verify.** `npm run check` (0 errors), `npm test` (all pass), `npm run build` (succeeds), `npx prettier --check src tests` (fix with `--write`).

---

### Task 2: Motion core — types, prefers, registry, lenis, entry

**Files:**
- Create: `src/motion/types.ts`, `src/motion/prefers.ts`, `src/motion/registry.ts`, `src/motion/lenis.ts`, `src/motion/modules/index.ts` (empty map for now)
- Overwrite: `src/motion/index.ts`
- Test: `tests/unit/registry.test.ts`, `tests/unit/entry.test.ts`

**Interfaces:**
- Produces:

```ts
// src/motion/types.ts
import type { gsap as Gsap } from 'gsap';
import type { ScrollTrigger as ST } from 'gsap/ScrollTrigger';
import type { SplitText as Split } from 'gsap/SplitText';
export type Cleanup = () => void;
export interface MotionContext {
  gsap: typeof Gsap;
  ScrollTrigger: typeof ST;
  SplitText: typeof Split;
  finePointer: boolean;
  /** data-motion-* attributes of the element, camelCased without the prefix (e.g. data-motion-delay → delay) */
  options: Record<string, string>;
}
export type MotionModule = (el: HTMLElement, ctx: MotionContext) => Cleanup | void;
```

```ts
// src/motion/registry.ts
export function revealFinal(el: HTMLElement): void; // sets data-motion-state="done", clears inline opacity/transform/visibility
export function readOptions(el: HTMLElement): Record<string, string>;
export interface RegistryOptions {
  modules: Record<string, MotionModule>;
  deps: Omit<MotionContext, 'options'>;
  reduced: boolean;
  root?: ParentNode;            // default document
  onError?: (name: string, error: unknown, el: HTMLElement) => void;
}
export function createRegistry(opts: RegistryOptions): { start(): void; destroy(): void };
```

```ts
// src/motion/prefers.ts
export const reducedMotion: () => boolean; // matchMedia('(prefers-reduced-motion: reduce)')
export const finePointer: () => boolean;   // matchMedia('(hover: hover) and (pointer: fine)')
// src/motion/lenis.ts
export function startLenis(gsap, ScrollTrigger): { lenis: Lenis; stop(): void };
export function scrollToTarget(target: string | HTMLElement, offset?: number): void; // uses lenis if running, else element.scrollIntoView
// src/motion/index.ts exports boot(env) for testing
export interface BootEnv { reduced: boolean; fontsReady: Promise<unknown>; win: Window; }
export function boot(env: BootEnv): { destroy(): void };
```

- [ ] **Step 1: Failing registry tests** `tests/unit/registry.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRegistry, readOptions, revealFinal } from '../../src/motion/registry';

const deps = { gsap: {} as any, ScrollTrigger: {} as any, SplitText: {} as any, finePointer: true };
beforeEach(() => { document.body.innerHTML = ''; });

describe('registry', () => {
  it('runs each named module once per element, with options', () => {
    document.body.innerHTML = '<div data-motion="a b" data-motion-delay="0.2"></div><div data-motion="a"></div>';
    const a = vi.fn(); const b = vi.fn();
    createRegistry({ modules: { a, b }, deps, reduced: false }).start();
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a.mock.calls[0][1].options).toEqual({ delay: '0.2' });
  });
  it('calls cleanups on destroy', () => {
    document.body.innerHTML = '<div data-motion="a"></div>';
    const cleanup = vi.fn();
    const r = createRegistry({ modules: { a: () => cleanup }, deps, reduced: false });
    r.start(); r.destroy();
    expect(cleanup).toHaveBeenCalledOnce();
  });
  it('isolates a throwing module and reveals its element', () => {
    document.body.innerHTML = '<div id="x" data-motion="boom ok"></div>';
    const ok = vi.fn(); const onError = vi.fn();
    createRegistry({ modules: { boom: () => { throw new Error('x'); }, ok }, deps, reduced: false, onError }).start();
    expect(onError).toHaveBeenCalledWith('boom', expect.any(Error), expect.any(HTMLElement));
    expect(ok).toHaveBeenCalled();
    expect(document.getElementById('x')!.dataset.motionState).toBe('done');
  });
  it('does not run modules when reduced, and marks elements done', () => {
    document.body.innerHTML = '<div id="x" data-motion="a"></div>';
    const a = vi.fn();
    createRegistry({ modules: { a }, deps, reduced: true }).start();
    expect(a).not.toHaveBeenCalled();
    expect(document.getElementById('x')!.dataset.motionState).toBe('done');
  });
  it('ignores unknown module names but reveals element', () => {
    document.body.innerHTML = '<div id="x" data-motion="nope"></div>';
    const onError = vi.fn();
    createRegistry({ modules: {}, deps, reduced: false, onError }).start();
    expect(document.getElementById('x')!.dataset.motionState).toBe('done');
  });
  it('start is idempotent', () => {
    document.body.innerHTML = '<div data-motion="a"></div>';
    const a = vi.fn();
    const r = createRegistry({ modules: { a }, deps, reduced: false });
    r.start(); r.start();
    expect(a).toHaveBeenCalledOnce();
  });
  it('readOptions camelCases data-motion-* except data-motion itself', () => {
    const el = document.createElement('div');
    el.setAttribute('data-motion', 'a'); el.setAttribute('data-motion-stagger-each', '0.1');
    el.setAttribute('data-motion-state', 'x');
    expect(readOptions(el)).toEqual({ staggerEach: '0.1' });
  });
  it('revealFinal clears inline styles', () => {
    const el = document.createElement('div'); el.style.opacity = '0'; el.style.transform = 'translateY(5px)';
    revealFinal(el);
    expect(el.style.opacity).toBe(''); expect(el.style.transform).toBe('');
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `types.ts`, `prefers.ts`, `registry.ts` to pass (registry splits `data-motion` on whitespace; `data-motion-state` is excluded from options; unknown names call `onError?.(name, new Error('unknown motion module'), el)` and `revealFinal(el)`; reduced → `revealFinal` on every `[data-motion]`). Run → PASS.

- [ ] **Step 4: Failing entry test** `tests/unit/entry.test.ts` — mock gsap/lenis and assert boot wiring:

```ts
import { describe, it, expect, vi } from 'vitest';
const refresh = vi.fn();
vi.mock('gsap', () => ({ gsap: { registerPlugin: vi.fn(), ticker: { add: vi.fn(), remove: vi.fn(), lagSmoothing: vi.fn() } } }));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { refresh, update: vi.fn(), getAll: () => [] } }));
vi.mock('gsap/SplitText', () => ({ SplitText: {} }));
vi.mock('lenis', () => ({ default: class { on() {} raf() {} destroy() {} scrollTo() {} } }));
vi.mock('../../src/motion/modules/index', () => ({ modules: {} }));

describe('boot', () => {
  it('adds motion-ready and refreshes ScrollTrigger after fonts load and on resize', async () => {
    vi.useFakeTimers();
    const { boot } = await import('../../src/motion/index');
    let resolveFonts!: () => void;
    const fontsReady = new Promise<void>((r) => (resolveFonts = r));
    boot({ reduced: false, fontsReady, win: window });
    expect(document.documentElement.classList.contains('motion-ready')).toBe(true);
    resolveFonts(); await fontsReady; await Promise.resolve();
    expect(refresh).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('resize')); window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(250);
    expect(refresh).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
  it('reduced: no lenis, still motion-ready', async () => {
    const { boot } = await import('../../src/motion/index');
    const r = boot({ reduced: true, fontsReady: Promise.resolve(), win: window });
    expect(document.documentElement.classList.contains('motion-ready')).toBe(true);
    r.destroy();
  });
});
```

- [ ] **Step 5: Implement** `lenis.ts` (Lenis `{ lerp: 0.1, smoothWheel: true }`; `lenis.on('scroll', ScrollTrigger.update)`; `gsap.ticker.add(t => lenis.raf(t*1000))`; `gsap.ticker.lagSmoothing(0)`; module-level `current` so `scrollToTarget` can use `current.scrollTo(target, { offset: -(navH + 16) })` where navH is read from `--nav-h`; fallback `el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })`). `modules/index.ts`: `export const modules: Record<string, MotionModule> = {};`. `index.ts`:

```ts
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { createRegistry } from './registry';
import { startLenis } from './lenis';
import { modules } from './modules/index';
import { reducedMotion, finePointer } from './prefers';

export interface BootEnv { reduced: boolean; fontsReady: Promise<unknown>; win: Window }

export function boot(env: BootEnv) {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const lenis = env.reduced ? null : startLenis(gsap, ScrollTrigger);
  const registry = createRegistry({
    modules,
    deps: { gsap, ScrollTrigger, SplitText, finePointer: finePointer() },
    reduced: env.reduced,
    onError: (name, error) => { if (import.meta.env.DEV) console.error(`[motion:${name}]`, error); },
  });
  registry.start();
  document.documentElement.classList.add('motion-ready');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onResize = () => { clearTimeout(timer); timer = setTimeout(() => ScrollTrigger.refresh(), 200); };
  env.fontsReady.then(() => ScrollTrigger.refresh());
  env.win.addEventListener('resize', onResize);
  return { destroy() { env.win.removeEventListener('resize', onResize); registry.destroy(); lenis?.stop(); } };
}

if (typeof window !== 'undefined' && !import.meta.env.VITEST) {
  boot({ reduced: reducedMotion(), fontsReady: document.fonts?.ready ?? Promise.resolve(), win: window });
}
```

Note `finePointer()` must guard `typeof matchMedia === 'function'`. Run all unit tests → PASS. `npm run check` and `npm run build` pass.

---

### Task 3: Motion modules A (simple reveals + pointer effects)

**Files:** Create `src/motion/modules/{reveal-words,reveal-up,scrub-words,counter,cursor-glow,hero-scale,magnetic,tilt}.ts`; Modify `src/motion/modules/index.ts` (register each by its file name); Test `tests/unit/modules-a.test.ts`.

**Interfaces:** Consumes `MotionModule`, `MotionContext` from `src/motion/types.ts`. Produces module names exactly: `reveal-words`, `reveal-up`, `scrub-words`, `counter`, `cursor-glow`, `hero-scale`, `magnetic`, `tilt`.

Behaviour (all must return a cleanup that kills every tween/ScrollTrigger/SplitText they created and removes every listener; never touch elements outside `el`; end by setting `el.dataset.motionState = 'done'` when their entrance completes or immediately for continuous effects):

- `reveal-words`: `el.setAttribute('aria-label', el.textContent.trim())`; `SplitText.create(el, { type: 'words', mask: 'words', wordsClass: 'word' })`; mark words `aria-hidden="true"`; set `el` opacity 1; `gsap.from(words, { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.04, delay: Number(options.delay ?? 0), scrollTrigger: options.trigger === 'load' ? undefined : { trigger: el, start: 'top 85%', once: true } })`. Cleanup: tween.kill(), split.revert().
- `reveal-up`: if `options.stagger` present, animate `el.children`, else `el`. `gsap.to(targets, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: Number(options.stagger ?? 0), delay: Number(options.delay ?? 0), scrollTrigger: { trigger: el, start: 'top 88%', once: true }, onComplete: () => (el.dataset.motionState = 'done') })` — from the CSS initial state (`opacity:0; y:28`); use `gsap.set(targets,{opacity:0,y:28})` first so it doesn't depend on CSS.
- `scrub-words`: SplitText words; `gsap.fromTo(words, { opacity: 0.18 }, { opacity: 1, stagger: 0.05, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } })`. aria-label as reveal-words.
- `counter`: element has `data-motion-to="98"` (`options.to`) and optional `options.suffix`; text is the final value in HTML (no-JS correct). On enter (ScrollTrigger once, start 'top 90%'), tween an object `{v:0}` to `to` over 1.6s `power3.out`, writing `Math.round(v) + suffix` to `el.textContent`. Keep `aria-label` = final text so SRs don't read intermediate numbers.
- `cursor-glow`: only if `ctx.finePointer`; finds `el.querySelector('[data-glow]')`; on `pointermove` on `el`, `gsap.quickTo(glow,'x',{duration:.8,ease:'power3'})`/`'y'` to pointer pos relative to el (centered). Cleanup removes listener.
- `hero-scale`: ScrollTrigger `{ trigger: el, start: 'top top', end: 'bottom top', scrub: true }` animating `el.querySelector('[data-hero-frame]')` to `{ scale: .92, borderRadius: 28, filter: 'brightness(.6)' }`.
- `magnetic`: only if `finePointer`; on pointermove within el, quickTo x/y = (pointer - center) * Number(options.strength ?? 0.3); on pointerleave return to 0 with `elastic.out(1,0.4)`.
- `tilt`: only if `finePointer`; on pointermove set `rotateX`/`rotateY` (max 6°, `transformPerspective: 900`) via quickTo; reset on leave.

- [ ] **Step 1: Failing tests** `tests/unit/modules-a.test.ts`. Use a fake ctx where gsap functions return objects with `kill` spies, and SplitText.create returns `{ words: [span,span], revert: spy }`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { modules } from '../../src/motion/modules/index';

function makeCtx(finePointer = true) {
  const kills: any[] = [];
  const tween = () => { const t = { kill: vi.fn(), scrollTrigger: { kill: vi.fn() } }; kills.push(t); return t; };
  const quick = () => Object.assign(vi.fn(), { tween: { kill: vi.fn() } });
  const split = { words: [document.createElement('span'), document.createElement('span')], revert: vi.fn() };
  const ctx: any = {
    gsap: { to: vi.fn(tween), from: vi.fn(tween), fromTo: vi.fn(tween), set: vi.fn(), quickTo: vi.fn(quick), killTweensOf: vi.fn() },
    ScrollTrigger: { create: vi.fn(() => ({ kill: vi.fn() })) },
    SplitText: { create: vi.fn(() => split) },
    finePointer, options: {},
  };
  return { ctx, kills, split };
}
beforeEach(() => { document.body.innerHTML = ''; });

const names = ['reveal-words', 'reveal-up', 'scrub-words', 'counter', 'cursor-glow', 'hero-scale', 'magnetic', 'tilt'];

describe('modules A', () => {
  it('registers all names', () => { for (const n of names) expect(typeof modules[n]).toBe('function'); });

  it.each(names)('%s returns a cleanup that kills its tweens', (name) => {
    document.body.innerHTML = '<div id="el" data-motion-to="10">Lorem ipsum dolor<span data-glow></span><span data-hero-frame></span></div>';
    const el = document.getElementById('el')!;
    const { ctx, kills, split } = makeCtx();
    ctx.options = { to: '10' };
    const cleanup = modules[name](el, ctx);
    expect(typeof cleanup).toBe('function');
    (cleanup as () => void)();
    for (const t of kills) expect(t.kill).toHaveBeenCalled();
    if (name.includes('words')) expect(split.revert).toHaveBeenCalled();
  });

  it.each(['magnetic', 'tilt', 'cursor-glow'])('%s removes pointer listeners on cleanup', (name) => {
    document.body.innerHTML = '<div id="el"><span data-glow></span></div>';
    const el = document.getElementById('el')!;
    const remove = vi.spyOn(el, 'removeEventListener');
    const { ctx } = makeCtx();
    (modules[name](el, ctx) as () => void)();
    expect(remove).toHaveBeenCalledWith('pointermove', expect.any(Function));
  });

  it.each(['magnetic', 'tilt', 'cursor-glow'])('%s is a no-op without a fine pointer', (name) => {
    document.body.innerHTML = '<div id="el"><span data-glow></span></div>';
    const el = document.getElementById('el')!;
    const add = vi.spyOn(el, 'addEventListener');
    const { ctx } = makeCtx(false);
    modules[name](el, ctx);
    expect(add).not.toHaveBeenCalled();
  });

  it('reveal-words keeps accessible text', () => {
    document.body.innerHTML = '<h1 id="el">Lorem ipsum dolor</h1>';
    const el = document.getElementById('el')!;
    modules['reveal-words'](el, makeCtx().ctx);
    expect(el.getAttribute('aria-label')).toBe('Lorem ipsum dolor');
  });

  it('counter keeps final value as aria-label', () => {
    document.body.innerHTML = '<span id="el">98%</span>';
    const el = document.getElementById('el')!;
    const { ctx } = makeCtx(); ctx.options = { to: '98', suffix: '%' };
    modules['counter'](el, ctx);
    expect(el.getAttribute('aria-label')).toBe('98%');
  });
});
```

(If a module creates its ScrollTrigger via `ScrollTrigger.create`, its cleanup must kill that too; the test's `kills` only tracks tweens, so also assert in your own code paths.)

- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement the 8 modules + register them. **Step 4:** `npx vitest run` → PASS; `npm run check` → 0 errors.

---

### Task 4: Motion modules B (pinning + scroll structures)

**Files:** Create `src/motion/modules/{pin-story,stack-cards,draw-line,marquee}.ts`; Modify `src/motion/modules/index.ts`; Test `tests/unit/modules-b.test.ts`.

**Interfaces:** Consumes `MotionModule`, `MotionContext`. Required DOM contracts (Tasks 6/7 build markup to these):
- `pin-story` on the section's inner stage: children `[data-chapter]` (4, stacked absolutely in CSS when `html.js-motion`), `[data-shape]` (abstract visual; each chapter index sets `data-active-index` on el), `[data-dot]` (4 dots). Behaviour: `ScrollTrigger.create({ trigger: el, start: 'top top', end: '+=300%', pin: true, scrub: true, onUpdate: self => setIndex(Math.min(3, Math.floor(self.progress * 4))) })`; `setIndex(i)` sets `el.dataset.activeIndex = String(i)`, toggles `aria-current="step"` on dots and `data-active` on chapters (CSS cross-fades by `[data-active]`). Without JS/reduced, CSS shows chapters stacked normally (no absolute positioning).
- `stack-cards` on the list: children `[data-card]`. For each card except the last: `gsap.to(card, { scale: 0.9, filter: 'brightness(.55)', ease: 'none', scrollTrigger: { trigger: nextCard, start: 'top bottom', end: 'top top+=' + (navH + 24), scrub: true } })`. Cards are `position: sticky; top: calc(var(--nav-h) + 24px)` in CSS (that's the pin — no ScrollTrigger pin, robust and cheap).
- `draw-line` on the timeline: child `[data-line-fill]` (scaleY 0→1, transform-origin top, scrubbed `top 70%`→`bottom 70%`) and `[data-entry]` children; each entry gets `data-active` when line passes it (`ScrollTrigger.create({ trigger: entry, start: 'top 70%', onToggle: s => entry.toggleAttribute('data-active', s.isActive || s.progress > 0) })` — simpler: `onEnter` sets, `onLeaveBack` removes).
- `marquee` on a row: child `[data-track]` containing the items duplicated twice (markup duplicates, second copy `aria-hidden`). Tween `xPercent: -50` over `Number(options.duration ?? 30)`s, `repeat:-1, ease:'none'`; `options.direction === 'reverse'` → from -50 to 0. Scroll velocity: `ScrollTrigger.create({ onUpdate: s => gsap.to(tween, { timeScale: 1 + Math.min(Math.abs(s.getVelocity()) / 400, 3), duration: .2, overwrite: true }) })` and ease back to 1. `pointerenter` → timeScale 0, `pointerleave` → 1.

- [ ] **Step 1: Failing tests** `tests/unit/modules-b.test.ts` (same `makeCtx` helper as Task 3 — copy it into this file; extend `ScrollTrigger.create` mock to capture configs):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { modules } from '../../src/motion/modules/index';

function makeCtx() {
  const created: any[] = []; const tweens: any[] = [];
  const tween = () => { const t = { kill: vi.fn(), timeScale: vi.fn(), scrollTrigger: { kill: vi.fn() } }; tweens.push(t); return t; };
  const ctx: any = {
    gsap: { to: vi.fn(tween), from: vi.fn(tween), fromTo: vi.fn(tween), set: vi.fn(), quickTo: vi.fn(() => vi.fn()), killTweensOf: vi.fn() },
    ScrollTrigger: { create: vi.fn((cfg) => { const st = { cfg, kill: vi.fn() }; created.push(st); return st; }) },
    SplitText: { create: vi.fn() }, finePointer: true, options: {},
  };
  return { ctx, created, tweens };
}
beforeEach(() => { document.body.innerHTML = ''; });

describe('modules B', () => {
  it('pin-story sets active chapter and dot from progress', () => {
    document.body.innerHTML = `<div id="el">${[0,1,2,3].map(i => `<article data-chapter></article><button data-dot></button>`).join('')}<div data-shape></div></div>`;
    const el = document.getElementById('el')!;
    const { ctx, created } = makeCtx();
    const cleanup = modules['pin-story'](el, ctx) as () => void;
    const pin = created.find((s) => s.cfg.pin);
    expect(pin).toBeTruthy();
    pin.cfg.onUpdate({ progress: 0.6 });
    expect(el.dataset.activeIndex).toBe('2');
    expect(el.querySelectorAll('[data-chapter]')[2].hasAttribute('data-active')).toBe(true);
    expect(el.querySelectorAll('[data-dot]')[2].getAttribute('aria-current')).toBe('step');
    pin.cfg.onUpdate({ progress: 1 });
    expect(el.dataset.activeIndex).toBe('3');
    cleanup();
    expect(pin.kill).toHaveBeenCalled();
  });
  it('stack-cards animates every card but the last and cleans up', () => {
    document.body.innerHTML = '<div id="el"><div data-card></div><div data-card></div><div data-card></div></div>';
    const { ctx, tweens } = makeCtx();
    const cleanup = modules['stack-cards'](document.getElementById('el')!, ctx) as () => void;
    expect(ctx.gsap.to).toHaveBeenCalledTimes(2);
    cleanup();
    tweens.forEach((t) => expect(t.kill).toHaveBeenCalled());
  });
  it('draw-line activates entries on enter and deactivates on leave back', () => {
    document.body.innerHTML = '<div id="el"><span data-line-fill></span><div data-entry></div><div data-entry></div></div>';
    const { ctx, created } = makeCtx();
    const cleanup = modules['draw-line'](document.getElementById('el')!, ctx) as () => void;
    const entry = document.querySelector('[data-entry]')!;
    const st = created.find((s) => s.cfg.trigger === entry);
    st.cfg.onEnter(); expect(entry.hasAttribute('data-active')).toBe(true);
    st.cfg.onLeaveBack(); expect(entry.hasAttribute('data-active')).toBe(false);
    cleanup(); created.forEach((s) => expect(s.kill).toHaveBeenCalled());
  });
  it('marquee pauses on hover and cleans up listeners', () => {
    document.body.innerHTML = '<div id="el"><div data-track></div></div>';
    const el = document.getElementById('el')!;
    const remove = vi.spyOn(el, 'removeEventListener');
    const { ctx, tweens } = makeCtx();
    const cleanup = modules['marquee'](el, ctx) as () => void;
    el.dispatchEvent(new Event('pointerenter'));
    expect(tweens[0].timeScale).toHaveBeenCalledWith(0);
    cleanup();
    expect(tweens[0].kill).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith('pointerenter', expect.any(Function));
  });
});
```

- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement + register. **Step 4:** `npx vitest run` → PASS; `npm run check` → 0 errors.

---

### Task 5: Layout shell — Navbar, Footer, Section, UI primitives

**Files:** Create `src/components/layout/{Navbar,Footer,Section}.astro`, `src/components/ui/{Button,Marquee,Counter,Tag}.astro`, `src/scripts/navbar.ts`; Modify `src/pages/index.astro` (temporary: Navbar + 6 empty `Section`s with ids from nav + Footer, so behaviour is testable); Test `tests/unit/navbar.test.ts`.

**Interfaces:**
- Consumes: `content.nav`, `content.contact`, `src/data/site.json` links; `scrollToTarget` from `src/motion/lenis.ts`; module names `magnetic`, `marquee`, `counter`, `reveal-up`.
- Produces:
  - `<Section id theme? labelledby?>` → `<section id={id} data-theme={theme} aria-labelledby={labelledby} class="section"><slot/></section>`, `theme: 'dark' | 'light'` default dark; vertical padding `clamp(96px, 14vw, 160px)`.
  - `<Button href variant="primary|ghost|light" magnetic? external?>` slot label; renders `<a>`; `magnetic` adds `data-motion="magnetic"`; `external` adds `target="_blank" rel="noreferrer"` and ↗ glyph (`aria-hidden`).
  - `<Tag>` small pill label.
  - `<Counter value suffix>` → `<span data-motion="counter" data-motion-to={value} data-motion-suffix={suffix}>{value}{suffix}</span>`.
  - `<Marquee items reverse?>` → `<div class="marquee" data-motion="marquee" data-motion-direction={reverse?'reverse':undefined}><div class="marquee-track" data-track><ul>…items…</ul><ul aria-hidden="true">…items…</ul></div></div>`; `<ul>` items separated by a gradient dot.
  - `src/scripts/navbar.ts`: `export function initNavbar(root: HTMLElement, win: Window = window): () => void`.

Navbar markup: `<header class="nav" data-nav data-state="top">` containing brand (logo `/logo.png` 28px + "Rodo Armas"), `<nav aria-label="Main">` with links and a `<span class="nav-indicator" aria-hidden="true">`, CTA `<Button variant="primary" magnetic href="#contact">`, mobile toggle `<button class="nav-toggle" aria-expanded="false" aria-controls="mobile-menu">` (visually hidden label "Menu"), overlay `<div id="mobile-menu" class="nav-overlay" hidden>` with links + CTA, and `<div class="nav-progress" aria-hidden="true"><span></span></div>`. Navbar's own `<script>` imports `initNavbar` and calls it on `[data-nav]`.

`initNavbar` behaviour:
1. `data-state`: `top` when `scrollY < 40`, else `floating`. `data-hidden` attribute set when scrolling down by > 8px past 400px; removed when scrolling up. Never hidden while menu open or when focus is inside the header.
2. Progress bar: `--progress` custom property on header = scrollY / (scrollHeight - innerHeight), clamped 0–1.
3. Active link: IntersectionObserver on `section[id]` matching nav hrefs (`rootMargin: '-45% 0px -50% 0px'`); set `aria-current="true"` on the link and move indicator (`--ind-x`, `--ind-w` from link offsetLeft/offsetWidth).
4. Link clicks (desktop + overlay + any `a[href^="#"]` inside header): `preventDefault`, `scrollToTarget(hash)`, `history.replaceState(null,'',hash)`, close menu.
5. Mobile menu: toggle sets `aria-expanded`, removes `hidden`, adds `html.menu-open` (CSS `overflow:hidden`), focuses first link; Tab/Shift+Tab cycle inside overlay (+toggle); Esc closes and returns focus to toggle; `matchMedia('(min-width: 768px)')` change → close.
6. Scroll handling throttled with rAF, passive listeners. Returns cleanup removing all listeners/observer.

CSS (scoped in Navbar.astro): height `var(--nav-h)`; `[data-state=floating]` → inner wrapper becomes centered pill `max-width: 880px; margin-top: 12px; border-radius: 999px; background: rgb(20 20 22 / .72); backdrop-filter: blur(16px) saturate(1.4); border: 1px solid var(--line)`; transition with `var(--ease-out)`; `[data-hidden]` → `translateY(-120%)`; indicator absolutely positioned pill using `--ind-x/--ind-w` with transition; progress span `transform: scaleX(var(--progress))` origin left, accent gradient; overlay full-screen `--bg` with big links (`font-size: clamp(2rem, 9vw, 3rem)`) staggered via CSS `transition-delay: calc(var(--i) * 50ms)` when `html.menu-open`. Below 768px hide desktop nav/CTA, show toggle (two-line burger → X).

Footer: `<footer>` with brand, LinkedIn + GitHub (real URLs from `src/data/site.json`, `external`), `content.contact.footerNote`, `© {year}`; wrap content in `data-motion="reveal-up"`.

- [ ] **Step 1: Failing tests** `tests/unit/navbar.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../src/motion/lenis', () => ({ scrollToTarget: vi.fn() }));
import { scrollToTarget } from '../../src/motion/lenis';
import { initNavbar } from '../../src/scripts/navbar';

function mount() {
  document.body.innerHTML = `
    <header data-nav data-state="top">
      <nav aria-label="Main"><a href="#about">About</a><a href="#work">Work</a><span class="nav-indicator"></span></nav>
      <button class="nav-toggle" aria-expanded="false" aria-controls="mobile-menu">Menu</button>
      <div id="mobile-menu" hidden><a href="#about">About</a><a href="#work">Work</a></div>
    </header>
    <section id="about"></section><section id="work"></section>`;
  return document.querySelector<HTMLElement>('[data-nav]')!;
}
beforeEach(() => { document.documentElement.className = ''; });

describe('navbar', () => {
  it('toggles the mobile menu with aria and scroll lock', () => {
    const root = mount(); initNavbar(root);
    const toggle = root.querySelector<HTMLButtonElement>('.nav-toggle')!;
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('#mobile-menu')!.hasAttribute('hidden')).toBe(false);
    expect(document.documentElement.classList.contains('menu-open')).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('#mobile-menu a'));
  });
  it('Escape closes the menu and returns focus', () => {
    const root = mount(); initNavbar(root);
    const toggle = root.querySelector<HTMLButtonElement>('.nav-toggle')!;
    toggle.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.documentElement.classList.contains('menu-open')).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });
  it('link click scrolls via scrollToTarget and closes menu', () => {
    const root = mount(); initNavbar(root);
    root.querySelector<HTMLButtonElement>('.nav-toggle')!.click();
    root.querySelector<HTMLAnchorElement>('#mobile-menu a[href="#work"]')!.click();
    expect(scrollToTarget).toHaveBeenCalledWith('#work');
    expect(root.querySelector('#mobile-menu')!.hasAttribute('hidden')).toBe(true);
  });
  it('cleanup removes document listeners', () => {
    const root = mount();
    const remove = vi.spyOn(document, 'removeEventListener');
    initNavbar(root)();
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
```

(happy-dom may lack IntersectionObserver — guard with `'IntersectionObserver' in win`.)

- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement components, `navbar.ts`, temporary page. **Step 4:** `npx vitest run`, `npm run check`, `npm run build` → pass. Start `npm run dev` briefly is not required.

---

### Task 6: Sections 1–5 — Hero, Stats, About, Story, Work

**Files:** Create `src/components/sections/{Hero,Stats,About,Story,Work}.astro`. Do not touch `index.astro` (Task 7 composes). Test: none new (covered by build/check and Task 8 e2e); must pass `npm run check` and `npm run build` with a scratch page — create `src/pages/_preview-a.astro` that renders Navbar + these 5 sections, and delete it when done (Astro ignores `_`-prefixed pages, so it's safe either way; delete anyway).

**Interfaces:** Consumes `content.hero|stats|about|story|work`, `Section`, `Button`, `Tag`, `Counter`; module names `reveal-words`, `reveal-up`, `cursor-glow`, `hero-scale`, `counter`, `scrub-words`, `pin-story`, `stack-cards`, `tilt`. DOM contracts from Task 4 for `pin-story` and `stack-cards`.

Specs (all styles scoped in each component, tokens only — no raw hex except inside gradient definitions; every heading has an id used by `aria-labelledby`):

- **Hero** (`<section id="top" class="hero" data-motion="hero-scale cursor-glow">`, NOT using `Section` because it's full-bleed): `min-height: 100svh`; inner `<div class="hero-frame" data-hero-frame>` holds the visuals: a dark radial background, two blurred accent gradient orbs with slow CSS `@keyframes drift` (20s/26s alternate), a subtle grid/noise overlay (CSS gradient lines, 6% opacity) and `<div class="glow" data-glow aria-hidden="true">` (480px radial accent blob, `mix-blend-mode: screen`). Content bottom-left aligned in `.shell`: `Tag` eyebrow; `<h1 class="display" data-motion="reveal-words" data-motion-trigger="load">` headline; lede `data-motion="reveal-up" data-motion-delay="0.5"`; buttons row `data-motion="reveal-up" data-motion-delay="0.7"` with primary + ghost Buttons. Scroll cue bottom-right: "Scroll" + animated line (CSS).
- **Stats** (`Section id="stats"`): 4-column grid (2×2 under 768px) separated by hairlines; each cell: `<Counter>` at `clamp(2.5rem, 6vw, 4.5rem)` gradient text, label muted. Wrapper `data-motion="reveal-up" data-motion-stagger="0.08"`.
- **About** (`Section id="about"`): eyebrow + `<p class="about-body" data-motion="scrub-words">` at `clamp(1.75rem, 3.6vw, 3rem)`, line-height 1.2, max-width 22ch-ish (~1000px).
- **Story** (`Section id="story"`): eyebrow; `<div class="story-stage" data-motion="pin-story" data-active-index="0">` grid 2 columns (`1fr 1fr`, single column < 900px). Left: 4 `<article data-chapter>` (kicker, h3, body). Right: `<div class="story-visual" data-shape aria-hidden="true">` with 3 absolutely positioned gradient blobs whose position/scale/hue change per `[data-active-index="0..3"]` via CSS transitions (1s `var(--ease-out)`). Dots `<button data-dot aria-label="Chapter N">` (visual only; clicking scrolls to the chapter's progress point is NOT required — make them `<span data-dot role="presentation">` if not interactive, then aria-current still set; choose `<span>`). CSS: under `html.js-motion` chapters are `position:absolute; inset:0; opacity:0` and `[data-active]` → `opacity:1; transform:none`; stage height `100svh` with content centered. Without js-motion: chapters stack with gap, visual shows state 0, dots hidden.
- **Work** (`Section id="work"`): eyebrow + h2 (`reveal-words`); `<div class="work-stack" data-motion="stack-cards">` with 3 `<article data-card>`: `position: sticky; top: calc(var(--nav-h) + 24px)`, `min-height: min(78svh, 680px)`, radius 28, surface bg, 2-column (copy left: Tag, h3, summary, Button ghost external=false href; visual right: unique abstract gradient composition per card index via `--hue`). Gap between cards 10vh so stacking reads; transform-origin top center.

- [ ] **Step 1:** Implement the five components. **Step 2:** Create `_preview-a.astro`, run `npm run check` + `npm run build` → pass. **Step 3:** Delete `_preview-a.astro`. Report any DOM contract deviations.

---

### Task 7: Sections 6–10 + page composition

**Files:** Create `src/components/sections/{Bento,Skills,Timeline,Writing,Contact}.astro`; Overwrite `src/pages/index.astro`; Modify `src/pages/404.astro` only if styles break.

**Interfaces:** Consumes `content.bento|skills|timeline|writing|contact`, `selectPosts` from `src/content/posts.ts`, `src/data/linkedin.json`, `src/data/site.json`, `Section`, `Button`, `Tag`, `Marquee`; module names `reveal-up`, `reveal-words`, `tilt`, `marquee`, `draw-line`, `magnetic`. DOM contract for `draw-line` (Task 4).

- **Bento** (`Section id="bento" theme="light"`): eyebrow + h2; grid `grid-template-columns: repeat(4, 1fr)`, auto rows `minmax(220px, auto)`; `sm` = 1 col, `md` = 2 cols, `lg` = 2 cols × 2 rows; 2 columns < 900px (lg/md span 2), 1 column < 560px. Wrapper `data-motion="reveal-up" data-motion-stagger="0.07"`; each tile `data-motion="tilt"`, radius 28, white surface, hairline border, overflow hidden; tile visual by `visual`:
  `gradient` = slowly rotating conic accent gradient; `pulse` = concentric rings pulsing; `chart` = inline SVG polyline whose `stroke-dashoffset` animates on loop; `orbit` = small dots orbiting a center; `grid` = dot grid with a sweeping highlight; `number` = big gradient "01" style number. All CSS keyframes, `aria-hidden`.
- **Skills** (`Section id="skills"`): eyebrow + h2; two `<Marquee>` rows (`rows[0]`, `rows[1]` reverse), oversized text `clamp(2rem, 6vw, 4.5rem)`, second row outlined text (`-webkit-text-stroke: 1px var(--muted); color: transparent`); edge fade mask. Below: 3 interest cards grid (`data-motion="reveal-up" data-motion-stagger="0.08"`), each `data-motion="tilt"`, index "01–03", title, body, ↗ glyph.
- **Timeline** (`Section id="timeline"`): eyebrow + h2; `<ol class="timeline" data-motion="draw-line">` with `<span class="line" aria-hidden="true"><span data-line-fill></span></span>` and 4 `<li data-entry>` (dot, date meta, role h3, org, body). Line track = `--line`, fill = accent gradient `transform: scaleY(0)` under js-motion (scaleY(1) otherwise). Dot grows and glows when `[data-active]`. Alternate left/right layout ≥ 900px; single column left-aligned below.
- **Writing** (`Section id="writing" theme="light"`): eyebrow + h2 + link to LinkedIn (`Button variant="ghost" external`, label `content.writing.cta`). Posts: in frontmatter, `let generated: unknown = undefined; try { generated = JSON.parse(await readFile(new URL('../../generated/linkedin.json', import.meta.url), 'utf8')); } catch {}` then `selectPosts(generated, fallbackPosts, content.writing.placeholders)`. 3-column card grid (1 column < 900px), `data-motion="reveal-up" data-motion-stagger="0.08"`; each card `<a>` (external → target blank) with date meta, title (clamped to 4 lines), "Read ↗"; hover: lift `translateY(-6px)` + shadow, transition `var(--ease-out)`.
- **Contact** (`Section id="contact"`): centered; eyebrow; `<h2 class="contact-title" data-motion="reveal-words">` at `clamp(3rem, 12vw, 10rem)`, with a gradient-text class; big `Button variant="light" magnetic external` → LinkedIn URL from `src/data/site.json`, label `content.contact.cta.label`; background accent orb (CSS).
- **index.astro**:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Navbar from '../components/layout/Navbar.astro';
import Footer from '../components/layout/Footer.astro';
import Hero from '../components/sections/Hero.astro';
import Stats from '../components/sections/Stats.astro';
import About from '../components/sections/About.astro';
import Story from '../components/sections/Story.astro';
import Work from '../components/sections/Work.astro';
import Bento from '../components/sections/Bento.astro';
import Skills from '../components/sections/Skills.astro';
import Timeline from '../components/sections/Timeline.astro';
import Writing from '../components/sections/Writing.astro';
import Contact from '../components/sections/Contact.astro';
---
<BaseLayout>
  <Navbar />
  <main id="main">
    <Hero /><Stats /><About /><Story /><Work /><Bento /><Skills /><Timeline /><Writing /><Contact />
  </main>
  <Footer />
</BaseLayout>
```

The hero overlaps the next section: give `#stats` `position: relative; z-index: 1; background: var(--bg); border-radius: 28px 28px 0 0; margin-top: -28px` so it slides over the scaling hero.

- [ ] **Step 1:** Implement components + page. **Step 2:** `npm run check`, `npm test`, `npm run build` → pass. **Step 3:** `npm run preview` in background, `curl -s http://127.0.0.1:4321/ | grep -c 'data-motion'` > 20, then stop preview.

---

### Task 8: E2E, accessibility, budget, CI, docs

**Files:** Create `playwright.config.ts`, `tests/e2e/site.spec.ts`, `scripts/check-budget.mjs`; Modify `package.json` (add `@playwright/test@1.63.0`, `@axe-core/playwright@4.13.0` exact), `.github/workflows/deploy.yml`, `README.md`, `CONTENT_TODO.md`.

- [ ] **Step 1: Install** `npm install -D -E @playwright/test@1.63.0 @axe-core/playwright@4.13.0` and `npx playwright install chromium`.

- [ ] **Step 2: Config** `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4321' },
  webServer: { command: 'npm run preview', url: 'http://127.0.0.1:4321', reuseExistingServer: !process.env.CI, timeout: 60_000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 3: Tests** `tests/e2e/site.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const sections = ['about', 'story', 'work', 'skills', 'timeline', 'writing'];

test('nav links land each section below the navbar', async ({ page }) => {
  await page.goto('/');
  for (const id of sections) {
    await page.locator(`header nav[aria-label="Main"] a[href="#${id}"]`).click();
    await expect.poll(async () => {
      const navBottom = await page.locator('header[data-nav]').evaluate((el) => el.getBoundingClientRect().bottom);
      const top = await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);
      return top >= navBottom - 2 && top < 400;
    }, { timeout: 4000 }).toBe(true);
  }
});

test('mobile menu: open, trap, Esc, closes on widen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('.nav-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#mobile-menu')).toBeVisible();
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('header'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('html')).not.toHaveClass(/menu-open/);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('every section heading is visible without scrolling animations', async ({ page }) => {
    await page.goto('/');
    for (const h of await page.locator('main h1, main h2').all()) {
      await h.scrollIntoViewIfNeeded();
      await expect(h).toBeVisible();
      expect(Number(await h.evaluate((el) => getComputedStyle(el).opacity))).toBe(1);
    }
  });
});

test.describe('no javascript', () => {
  test.use({ javaScriptEnabled: false });
  test('content is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#contact h2')).toBeVisible();
  });
});

test('content becomes visible if the motion bundle fails to load', async ({ page }) => {
  await page.route(/\/_astro\/.*\.js$/, (r) => r.abort());
  await page.goto('/');
  await page.waitForTimeout(3000);
  await expect(page.locator('html')).not.toHaveClass(/js-motion/);
  expect(Number(await page.locator('#work h2').evaluate((el) => getComputedStyle(el).opacity))).toBe(1);
});

test('no serious accessibility violations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});
```

- [ ] **Step 4: Budget** `scripts/check-budget.mjs`:

```js
import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
const LIMIT = 60 * 1024;
async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p); else if (p.endsWith('.js')) yield p;
  }
}
let total = 0;
for await (const file of walk('dist')) total += gzipSync(await readFile(file)).length;
console.log(`client JS: ${(total / 1024).toFixed(1)} KB gzip (limit ${LIMIT / 1024} KB)`);
if (total > LIMIT) { console.error('JS budget exceeded'); process.exit(1); }
```

- [ ] **Step 5: Run** `npm run build && npm run budget && npm run test:e2e`. Fix real failures in the owning component (do not weaken tests). If axe flags contrast in light sections, fix tokens.

- [ ] **Step 6: CI** — rewrite `.github/workflows/deploy.yml`: triggers `push: [main]`, `pull_request`, `workflow_dispatch`, `schedule: cron '23 7 * * *'` (README already promises a daily sync). Job `verify` (ubuntu, Node 22, npm cache): `npm ci`, `npm run sync` (env `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`, `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_PERSON_URN` secrets, `LINKEDIN_VERSION` var — sync scripts already fall back safely), `npm run check`, `npm test`, `npm run build`, `npm run budget`, `npx playwright install --with-deps chromium`, `npm run test:e2e`, upload `dist` via `actions/upload-pages-artifact@v3` only when `github.event_name != 'pull_request'`. Job `deploy` needs `verify`, `if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'`, same environment/permissions as before, `actions/deploy-pages@v4`. Keep top-level `permissions` and `concurrency`.

- [ ] **Step 7: Docs.** README: replace "Content" section with the new layout (`src/content/content.json` holds all copy; edit and rebuild; schema in `schema.ts`), add "Motion system" section (data-motion attribute → module, list of modules, how to add one, reduced-motion behaviour) and "Scripts" table. CONTENT_TODO.md: add top line "All visible copy is lorem ipsum placeholder in `src/content/content.json` — replace before launch." and keep remaining items relevant.

- [ ] **Step 8:** Final full run: `npm run check && npm test && npm run build && npm run budget && npm run test:e2e` all green; `npx prettier --check .` clean.
