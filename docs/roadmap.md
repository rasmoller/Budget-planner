# Roadmap

> **Legend:** ✅ Done · 🚧 In progress · 📋 Planned · 💡 Future idea

---

## Next-Up (Check Before New Features)

Small gaps to close before starting new features:

| Item | Status | Notes |
|------|--------|-------|
| Overview year-view empty state | 📋 | `overview/+page.svelte` renders nothing when there are no categories/items; charts page already handles this via `hasData` + `noItems` |
| Tests for new shared code | 📋 | `viewMode.ts`, `ActionBar.svelte`, `NestedDonut.svelte`, `SummaryCards.svelte` are untested and missing from `docs/test-plan.md` |
| `ui.test.ts` plan (5 tests) | 📋 | Planned in test-plan but never written (`toggleLanguage`, `setLanguage`, `toggleCategory`) |

---

## Phase 1 — Core Features (✅ Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-budget CRUD (create, switch, duplicate, rename, archive, unarchive, delete) | ✅ | Cascade delete for categories + items |
| Categories (add, update, delete, duplicate, reorder) | ✅ | Drag-and-drop reordering |
| Recurring items (add, update, delete, duplicate) | ✅ | Daily/weekly/monthly/yearly frequencies |
| Overview page (year view) | ✅ | Summary cards + expandable category/items drill-down |
| Overview page (month view) | ✅ | Month navigation, per-category breakdown |
| Charts page (nested donut) | ✅ | Chart.js-based; inner ring = categories, outer ring = income/expense sub-arcs |
| Currency formatting (DKK, EUR, USD, SEK, NOK) | ✅ | `Intl.NumberFormat`-based |
| Currency conversion + display currency selector | ✅ | Exchange rates via Frankfurter API |
| Export/Import (JSON/CSV) | ✅ | — |
| Dark mode | ✅ | `prefers-color-scheme` |
| Bilingual (DA/EN) | ✅ | Svelte store-based i18n |
| Local IndexedDB storage | ✅ | Dexie with schema upgrades v1→v2→v3 |

---

## Phase 2 — Charts Rework (🚧 In Progress)

See `docs/charts-rework-plan.md` for full details.

1. ✅ Month/Year toggle on charts page
2. ✅ Nested donut rework — replaced custom SVG with Chart.js; inner ring = categories, outer ring = income/expense sub-arcs (deviation: kept two rings instead of the planned single ring)
3. 📋 Line chart (category spending over time)
4. 📋 Two-column responsive page layout

---

## Phase 3 — High-Priority Features (📋 Planned)

From `TODO.md` — **Must** priority:

| Feature | Priority | Description |
|---------|----------|-------------|
| **Search across income/expense** | Must | Search items across all categories |
| **Category checkboxes in charts** | ✅ Done | Toggle categories on/off in chart for better comparison |
| **One-time purchases** | Must | Single non-recurring expenses (e.g., a one-off purchase) |
| **Future-dated changes** | Must | Schedule changes in advance (e.g., "in 3 months I switch from SU to dagpenge") |

---

## Phase 4 — Should-Have Features (💡 Planned)

| Feature | Priority | Description |
|---------|----------|-------------|
| **Variable post** | Should | Items with variable amounts (e.g., grocery budgets that change month-to-month) |

---

## Phase 5 — Future Ideas (💡 Future)

From `charts-rework-plan.md`:

- Customizable dashboard with widgets (add/remove/reorder)
- Budget comparisons (2+ budgets side-by-side)
- Date range filtering
- Drill-down from charts into items

---

## Known Gaps & Potential Issues

| Area | Issue |
|------|-------|
| **Test coverage** | ⚠️ 37 planned tests — see `docs/test-plan.md` |
| **Exchange rates** | No error handling if the Frankfurter API is unreachable; `fetchExchangeRates` is called but failed requests are not handled |
| **Charts page** | Line chart not yet implemented; two-column layout pending |
| **Chart.js** | New dependency (~20-30 KB tree-shaken); center-text plugin and nested-dataset alignment are custom code that needs test coverage |
| **DB migrations** | Schema upgrades v1→v2→v3 exist but are untested |
| **One-time purchases** | Schema has no `isOneTime` or `date` field for one-off items |
| **Future-dated changes** | No mechanism for scheduling future start-date/amount changes |
| **Variable amounts** | No `min`/`max` or `estimated` field on items |
| **Search** | No search/filter UI for items |
