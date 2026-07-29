# Charts Page Rework Plan

## Current State

The charts page (`/charts`) currently has:
- A single nested donut chart (custom SVG) showing category income vs expenses for a selected month
- Month navigation (prev/next)
- A summary table below the chart with per-category income/expense/balance

## Proposed Changes

### 1. Advanced Pie Chart (Donut) — Replace Current Chart

The current nested donut has two rings: inner = category totals, outer = income/expense split. This is confusing because the outer ring colors don't map clearly to income vs expense.

**New design:**
- Single-level donut chart where each slice represents a category
- Each category slice is subdivided into two sub-slices: **income** and **expense**
- Sub-slices inherit the category color but use two variants:
  - Income: full opacity / lighter shade
  - Expense: slightly darker or with a subtle pattern/border
- On hover: highlight the category, show breakdown in center (category name, income amount, expense amount, net balance)
- Keep the legend below the chart

**Implementation:**
- Modify `src/lib/components/charts/NestedDonut.svelte` to use a single ring with sub-arcs
- Each category gets one arc span proportional to `incomeTotal + expenseTotal`
- Within that span, income occupies `income / total` of the arc, expense occupies the rest
- Use opacity/shade variation instead of separate rings to keep it readable

### 2. Line Chart — Category Spending Over Time

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

### 3. Month / Year Toggle

Add a toggle (pill buttons or segmented control) at the top of the charts page:

```
[ Months | Years ]
```

- **Months mode (default):** Charts show data for each month of the current year. Line chart X-axis = 12 months. Pie chart = selected month.
- **Years mode:** Charts show data aggregated per year over a multi-year range. Line chart X-axis = years. Pie chart = selected year.

The toggle affects:
- The pie/donut chart (which time period it summarizes)
- The line chart (X-axis granularity)
- The summary table (monthly vs yearly totals)

**Year navigation:** In both modes, add prev/next year navigation (already exists for the overview page).

### 4. Page Layout

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

1. **Month/Year toggle** — Add to existing charts page, pass to `calculateMonthSummary`
2. **Refactor NestedDonut** — Rework to single-ring with income/expense sub-arcs
3. **Line chart component** — New SVG component, category lines over time
4. **Page layout redesign** — Two-column responsive grid for charts
5. **(Future) Widget system** — Customizable dashboard with add/remove/reorder
6. **(Future) Budget comparisons** — Multi-budget data loading and overlay
