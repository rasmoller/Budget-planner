import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrency, formatDKK } from './currency';

describe('formatCurrency', () => {
	it('formats DKK with kr suffix and 2 decimals', () => {
		const result = formatCurrency(123400, 'DKK');
		expect(result).toContain('1.234');
		expect(result).toContain('kr');
		expect(result).toContain(',00');
	});

	it('formats USD with $ prefix and 2 decimals', () => {
		const result = formatCurrency(50000, 'USD');
		expect(result).toContain('$');
		expect(result).toContain('500');
		expect(result).toContain('.00');
	});

	it('formats EUR with 2 decimals', () => {
		const result = formatCurrency(100000, 'EUR');
		expect(result).toContain('1.000');
		expect(result).toContain(',00');
	});

	it('formats SEK with 2 decimals', () => {
		const result = formatCurrency(99900, 'SEK');
		expect(result).toContain('999');
	});

	it('formats NOK with 2 decimals', () => {
		const result = formatCurrency(75000, 'NOK');
		expect(result).toContain('750');
	});

	it('handles zero', () => {
		const result = formatCurrency(0, 'EUR');
		expect(result).toContain('0');
	});

	it('defaults to DKK when currency is omitted', () => {
		const result = formatCurrency(10000);
		expect(result).toContain('kr');
	});

	it('handles large numbers with 2 decimals', () => {
		const result = formatCurrency(100000000, 'USD');
		expect(result).toContain('$');
		expect(result).toContain('000.00');
	});

	it('formats small amounts correctly', () => {
		const result = formatCurrency(50, 'DKK');
		expect(result).toContain('0,50');
	});
});

describe('parseCurrency', () => {
	it('parses a simple integer string as whole krone', () => {
		expect(parseCurrency('1234')).toBe(123400);
	});

	it('parses Danish formatted input with comma decimal', () => {
		expect(parseCurrency('1234,56')).toBe(123456);
	});

	it('parses input with leading zero', () => {
		expect(parseCurrency('0')).toBe(0);
	});

	it('handles empty string', () => {
		expect(parseCurrency('')).toBe(0);
	});

	it('handles non-numeric string', () => {
		expect(parseCurrency('abc')).toBe(0);
	});

	it('converts dollar amount to cents', () => {
		expect(parseCurrency('$500')).toBe(50000);
	});

	it('converts kr formatted amount to øre', () => {
		expect(parseCurrency('1.234 kr.')).toBe(123400);
	});

	it('handles thousands separators', () => {
		expect(parseCurrency('1.234')).toBe(123400);
	});

	it('parses decimals only', () => {
		expect(parseCurrency(',50')).toBe(50);
	});

	it('parses whole number with two decimal places', () => {
		expect(parseCurrency('1500,99')).toBe(150099);
	});
});

describe('formatDKK', () => {
	it('formats amount as DKK with 2 decimals', () => {
		const result = formatDKK(50000);
		expect(result).toContain('500');
		expect(result).toContain('kr');
	});
});
