Site copy lives in `src/content/content.json` (validated by `src/content/schema.ts`).

# Still to do

- **Uber Eats impact (WIP):** the Work card "Strategy & Planning at Uber Eats" is a teaser. Develop the full story and decide which figures can be public.
- **Photography:** add images under `public/photos/` and set each entry's `src` in `photography.photos` (e.g. `"/photos/andes.jpg"`), with a real `alt` and `caption`. Any number of photos works; the first one is shown large. Point `photography.cta.href` at the full gallery (Instagram, Flickr, etc.).
- **Competitions:** BCG, Itaú and Platanus Hack share one low-key timeline entry; expand only if useful.
- **LinkedIn:** fold in anything from the profile not yet on the site. The API sync still needs an approved LinkedIn app; `src/data/linkedin.json` holds owner-curated posts if a writing section returns.
- **CV:** `cvUrl` in `src/data/site.json` is `null`. Add a public PDF URL when ready.
- **Hero imagery:** confirm any desired public attribution wording before launch.
