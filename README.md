# Rodo Armas — personal site

Static Astro site for `https://rarmas.cl`, deployed with GitHub Pages from `armas01/rarmas`.

## Local use

Use Node 22+, then run `npm ci`, `npm run sync`, and `npm run dev`. `npm run build` is offline-safe because it reads checked-in fallbacks if no generated snapshots exist. `npm run check` and `npm test` validate the project before deployment.

## Content

- Edit identity, links, verified timeline items, interests and hero-asset configuration in `src/data/site.json`.
- Curate work in `src/data/projects.json`. Draft records are intentionally excluded.
- Add owner-curated LinkedIn posts to `src/data/linkedin.json`, or configure the official LinkedIn API sync below.
- Set a real `cvUrl` in `src/data/site.json` to activate the CV link.
- Replace `src/assets/hero-santiago.png` to change the hero while keeping the responsive crop and scroll animation.

## GitHub data and Pages

`npm run sync:github` fetches only allowlisted public repositories using the GitHub REST API. It uses a least-privilege `GITHUB_TOKEN` when available, has an 8-second timeout, and keeps the checked-in seed on failure. Generated data is ignored by Git. The workflow builds on main, runs daily at 07:23 UTC, and can be launched manually. GitHub may delay schedules and disables schedules after 60 days of inactivity on public repositories; manually re-enable the workflow in Actions if needed. The site remains usable from its committed content when syncs stop.

## LinkedIn sync

`npm run sync:linkedin` reads the authenticated member's latest posts from LinkedIn's official Posts API, normalizes up to three public entries, validates the response, deduplicates URLs, and saves only public display fields in the ignored generated snapshot. Credentials remain server-side in GitHub Actions and never enter browser code.

Configure repository secrets `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_PERSON_URN` (for example `urn:li:person:...`), plus repository variable `LINKEDIN_VERSION` in YYYYMM format. Reading member posts requires an approved LinkedIn app with the restricted member-social read permission. If credentials are absent, expired, timed out, or rejected, the site keeps `src/data/linkedin.json` as its safe fallback.
