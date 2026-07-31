# Test Plan

## Status at a Glance

| Area | planned | begun | fully implemented |
|------|---------|-------|-------------------|
| **Utils: currency** | 0 | 0 | **19** ✅ |
| **Utils: budget** | 0 | 0 | **27** ✅ |
| **Utils: exchangeRates** | 0 | 0 | **10** ✅ |
| Utils: validation | **15** | 0 | 0 |
| **Stores: budget** | 0 | 0 | **22** ✅ |
| **Stores: displayCurrency** | 0 | 0 | **11** ✅ |
| **Stores: ui** | 0 | 0 | **5** ✅ |
| **Stores: viewMode** | 0 | 0 | **3** ✅ |
| Stores: dialogs | **2** | 0 | 0 |
| **Components: ActionBar** | 0 | 0 | **6** ✅ |
| **Components: SummaryCards** | 0 | 0 | **5** ✅ |
| **Components: NestedDonut** | 0 | 0 | **4** ✅ |
| Types | **2** | 0 | 0 |
| DB | **3** | 0 | 0 |
| **Total** | **22** | **0** | **112** ✅ |

## Next Step

**Write `validation.test.ts`** — the largest remaining untested module. 15 tests planned.

---

## Utils

### `currency.test.ts` — fully implemented (19)

`formatCurrency`, `parseCurrency`, `formatDKK`

### `budget.test.ts` — fully implemented (27)

`getMonthlyAmount`, `getMonthKey`, `getMonthNumber`, `getYearFromKey`, `generateMonthKeys`, `isItemActiveInMonth`, `isIncomeItem`/`isExpenseItem`, `calculateMonthSummary`

### `exchangeRates.test.ts` — fully implemented (10)

`fetchExchangeRates` (1), `convertAmount` (5), `getRate` (4)

### `validation.test.ts` — planned (15)

- `validateName`: empty, whitespace, over 100 chars, valid
- `validateAmount`: NaN, zero, negative, non-integer, valid
- `validateRequired`: empty, valid
- `runValidators`: collects errors, empty when none
- `hasErrors`: true when errors, false when none

---

## Stores

### `budget.test.ts` — fully implemented (22)

Budget (11): `load`, `create`, `switchTo`, `duplicate`, `archive`, `unarchive`, `updateCurrency`, `updateName`, `remove`

Categories (7): `load`, `add`, `update`, `duplicate`, `remove`, `reorder`

RecurringItems (6): `load`, `add`, `update`, `duplicate`, `remove`

### `displayCurrency.test.ts` — fully implemented (11)

`formatDisplay` (6), `convertGroups` (5)

### `ui.test.ts` — fully implemented (5)

`toggleLanguage`, `setLanguage`, `toggleCategory` (add, remove, no cross-talk)

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

## Types

### `types/index.test.ts` — planned (2)

`isUncategorized` true/false

---

## DB

### `schema.test.ts` — planned (3)

Create schema, v1→v2 upgrade, v2→v3 upgrade
