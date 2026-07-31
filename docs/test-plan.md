# Test Plan

## Status at a Glance

| Area | planned | begun | fully implemented |
|------|---------|-------|-------------------|
| **Utils: currency** | 0 | 0 | **19** ✅ |
| **Utils: budget** | 0 | 0 | **27** ✅ |
| Utils: exchangeRates | **10** | 0 | 0 |
| Utils: validation | **15** | 0 | 0 |
| **Stores: budget** | 0 | 0 | **22** ✅ |
| **Stores: displayCurrency** | 0 | 0 | **11** ✅ |
| Stores: ui | **5** | 0 | 0 |
| Stores: dialogs | **2** | 0 | 0 |
| Types | **2** | 0 | 0 |
| DB | **3** | 0 | 0 |
| **Total** | **37** | **0** | **79** ✅ |

## Next Step

**Write `exchangeRates.test.ts`** — it's the largest untested module and already imported by the displayCurrency tests. 10 tests planned.

---

## Utils

### `currency.test.ts` — fully implemented (19)

`formatCurrency`, `parseCurrency`, `formatDKK`

### `budget.test.ts` — fully implemented (27)

`getMonthlyAmount`, `getMonthKey`, `getMonthNumber`, `getYearFromKey`, `generateMonthKeys`, `isItemActiveInMonth`, `isIncomeItem`/`isExpenseItem`, `calculateMonthSummary`

### `exchangeRates.test.ts` — planned (10)

- `fetchExchangeRates` returns expected structure
- `convertAmount`: same currency, EUR→DKK, DKK→EUR, USD→DKK, rounding
- `getRate`: same currency, direct rate, inverse rate, cross rate

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

### `ui.test.ts` — planned (5)

`toggleLanguage`, `setLanguage`, `toggleCategory` (add, remove, no cross-talk)

### `dialogs.test.ts` — planned (2)

`openAllBudgets` initial value, increment

---

## Types

### `types/index.test.ts` — planned (2)

`isUncategorized` true/false

---

## DB

### `schema.test.ts` — planned (3)

Create schema, v1→v2 upgrade, v2→v3 upgrade
