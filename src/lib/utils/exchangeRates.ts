import type { Currency } from '$lib/types';

export interface ExchangeRates {
	base: string;
	date: string;
	rates: Record<string, number>;
}

const SUPPORTED_CURRENCIES: Currency[] = ['DKK', 'EUR', 'USD', 'SEK', 'NOK'];

export async function fetchExchangeRates(): Promise<ExchangeRates> {
	const symbols = SUPPORTED_CURRENCIES.filter((c) => c !== 'EUR').join(',');
	const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=EUR&symbols=${symbols}`);
	return res.json();
}

export function convertAmount(
	amountInCents: number,
	from: Currency,
	to: Currency,
	rates: ExchangeRates
): number {
	if (from === to) return amountInCents;

	const rateFrom = from === 'EUR' ? 1 : 1 / rates.rates[from];
	const rateTo = to === 'EUR' ? 1 : rates.rates[to];

	const converted = (amountInCents / 100) * (rateFrom * rateTo);
	return Math.round(converted * 100);
}

export function getRate(base: Currency, target: Currency, rates: ExchangeRates): number {
	if (base === target) return 1;
	if (base === 'EUR') return rates.rates[target];
	if (target === 'EUR') return 1 / rates.rates[base];
	return rates.rates[target] / rates.rates[base];
}
