import { writable, derived } from 'svelte/store';
import { budget } from './budget';
import { formatCurrency } from '$lib/utils/currency';
import { convertAmount } from '$lib/utils/exchangeRates';
import type { Currency, CategoryGroup } from '$lib/types';
import type { ExchangeRates } from '$lib/utils/exchangeRates';

export const exchangeRates = writable<ExchangeRates | null>(null);
export const displayCurrency = writable<Currency | null>(null);

export const effectiveCurrency = derived(
	[displayCurrency, budget],
	([$displayCurrency, $budget]) => $displayCurrency ?? $budget?.currency ?? 'DKK'
);

export function formatDisplay(
	amountInCents: number,
	budgetCurrency: Currency,
	displayCurr: Currency | null,
	rates: ExchangeRates | null
): string {
	const dc = displayCurr ?? budgetCurrency;
	if (dc === budgetCurrency || !rates) return formatCurrency(amountInCents, dc);
	const converted = convertAmount(amountInCents, budgetCurrency, dc, rates);
	return formatCurrency(converted, dc);
}

export function displayCurrencyLabel(displayCurr: Currency | null, budgetCurrency: Currency): string {
	return displayCurr ? displayCurr : `Auto (${budgetCurrency})`;
}

export function convertGroups(
	groups: CategoryGroup[],
	from: Currency,
	to: Currency,
	rates: ExchangeRates
): CategoryGroup[] {
	if (from === to) return groups;
	return groups.map((g) => ({
		...g,
		incomeTotal: convertAmount(g.incomeTotal, from, to, rates),
		expenseTotal: convertAmount(g.expenseTotal, from, to, rates),
		balance: convertAmount(g.balance, from, to, rates),
		items: g.items.map((item) => ({
			...item,
			amountInCents: convertAmount(item.amountInCents, from, to, rates)
		}))
	}));
}
