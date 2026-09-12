import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://rarmas.cl',
  output: 'static',
  integrations: [sitemap()],
});
