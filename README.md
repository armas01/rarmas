# Rodo Armas — personal site

Static Astro site for `https://rarmas.cl`, deployed with GitHub Pages from `armas01/rarmas`.

## Local use

Use Node 22+, then run `npm ci`, `npm run sync`, and `npm run dev`. `npm run build` is offline-safe because it reads checked-in fallbacks if no generated snapshots exist. `npm run check` and `npm test` validate the project before deployment.

## Content

All visible copy is lorem ipsum placeholder text in `src/content/content.json`. Edit that file and rebuild; its shape is validated by the zod schema in `src/content/schema.ts`. Replace the placeholders before launch (see `CONTENT_TODO.md`). Synced GitHub and LinkedIn data still lives in `src/data/`.

## Motion system

The `/` page is animated by a small declarative registry in `src/motion/`. Rules:

- Markup opts in with `data-motion="name"` (space-separated names for several modules). Options are `data-motion-*` attributes, camelCased and passed to the module as `ctx.options`.
- `src/motion/registry.ts` finds every `[data-motion]`, looks the name up in `src/motion/modules/index.ts` and calls the module with `(el, ctx)`. A module may return a cleanup function. Unknown names or thrown errors reveal the element in its final state instead of leaving it hidden.
- Modules: counter, cursor-glow, draw-line, hero-scale, magnetic, marquee, pin-story, reveal-up, reveal-words, scrub-words, stack-cards, tilt.
- To add one: create `src/motion/modules/<name>.ts` exporting a `MotionModule`, register it in `src/motion/modules/index.ts`, then add `data-motion="<name>"` to markup.
- Reduced motion: with `prefers-reduced-motion: reduce` every `[data-motion]` element is revealed in its final state, and no pinned or scrubbed animation runs.
- Fail-safe: an inline head script adds `html.js-motion` (which hides elements pending animation) and removes it after 2.5 s unless the motion bundle sets `motion-ready`. Without JavaScript all content is visible.
- Client JS is budgeted at 60 KB gzip (`npm run budget`).

## Scripts

| Script               | Purpose                                                        |
| -------------------- | -------------------------------------------------------------- |
| `npm run dev`        | Astro dev server on 127.0.0.1                                  |
| `npm run build`      | Static build into `dist/`                                      |
| `npm run preview`    | Astro preview server (daemonizes by default in Astro 7)        |
| `npm run preview:ci` | Foreground static server for `dist/` (used by Playwright)      |
| `npm run sync`       | Run GitHub and LinkedIn syncs (`sync:github`, `sync:linkedin`) |
| `npm run check`      | `astro check` type validation                                  |
| `npm test`           | Node and Vitest unit tests                                     |
| `npm run test:e2e`   | Playwright e2e and axe accessibility tests (build first)       |
| `npm run budget`     | Fail if client JS exceeds 60 KB gzip                           |
| `npm run lint`       | ESLint                                                         |
| `npm run format`     | Prettier write                                                 |

CI (`.github/workflows/deploy.yml`) runs sync, check, tests, build, budget and e2e on every push and pull request, and deploys to GitHub Pages from main.

## GitHub data and Pages

`npm run sync:github` fetches only allowlisted public repositories using the GitHub REST API. It uses a least-privilege `GITHUB_TOKEN` when available, has an 8-second timeout, and keeps the checked-in seed on failure. Generated data is ignored by Git. The workflow builds on main, runs daily at 07:23 UTC, and can be launched manually. GitHub may delay schedules and disables schedules after 60 days of inactivity on public repositories; manually re-enable the workflow in Actions if needed. The site remains usable from its committed content when syncs stop.

## LinkedIn sync

`npm run sync:linkedin` reads the authenticated member's latest posts from LinkedIn's official Posts API, normalizes up to three public entries, validates the response, deduplicates URLs, and saves only public display fields in the ignored generated snapshot. Credentials remain server-side in GitHub Actions and never enter browser code.

Configure repository secrets `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_PERSON_URN` (for example `urn:li:person:...`), plus repository variable `LINKEDIN_VERSION` in YYYYMM format. Reading member posts requires an approved LinkedIn app with the restricted member-social read permission. If credentials are absent, expired, timed out, or rejected, the site keeps `src/data/linkedin.json` as its safe fallback.
