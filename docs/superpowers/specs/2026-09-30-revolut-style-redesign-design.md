# rarmas.cl — Revolut-style redesign

Date: 2026-09-30 · Branch: `redesign` · Status: approved in conversation

## Intent

Personal brand / portfolio site for Rodo Armas. Rebuild the single-page Astro site with a
Revolut-like dark aesthetic and rich, scroll-driven animation, on a clean component and
motion architecture. All visible copy becomes lorem ipsum placeholders (real copy returns
later through the same content file). Real outbound links (LinkedIn, GitHub) stay real.

Success criteria:
- One long page, fixed top navbar, 10 sections (below), each with its specified motion.
- Works with JS disabled (all content visible) and with `prefers-reduced-motion` (no pin, no smooth scroll, final states).
- `astro check`, unit tests, e2e tests, axe (0 serious/critical) and JS budget (≤ 60 KB gzip total client JS) all pass.
- Deploys from `main` via the existing GitHub Pages workflow; static output only.

## Constraints

- Astro (static), deployed to GitHub Pages with `CNAME` `rarmas.cl`. Node ≥ 22.12.
- No UI framework runtime (no React/Vue islands). Client code is plain TypeScript.
- Motion stack: `gsap` (+ ScrollTrigger, SplitText — free since 2025) and `lenis`.
- Keep `scripts/sync-github.mjs`, `scripts/sync-linkedin.mjs`, `src/data/linkedin.json`,
  `src/data/github.seed.json`, `src/data/site.json` (links still read from here) and
  `tests/content.test.mjs` working.
- Pin every dependency to an exact version (no `latest`).

## Architecture

```
src/
  content/
    schema.ts        zod schemas, one per section + Content root; exports `content` (parsed)
    content.json     all placeholder copy (lorem ipsum)
  components/
    layout/  Navbar.astro  Footer.astro  Section.astro
    sections/ Hero Stats About Story Work Bento Skills Timeline Writing Contact (.astro)
    ui/      Button.astro  Marquee.astro  Counter.astro  Tag.astro
  motion/
    registry.ts      scans [data-motion], dispatches to modules, owns cleanup + error isolation
    lenis.ts         Lenis smooth scroll wired to gsap.ticker + ScrollTrigger.update
    prefers.ts       reducedMotion(), finePointer() helpers (matchMedia-based)
    types.ts         MotionModule = (el: HTMLElement, ctx: MotionContext) => Cleanup | void
    index.ts         client entry: registers gsap plugins, starts lenis + registry
    modules/
      reveal-words.ts  reveal-up.ts  scrub-words.ts  counter.ts  pin-story.ts
      stack-cards.ts   magnetic.ts   tilt.ts         draw-line.ts  hero-scale.ts
      marquee.ts       cursor-glow.ts
  scripts/
    navbar.ts        scroll state, hide/show, active link indicator, progress bar, mobile menu
  styles/
    tokens.css  base.css  utilities.css
  layouts/BaseLayout.astro
  pages/index.astro  404.astro
```

Rules:
1. Section components never import gsap/lenis. They opt in with `data-motion="<name>"` and
   optional `data-motion-*` options.
2. A motion module is a function `(el, ctx) => cleanup`. It must not touch elements outside
   `el`. It must undo everything (listeners, ScrollTriggers, tweens, SplitText) in cleanup.
3. The registry: if `ctx.reduced` is true, it does not run modules (elements are already in
   final state via CSS). It wraps each module call in try/catch; on error it logs in dev
   (`import.meta.env.DEV`) and calls `revealFinal(el)`.
4. Progressive enhancement: hidden initial states apply only under `html.js-motion`, a class
   added by a tiny inline script in `<head>` when JS runs and reduced motion is off.
5. No copy in markup — every visible string comes from `content` (parsed with zod at build
   time; invalid content fails the build).

## Visual system (tokens.css)

- Colors: `--bg #0A0A0B`, `--surface #141416`, `--surface-2 #1C1C1F`, `--text #F5F5F7`,
  `--muted rgb(245 245 247 / .6)`, `--line rgb(255 255 255 / .08)`, accent gradient
  `--accent-a #3D7BFF → --accent-b #8B5CF6`. Light sections: `--light-bg #F4F4F2`,
  `--light-text #0A0A0B`. Light sections set `data-theme="light"` and remap tokens.
- Type: Manrope Variable. Display scale with `clamp()`: hero `clamp(2.5rem, 9vw, 7.5rem)`,
  h2 `clamp(2rem, 5.5vw, 4.5rem)`; tight tracking (-0.04em) on display sizes; body 1.0625rem.
- Spacing scale 4/8/12/16/24/32/48/64/96/128/160 px; radii 12/20/28/999 px.
- Motion tokens: ease `expo.out` (CSS `cubic-bezier(.16,1,.3,1)`), durations .4/.8/1.2 s,
  word stagger .04 s.
- Focus ring: 2px accent outline, offset 3px, on every interactive element.

## Navbar

Fixed top. Transparent over hero; after hero, becomes a floating glass pill (backdrop blur,
hairline border, max-width ~880px, centered). Hides on scroll down, reappears on scroll up.
Active section link highlighted with a sliding pill indicator (IntersectionObserver).
Thin gradient scroll-progress bar on its bottom edge. Mobile (< 768px): button opens a
full-screen overlay; links stagger in; focus trap; Esc closes; body scroll locked; link click
closes. "Let's talk" CTA with magnetic hover. Links: About, Story, Work, Skills, Timeline,
Writing; CTA → #contact.

## Sections

| # | id | Theme | Content | Motion |
|---|----|-------|---------|--------|
| 1 | `top` Hero | dark | eyebrow, headline (≤ 6 words), lede, 2 buttons | `reveal-words` headline (masked rise, stagger); `reveal-up` lede/buttons after; `cursor-glow` gradient blob following pointer (fine pointer only); `hero-scale`: on scroll hero scales to .92, radius → 28px, dims |
| 2 | `stats` | dark | 4 stats {value:number, suffix, label} | `counter` count-up on enter, once |
| 3 | `about` | dark | eyebrow, large paragraph | `scrub-words`: word opacity .2 → 1 scrubbed to scroll |
| 4 | `story` | dark | 4 chapters {kicker,title,body} | `pin-story`: pin ~300vh; chapters cross-fade; right-side abstract gradient shapes morph per chapter; progress dots |
| 5 | `work` | dark | 3 projects {tag,title,summary,href,cta} | `stack-cards`: each card pins, next slides over, previous scales to ~.9 and dims |
| 6 | `bento` | light | heading + 6 tiles {title,body,size: sm/md/lg, visual: gradient/pulse/chart/orbit/grid/number} | `reveal-up` stagger; CSS idle loops per visual; `tilt` on hover |
| 7 | `skills` | dark | 2 rows of skill strings; 3 interest cards | `marquee` (opposite directions, speeds up with scroll velocity, pauses on hover); `tilt` cards |
| 8 | `timeline` | dark | 4 entries {date,role,org,body} | `draw-line`: line scales Y with scroll; dots activate as passed |
| 9 | `writing` | light | heading + 3 posts {date,title,href} | `reveal-up` stagger; CSS hover lift. Uses `src/generated/linkedin.json` if present & non-empty, else `src/data/linkedin.json` if non-empty, else placeholder posts |
| 10 | `contact` + footer | dark | huge headline, CTA, footer links (LinkedIn, GitHub — real URLs from `src/data/site.json`), © year | `reveal-words` headline; `magnetic` CTA; `reveal-up` footer |

Abstract visuals (story, bento, work cards) are pure CSS/SVG gradients — no new images.
The old hero photo and old CSS files are removed.

## Accessibility

- Semantic landmarks: header/nav, main, sections with `aria-labelledby`, footer. Skip link.
- Split text: parent keeps `aria-label` with full text; generated word spans `aria-hidden`.
- Decorative visuals `aria-hidden="true"`. Color contrast AA on both themes.
- Reduced motion: no Lenis, no pin, no scrub, no marquee animation; everything final state.
- Mobile menu: `aria-expanded`, `aria-controls`, focus trap, Esc, return focus to button.

## Error handling

- Registry isolates module failures (see rule 3). Missing content → build error (zod).
- `generated/linkedin.json` read failures fall back silently (existing behaviour).
- No layout shift: fixed sizes / `aspect-ratio` for visuals; `font-display: swap`.

## Testing

- Unit (Vitest + happy-dom), `tests/unit/`: schema accepts content.json and rejects broken
  data; registry runs modules, isolates errors, skips under reduced motion, calls cleanups;
  each motion module returns a cleanup that removes its listeners (gsap mocked where needed).
- E2E (Playwright, chromium, against `astro preview`), `tests/e2e/`: nav links scroll to
  sections; mobile menu open/trap/Esc; reduced-motion run shows every section's heading
  text visible; JS-disabled run shows content; axe scan 0 serious/critical violations.
- Budget script `scripts/check-budget.mjs`: sum gzip size of `dist/**/*.js` ≤ 60 KB.
- Existing `tests/content.test.mjs` kept (run via `node --test tests/*.test.mjs`).
- Scripts: `check`, `test` (node tests + vitest), `test:e2e`, `budget`, `format`, `lint`.

## CI / rollout

- Workflow: on PRs and pushes to main run `npm ci`, `astro check`, `npm test`, `build`,
  `budget`, Playwright e2e. Deploy job only on push to main, after checks pass.
- Prettier (+ prettier-plugin-astro) and ESLint (flat config, typescript-eslint,
  eslint-plugin-astro). If ESLint peer deps conflict with the pinned TypeScript, keep
  Prettier and drop ESLint, noting why.
- All work on `redesign`; one PR to `main` at the end. Live site unchanged until merge.

## Out of scope

Multi-page routing, CMS, theme toggle, testimonials, new photography, real copy.
