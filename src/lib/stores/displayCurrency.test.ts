import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatDisplay, convertGroups } from './displayCurrency';
import type { ExchangeRates } from '$lib/utils/exchangeRates';
import type { CategoryGroup } from '$lib/types';

const mockRates: ExchangeRates = {
	base: 'EUR',
	date: '2026-07-28',
	rates: { DKK: 7.4752, USD: 1.1367, SEK: 11.0625, NOK: 11.0055 }
};

describe('formatDisplay', () => {
	it('formats in budget currency when display currency matches', () => {
		const result = formatDisplay(123400, 'DKK', null, mockRates);
		expect(result).toContain('1.234');
		expect(result).toContain('kr');
	});

	it('converts and formats when display currency differs', () => {
		const result = formatDisplay(74752, 'DKK', 'EUR', mockRates);
		// 74752 DKK cents = 747.52 DKK → at 7.4752 rate = 100 EUR
		expect(result).toContain('100');
		expect(result).toContain('\u20ac');
	});

	it('formats in display currency when explicitly set to same', () => {
		const result = formatDisplay(50000, 'DKK', 'DKK', mockRates);
		expect(result).toContain('500');
		expect(result).toContain('kr');
	});

	it('falls back to display currency formatting when rates are null', () => {
		const result = formatDisplay(123400, 'USD', 'EUR', null);
		// No rates → just format in display currency without conversion
		expect(result).toContain('1.234');
		expect(result).toContain('\u20ac');
	});

	it('returns plain format when display is null (use budget currency)', () => {
		const result = formatDisplay(999900, 'SEK', null, mockRates);
		expect(result).toContain('999');
		expect(result).toContain('kr');
	});

	it('handles USD conversion from EUR', () => {
		const result = formatDisplay(100000, 'EUR', 'USD', mockRates);
		// 1000 EUR → at 1.1367 rate ≈ 1136.70 USD
		expect(result).toContain('1,136');
		expect(result).toContain('$');
	});
});

describe('convertGroups', () => {
	const groups: CategoryGroup[] = [
		{
			categoryId: 'c1',
			categoryName: 'Rent',
			categoryColor: '#ff0000',
			incomeTotal: 0,
			expenseTotal: 74752,
			balance: -74752,
			items: [
				{
					id: 'i1',
					budgetId: 'b1',
					categoryId: 'c1',
					type: 'expense',
					name: 'Rent',
					amountInCents: 74752,
					frequency: 'monthly',
					startDate: new Date('2026-01-01'),
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			]
		},
		{
			categoryId: 'c2',
			categoryName: 'Salary',
			categoryColor: '#00ff00',
			incomeTotal: 747520,
			expenseTotal: 0,
			balance: 747520,
			items: [
				{
					id: 'i2',
					budgetId: 'b1',
					categoryId: 'c2',
					type: 'income',
					name: 'Salary',
					amountInCents: 747520,
					frequency: 'monthly',
					startDate: new Date('2026-01-01'),
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			]
		}
	];

	it('returns same groups when currencies match', () => {
		const result = convertGroups(groups, 'DKK', 'DKK', mockRates);
		expect(result).toBe(groups);
	});

	it('converts all amounts when currencies differ', () => {
		const result = convertGroups(groups, 'DKK', 'EUR', mockRates);
		// 747.52 DKK / 7.4752 = 100 EUR
		expect(result[0].expenseTotal).toBe(10000);
		expect(result[0].balance).toBe(-10000);
		expect(result[0].items[0].amountInCents).toBe(10000);
		// 7475.20 DKK / 7.4752 = 1000 EUR
		expect(result[1].incomeTotal).toBe(100000);
		expect(result[1].balance).toBe(100000);
		expect(result[1].items[0].amountInCents).toBe(100000);
	});

	it('preserves category metadata', () => {
		const result = convertGroups(groups, 'DKK', 'USD', mockRates);
		expect(result[0].categoryName).toBe('Rent');
		expect(result[0].categoryColor).toBe('#ff0000');
		expect(result[0].categoryId).toBe('c1');
	});

	it('converts USD to DKK', () => {
		const dkkGroups: CategoryGroup[] = [
			{
				categoryId: 'c1',
				categoryName: 'Item',
				categoryColor: '#000',
				incomeTotal: 11367,
				expenseTotal: 0,
				balance: 11367,
				items: [
					{
						id: 'i1',
						budgetId: 'b1',
						categoryId: 'c1',
						type: 'income',
						name: 'Sale',
						amountInCents: 11367,
						frequency: 'monthly',
						startDate: new Date('2026-01-01'),
						isActive: true,
						createdAt: new Date(),
						updatedAt: new Date()
					}
				]
			}
		];
		// 113.67 USD → / 1.1367 = 100 EUR → * 7.4752 = 747.52 DKK
		const result = convertGroups(dkkGroups, 'USD', 'DKK', mockRates);
		expect(result[0].incomeTotal).toBe(74752);
		expect(result[0].items[0].amountInCents).toBe(74752);
	});

	it('handles empty groups', () => {
		const result = convertGroups([], 'DKK', 'EUR', mockRates);
		expect(result).toEqual([]);
	});
});
