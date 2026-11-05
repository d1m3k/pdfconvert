# PdftConvert — demo (GitHub Pages)

Astro demo of the client-side file-tools site: every tool runs 100% in the
visitor's browser (no uploads, no server). Demo deployment target:
https://d1m3k.github.io/pdfconvert/

Working tools in this demo: Merge PDF, Image to PDF, Compress Image —
plus About, Privacy Policy, Terms, and a Blog with one sample article.

## Deployment (GitHub Pages via Actions)

1. Repo Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. The workflow file `.github/workflows/deploy.yml` must be created through the
   GitHub web UI (the API connection used by the maintainer's assistant cannot
   write workflow files). Its content is maintained locally alongside this repo.

After that, every push to `main` builds and deploys automatically.

## Local development

```bash
npm install
npm run dev     # local preview
npm run build   # production build into dist/
```

Brand name, tagline and the tool catalogue live in `src/config/site.ts`.
