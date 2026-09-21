# Test Plan

## Status at a Glance

| Area | planned | begun | fully implemented |
|------|---------|-------|-------------------|
| **Utils: currency** | 0 | 0 | **19** ✅ |
| **Utils: budget** | 0 | 0 | **47** ✅ |
| **Utils: exchangeRates** | 0 | 0 | **10** ✅ |
| **Utils: validation** | 0 | 0 | **9** ✅ |
| **Stores: budget** | 0 | 0 | **25** ✅ |
| **Stores: displayCurrency** | 0 | 0 | **11** ✅ |
| **Stores: viewMode** | 0 | 0 | **3** ✅ |
| Stores: dialogs | **2** | 0 | 0 |
| **Components: ActionBar** | 0 | 0 | **6** ✅ |
| **Components: SummaryCards** | 0 | 0 | **5** ✅ |
| **Components: NestedDonut** | 0 | 0 | **4** ✅ |
| **Routes: budget page** | 0 | 0 | **3** ✅ |
| Types | **2** | 0 | 0 |
| DB | **3** | 0 | 0 |
| **Total** | **7** | **0** | **142** ✅ |

## Next Step

**Write the remaining planned tests** — `dialogs.test.ts` (2), `types/index.test.ts` (2), `schema.test.ts` (3) = 7 tests.

---

## Utils

### `currency.test.ts` — fully implemented (19)

`formatCurrency`, `parseCurrency`

### `budget.test.ts` — fully implemented (47)

`getMonthlyAmount`, `getMonthKey`, `generateMonthKeys`, `isItemActiveInMonth`, `getEffectiveItem`, `getItemAmountRange`, `getMonthlyAmountRange`, `isVariableItem`, `calculateMonthSummary`

### `exchangeRates.test.ts` — fully implemented (10)

`fetchExchangeRates` (1), `convertAmount` (5), `getRate` (4)

### `validation.test.ts` — fully implemented (9)

`validateName` (4), `validateAmount` (5)

---

## Stores

### `budget.test.ts` — fully implemented (25)

Budget (11): `load`, `create`, `switchTo`, `duplicate`, `archive`, `unarchive`, `updateCurrency`, `updateName`, `remove`

Categories (8): `load`, `add`, `update`, `duplicate`, `remove`, `reorder`

RecurringItems (6): `load`, `add`, `update`, `duplicate`, `remove`

### `displayCurrency.test.ts` — fully implemented (11)

`formatDisplay` (6), `convertGroups` (5)

### `viewMode.test.ts` — fully implemented (3)

`viewMode` defaults to `'month'`, switch to `'year'`, switch back

### `dialogs.test.ts` — planned (2)

`openAllBudgets` initial value, increment

---

## Components

### `ActionBar.test.ts` — fully implemented (6)

Month/year navigation, view-mode toggle buttons, currency selector

### `SummaryCards.test.ts` — fully implemented (5)

Income/expense/balance totals, page links, positive/negative balance colors

### `NestedDonut.test.ts` — fully implemented (4)

Inner-ring entries, spacer dataset, outer-ring income/expense arcs, zero-total omission

---

## Routes

### `budget-page.test.ts` — fully implemented (3)

Delete buttons for income/expense items on the dashboard page

---

## Types

### `types/index.test.ts` — planned (2)

`isUncategorized` true/false

---

## DB

### `schema.test.ts` — planned (3)

Create schema, v1→v2 upgrade, v2→v3 upgrade
