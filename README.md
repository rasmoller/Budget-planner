# Budget Planner

A personal budget planning tool for tracking recurring income and expenses. Built with SvelteKit and deployed as a Cloudflare Worker. All data is stored locally in the browser via IndexedDB.

## Features

- **Multi-budget support** — Create and switch between multiple budgets (e.g., per household or scenario)
- **Recurring items** — Track income and expenses with daily, weekly, monthly, or yearly frequencies, normalized to monthly equivalents
- **Categories** — Organize items into color-coded categories with drag-and-drop reordering
- **Dashboard** — Monthly overview with income/expense summaries and expandable category sections
- **Year & month overview** — Drill-down view with per-category and per-item breakdowns across all months
- **Charts** — Custom nested donut chart visualizing category-level income vs. expense splits
- **Export / Import** — Export budgets as JSON or CSV; import JSON backups
- **Dark mode** — Automatic dark mode via `prefers-color-scheme`
- **Bilingual** — Danish and English language support

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) + [Svelte 5](https://svelte.dev/) (runes mode)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Dexie](https://dexie.org/) (IndexedDB wrapper)
- [Cloudflare Workers](https://workers.cloudflare.com/) (deployment)
- TypeScript

## Getting Started

```sh
npm install
npm run dev
```

The app opens at `http://localhost:5173`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Build and preview locally via Wrangler |
| `npm run check` | Run type checking |
| `npm run deploy` | Build and deploy to Cloudflare |
