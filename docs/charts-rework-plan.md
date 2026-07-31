# Charts Page Rework Plan

## Current State

The charts page (`/charts`) currently has:
- A nested donut chart built with **Chart.js** (`chart.js` + `svelte-chartjs`)
  - Inner ring: one arc per category (total = income + expense)
  - Outer ring: income/expense sub-arcs per category (same color as the inner ring category)
  - Spacer dataset creates a gap between the rings; `spacing: 3` separates individual arcs
  - Center-text plugin shows hovered slice details or the grand total
- Month/Year toggle (shared `viewMode` store with the overview page)
- Month/year navigation + currency selector (shared `ActionBar` component)
- A summary table below the chart with per-category income/expense/balance and checkboxes to toggle categories

## Remaining Work

### 1. Line Chart — Category Spending Over Time

**New component:** `src/lib/components/charts/CategoryLineChart.svelte`

- X-axis: months (or years, based on toggle)
- Y-axis: amount in budget currency
- One line per category, colored with the category's color
- Each data point = the category's total for that month (income + expense, or optionally broken into two lines per category)
- Tooltip on hover showing exact amounts
- Legend showing which color maps to which category

**Data source:**
- Reuse `calculateMonthSummary()` for each month in the selected range
- Group by category across all months
- For year view: aggregate all months in the year per category

**Interactions:**
- Click a category in the legend to toggle its visibility
- Hover to see a vertical crosshair with values for all visible categories

### 2. Page Layout

Redesign the charts page as a scrollable dashboard of chart cards:

```
┌─────────────────────────────────────────┐
│  Charts          [Months | Years]       │
│         ← 2026 →                        │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │  Summary Cards (Income/Exp/Bal)   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌──────────────────┬────────────────┐  │
│  │                  │                │  │
│  │   Pie / Donut    │  Line Chart    │  │
│  │   Chart          │                │  │
│  │                  │                │  │
│  └──────────────────┴────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Category Breakdown Table         │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

On smaller screens, the pie and line chart stack vertically.

---

## Done

- ✅ **Month/Year toggle** — shared `viewMode` store with the overview page
- ✅ **Nested donut rework** — replaced custom SVG with Chart.js; kept the two-ring design (inner = categories, outer = income/expense sub-arcs) rather than the planned single ring

---

## Future: Customizable Dashboard (FUTURE)

Turn the charts page into a fully customizable dashboard where users can:

### Add / Remove / Rearrange Widgets

- Each chart is a "widget" that can be added, removed, or reordered via drag-and-drop
- Widget types:
  - **Pie/Donut chart** (as described above)
  - **Line chart** (as described above)
  - **Bar chart** (total income vs expenses per month)
  - **Summary card** (single metric: total income, total expenses, savings rate, etc.)
  - **Comparison table** (side-by-side monthly breakdown)
- Users choose which widgets to display and in what order
- Layout saved to localStorage (per budget)

### Budget Comparisons

- Allow selecting 2+ budgets to compare side-by-side
- Overlay line charts from different budgets on the same axes
- Side-by-side pie charts for the same month across budgets
- Stacked bar charts showing each budget's contribution

### Filter and Drill-Down

- Filter by date range (not just whole months/years)
- Click a category in any chart to drill into its individual items
- Click an item to see its monthly trend

### Implementation Notes

- Store widget layout in a new `dashboard` table in Dexie (or in localStorage)
- Each widget config: `{ id, type, position, config: { ... } }`
- Use a grid library (e.g., `svelte-grid`) or CSS grid with drag-and-drop for layout
- Budget comparison requires loading data from multiple budgets simultaneously
  - Need a `loadMultiple(budgetIds[])` method on stores
  - Or load into a separate "comparison" store

---

## Implementation Order

1. ✅ **Month/Year toggle** — Shared `viewMode` store, added to overview + charts
2. ✅ **NestedDonut rework** — Chart.js, two-ring with income/expense sub-arcs
3. **Line chart component** — Category lines over time (up next)
4. **Page layout redesign** — Two-column responsive grid for charts
5. **(Future) Widget system** — Customizable dashboard with add/remove/reorder
6. **(Future) Budget comparisons** — Multi-budget data loading and overlay
