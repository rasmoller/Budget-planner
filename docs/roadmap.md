# Roadmap

> **Legend:** ✅ Done · 🚧 In progress · 📋 Planned · 💡 Future idea

---

## Next-Up (Check Before New Features)

Small gaps to close before starting new features:

| Item | Status | Notes |
|------|--------|-------|
| Overview year-view empty state | 📋 | `overview/+page.svelte` renders nothing when there are no categories/items; charts page already handles this via `hasData` + `noItems` |
| Planned tests (dialogs, types, DB schema) | 📋 | 7 tests planned in `docs/test-plan.md` |

---

## Cleanup Backlog (Deferred Refactors)

Refactors identified during repo cleanup but deferred — do these before starting new features:

| Item | Notes |
|------|-------|
| Merge `incomes` + `expenses` pages | Two 551-line pages that differ only by `type`; extract a shared `ItemListPage.svelte` (type prop) and make routes thin wrappers |
| Extract `ItemFormDialog.svelte` | Item add/edit form duplicated in `+page.svelte` and both item pages (type toggle, standard/one-time/variable selector, future-changes editor) |
| Extract `CategoryColorPicker.svelte` | Swatch grid + custom color input duplicated in `+page.svelte` and `categories/+page.svelte`; `defaultColors` array also duplicated |
| Extract `CurrencySelect.svelte` | Currency `<select>` duplicated in `ActionBar.svelte` and `+page.svelte` |
| Move month-nav helpers to `lib/utils/budget.ts` | `prevMonth`/`nextMonth`/`prevYear`/`nextYear` duplicated in charts + overview |
| Split `+layout.svelte` (634 lines) | Extract budget dialogs + JSON/CSV export/import logic into components/utils |
| Move displayCurrency localStorage init to layout | Repeated init block in 5 pages |

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
| Local IndexedDB storage | ✅ | Dexie with schema upgrades v1→v5 |

---

## Phase 2 — Charts Rework (🚧 In Progress)

See `docs/charts-rework-plan.md` for full details.

1. ✅ Month/Year toggle on charts page
2. ✅ Nested donut rework — replaced custom SVG with Chart.js; inner ring = categories, outer ring = income/expense sub-arcs (deviation: kept two rings instead of the planned single ring)
3. 📋 Line chart (category spending over time)
4. 📋 Two-column responsive page layout

---

## Phase 3 — High-Priority Features (✅ Complete)

| Feature | Priority | Description |
|---------|----------|-------------|
| **Search across income/expense** | Must | Search items across all categories |
| **Category checkboxes in charts** | ✅ Done | Toggle categories on/off in chart for better comparison |
| **One-time purchases** | ✅ Done | Single non-recurring expenses (e.g., a one-off purchase) |
| **Future-dated changes** | ✅ Done | Schedule changes in advance (e.g., "in 3 months I switch from SU to dagpenge") |

---

## Phase 4 — Should-Have Features (✅ Complete)

| Feature | Priority | Description |
|---------|----------|-------------|
| **Variable post** | ✅ Done | Items with variable amounts (e.g., grocery budgets that change month-to-month) — estimated amount used for planning, optional min/max range shown in the UI |

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
| **Test coverage** | ⚠️ 7 planned tests (`dialogs`, types, DB schema) — see `docs/test-plan.md` |
| **Exchange rates** | No error handling if the Frankfurter API is unreachable; `fetchExchangeRates` is called but failed requests are not handled |
| **Charts page** | Line chart not yet implemented; two-column layout pending |
| **Chart.js** | New dependency (~20-30 KB tree-shaken); center-text plugin and nested-dataset alignment are custom code that needs test coverage |
| **DB migrations** | Schema upgrades v1→v5 exist but are untested |
| **Search** | No search/filter UI for items |
