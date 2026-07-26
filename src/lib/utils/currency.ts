export function formatDKK(amount: number): string {
	return new Intl.NumberFormat('da-DK', {
		style: 'currency',
		currency: 'DKK',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount);
}

export function parseDKK(value: string): number {
	const cleaned = value.replace(/[^\d,-]/g, '').replace(',', '.');
	const num = parseFloat(cleaned);
	return isNaN(num) ? 0 : Math.round(num);
}
