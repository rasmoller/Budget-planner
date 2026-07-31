import { CURRENCY_CONFIG, type Currency } from '$lib/types';

export function formatCurrency(amount: number, currency: Currency = 'DKK'): string {
	const config = CURRENCY_CONFIG[currency];
	return new Intl.NumberFormat(config.locale, {
		style: 'currency',
		currency: config.code,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(amount / 100);
}

export function parseCurrency(value: string): number {
	const cleaned = value.replace(/[^\d,-]/g, '').replace(',', '.');
	const num = parseFloat(cleaned);
	if (isNaN(num)) return 0;
	return Math.round(num * 100);
}

export function formatDKK(amount: number): string {
	return formatCurrency(amount, 'DKK');
}
