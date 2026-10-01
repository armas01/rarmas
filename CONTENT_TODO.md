Site copy lives in `src/content/content.json` (validated by `src/content/schema.ts`).

# Still to do

- **Uber Eats impact (WIP):** the Work card "Strategy & Planning at Uber Eats" is a teaser. Develop the full story and decide which figures can be public.
- **Photography:** add images under `public/photos/` and set each entry's `src` in `photography.photos` (e.g. `"/photos/andes.jpg"`), with a real `alt` and `caption`. Any number of photos works; the first one is shown large. Point `photography.cta.href` at the full gallery (Instagram, Flickr, etc.).
- **Competitions:** BCG, Itaú and Platanus Hack share one low-key timeline entry; expand only if useful.
- **Portrait:** add your photo to `public/` (e.g. `public/me.jpg`, 4:5 crop) and set `about.portrait.src` to `"/me.jpg"`.
- **Latest LinkedIn post:** the section shows the newest post from `npm run sync` (official API, run daily by the deploy workflow once `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_PERSON_URN` secrets exist), else the newest entry in `src/data/linkedin.json`. Until the API is approved, add a new post there (id, canonicalUrl, publishedAt, text, draft: false).
- **CV:** `cvUrl` in `src/data/site.json` is `null`. Add a public PDF URL when ready.
- **Hero imagery:** confirm any desired public attribution wording before launch.
