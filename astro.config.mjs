import { defineConfig } from 'astro/config';

// Demo deployment: GitHub Pages project site at https://d1m3k.github.io/pdfconvert/
// When the production domain is chosen, `site` and `base` are the only two lines that change.
export default defineConfig({
  site: 'https://d1m3k.github.io',
  base: '/pdfconvert',
  build: { format: 'file' },
  trailingSlash: 'ignore',
});
