Site copy lives in `src/content/content.json` (validated by `src/content/schema.ts`).

# Still to do

- **Uber Eats impact (WIP):** the Work card "Strategy & Planning at Uber Eats" is a teaser. Develop the full story and decide which figures can be public.
- **Photography:** add images under `public/photos/` and set each entry's `src` in `photography.photos` (e.g. `"/photos/andes.jpg"`), with a real `alt` and `caption`. Any number of photos works; the first one is shown large. Point `photography.cta.href` at the full gallery (Instagram, Flickr, etc.).
- **Competitions:** BCG, Itaú and Platanus Hack share one low-key timeline entry; expand only if useful.
- **Portrait:** add your photo to `public/` (e.g. `public/me.jpg`, 4:5 crop) and set `about.portrait.src` to `"/me.jpg"`.
- **Latest LinkedIn post:** the section shows the newest post from `npm run sync` (official API, run daily by the deploy workflow once `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_PERSON_URN` secrets exist), else the newest entry in `src/data/linkedin.json`. Until the API is approved, add a new post there (id, canonicalUrl, publishedAt, text, draft: false).
- **CV:** `cvUrl` in `src/data/site.json` is `null`. Add a public PDF URL when ready.
- **Hero imagery:** confirm any desired public attribution wording before launch.
- **Card (/card):** copy lives in `card` in `content.json`; the contact file (`/rodo-armas.vcf`) is generated from it and `src/data/site.json`. Personalise links with `?met=Event` (e.g. `rarmas.cl/card/?met=BCG`). After changing headlines or the card, run `npm run og` to refresh the link-preview images in `public/og/`.
- **Owner tools & stats:** open the private `rarmas.cl/card/?admin=<key>` link once per device (tools + stats); `?me` gives tools only. Stats are anonymous counts stored in the `rarmas-stats` Supabase project (`card_events`, insert-only for the public; totals via the key-protected `card_stats` function). `npm run cv` rebuilds the CV PDF from `scripts/cv/cv.json`.
