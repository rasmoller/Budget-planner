# Project Plan — Budget Planner

## Goal

A personal budget planning tool that tracks recurring income and expenses, stores everything locally in the browser via IndexedDB, and displays the data through an overview dashboard, charts, and per-category/month/year breakdowns. Built with SvelteKit and deployable to Cloudflare Workers.

## Core Features

- **Multi-budget support** — create, switch, duplicate, archive, and delete budgets
- **Recurring items** — income/expense entries with daily/weekly/monthly/yearly frequencies normalized to monthly equivalents
- **Categories** — color-coded groups for items, with drag-and-drop reordering
- **Overview page** — year and month views with summary cards and expandable drill-down
- **Charts page** — donut chart (category income vs expense) with line chart for trends over time; month/year toggle
- **Currency conversion** — display amounts in any supported currency with live exchange rates
- **Export/Import** — budgets as JSON/CSV
- **Dark mode** — automatic via `prefers-color-scheme`
- **Bilingual** — Danish and English

## Tech Stack

SvelteKit + Svelte 5, Tailwind CSS v4, Dexie (IndexedDB), Cloudflare Workers, TypeScript, Vitest

## Pages

| Route | Page |
|-------|------|
| `/` | Home / dashboard |
| `/overview` | Year & month overview with category drill-down |
| `/incomes` | Income items management |
| `/expenses` | Expense items management |
| `/categories` | Category management with reorder |
| `/charts` | Donut chart + line chart with month/year toggle |

## State of the Project

All core features are built and working. The `charts-rework-plan.md` outlines a future rework of the charts page (single-ring donut, line chart, month/year toggle, new layout).

## Key Documents

- **`docs/test-plan.md`** — test status and next steps (read this first)
- **`docs/charts-rework-plan.md`** — planned charts page rework
- **`TODO.md`** — feature backlog (MoSCoW)
