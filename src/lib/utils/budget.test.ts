import { describe, it, expect } from 'vitest';
import {
	getMonthlyAmount,
	getMonthKey,
	getMonthNumber,
	getYearFromKey,
	generateMonthKeys,
	isItemActiveInMonth,
	isIncomeItem,
	isExpenseItem,
	calculateMonthSummary
} from './budget';
import type { RecurringItem } from '$lib/types';

function makeItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
	return {
		id: 'test-id',
		budgetId: 'budget-1',
		categoryId: 'cat-1',
		type: 'expense',
		name: 'Test Item',
		amountInCents: 100000,
		frequency: 'monthly',
		startDate: new Date('2026-01-01'),
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

describe('getMonthlyAmount', () => {
	it('returns amount unchanged for monthly frequency', () => {
		const item = makeItem({ amountInCents: 100000, frequency: 'monthly' });
		expect(getMonthlyAmount(item)).toBe(100000);
	});

	it('multiplies daily amount by 30', () => {
		const item = makeItem({ amountInCents: 10000, frequency: 'daily' });
		expect(getMonthlyAmount(item)).toBe(300000);
	});

	it('multiplies weekly amount by 4.33', () => {
		const item = makeItem({ amountInCents: 200000, frequency: 'weekly' });
		expect(getMonthlyAmount(item)).toBeCloseTo(866000, 0);
	});

	it('divides yearly amount by 12', () => {
		const item = makeItem({ amountInCents: 1200000, frequency: 'yearly' });
		expect(getMonthlyAmount(item)).toBe(100000);
	});

	it('handles zero amount', () => {
		const item = makeItem({ amountInCents: 0, frequency: 'monthly' });
		expect(getMonthlyAmount(item)).toBe(0);
	});

	it('returns full amount for one-time items regardless of frequency', () => {
		const item = makeItem({ isOneTime: true, amountInCents: 250000, frequency: 'yearly' });
		expect(getMonthlyAmount(item)).toBe(250000);
	});
});

describe('getMonthKey', () => {
	it('formats date as YYYY-MM', () => {
		expect(getMonthKey(new Date('2026-07-15'))).toBe('2026-07');
	});

	it('zero-pads single-digit months', () => {
		expect(getMonthKey(new Date('2026-01-01'))).toBe('2026-01');
	});

	it('handles December', () => {
		expect(getMonthKey(new Date('2026-12-31'))).toBe('2026-12');
	});
});

describe('getMonthNumber', () => {
	it('returns 0-indexed month from key', () => {
		expect(getMonthNumber('2026-01')).toBe(0);
		expect(getMonthNumber('2026-07')).toBe(6);
		expect(getMonthNumber('2026-12')).toBe(11);
	});
});

describe('getYearFromKey', () => {
	it('extracts year from key', () => {
		expect(getYearFromKey('2026-07')).toBe(2026);
		expect(getYearFromKey('2025-01')).toBe(2025);
	});
});

describe('generateMonthKeys', () => {
	it('generates 12 month keys for a given year', () => {
		const keys = generateMonthKeys(2026);
		expect(keys).toHaveLength(12);
		expect(keys[0]).toBe('2026-01');
		expect(keys[11]).toBe('2026-12');
	});

	it('each key is unique', () => {
		const keys = generateMonthKeys(2026);
		const unique = new Set(keys);
		expect(unique.size).toBe(12);
	});
});

describe('isItemActiveInMonth', () => {
	it('returns true for item starting before the month', () => {
		const item = makeItem({ startDate: new Date('2026-01-01'), isActive: true });
		expect(isItemActiveInMonth(item, '2026-06')).toBe(true);
	});

	it('returns true for item starting in the same month', () => {
		const item = makeItem({ startDate: new Date('2026-06-15'), isActive: true });
		expect(isItemActiveInMonth(item, '2026-06')).toBe(true);
	});

	it('returns false for item starting after the month', () => {
		const item = makeItem({ startDate: new Date('2026-07-01'), isActive: true });
		expect(isItemActiveInMonth(item, '2026-06')).toBe(false);
	});

	it('returns false for inactive items', () => {
		const item = makeItem({ startDate: new Date('2026-01-01'), isActive: false });
		expect(isItemActiveInMonth(item, '2026-06')).toBe(false);
	});

	it('handles year boundary crossing', () => {
		const item = makeItem({ startDate: new Date('2025-12-01'), isActive: true });
		expect(isItemActiveInMonth(item, '2026-01')).toBe(true);
	});

	it('returns true for a one-time item in the month of its date', () => {
		const item = makeItem({ isOneTime: true, date: new Date('2026-06-15'), isActive: true });
		expect(isItemActiveInMonth(item, '2026-06')).toBe(true);
	});

	it('returns false for a one-time item outside the month of its date', () => {
		const item = makeItem({ isOneTime: true, date: new Date('2026-06-15'), isActive: true });
		expect(isItemActiveInMonth(item, '2026-05')).toBe(false);
		expect(isItemActiveInMonth(item, '2026-07')).toBe(false);
	});

	it('returns false for an inactive one-time item', () => {
		const item = makeItem({ isOneTime: true, date: new Date('2026-06-15'), isActive: false });
		expect(isItemActiveInMonth(item, '2026-06')).toBe(false);
	});
});

describe('isIncomeItem / isExpenseItem', () => {
	it('isIncomeItem returns true for income type', () => {
		expect(isIncomeItem(makeItem({ type: 'income' }))).toBe(true);
		expect(isIncomeItem(makeItem({ type: 'expense' }))).toBe(false);
	});

	it('isExpenseItem returns true for expense type', () => {
		expect(isExpenseItem(makeItem({ type: 'expense' }))).toBe(true);
		expect(isExpenseItem(makeItem({ type: 'income' }))).toBe(false);
	});
});

describe('calculateMonthSummary', () => {
	const categories = [
		{ id: 'cat-1', name: 'Bolig', color: '#ef4444' },
		{ id: 'cat-2', name: 'Mad', color: '#22c55e' }
	];

	it('returns empty summary when no items are active', () => {
		const summary = calculateMonthSummary([], categories, '2026-06');
		expect(summary.totalIncome).toBe(0);
		expect(summary.totalExpenses).toBe(0);
		expect(summary.balance).toBe(0);
		expect(summary.categories).toEqual([]);
	});

	it('aggregates expenses by category', () => {
		const items = [
			makeItem({ categoryId: 'cat-1', type: 'expense', amountInCents: 500000, frequency: 'monthly' }),
			makeItem({ categoryId: 'cat-2', type: 'expense', amountInCents: 300000, frequency: 'monthly' })
		];
		const summary = calculateMonthSummary(items, categories, '2026-06');
		expect(summary.totalExpenses).toBe(800000);
		expect(summary.totalIncome).toBe(0);
		expect(summary.balance).toBe(-800000);
	});

	it('separates income and expense totals', () => {
		const items = [
			makeItem({ categoryId: 'cat-1', type: 'income', amountInCents: 3000000, frequency: 'monthly' }),
			makeItem({ categoryId: 'cat-2', type: 'expense', amountInCents: 500000, frequency: 'monthly' })
		];
		const summary = calculateMonthSummary(items, categories, '2026-06');
		expect(summary.totalIncome).toBe(3000000);
		expect(summary.totalExpenses).toBe(500000);
		expect(summary.balance).toBe(2500000);
	});

	it('groups items by category with correct totals', () => {
		const items = [
			makeItem({ categoryId: 'cat-1', type: 'income', amountInCents: 3000000, frequency: 'monthly' }),
			makeItem({ categoryId: 'cat-1', type: 'expense', amountInCents: 800000, frequency: 'monthly' }),
			makeItem({ categoryId: 'cat-2', type: 'expense', amountInCents: 300000, frequency: 'monthly' })
		];
		const summary = calculateMonthSummary(items, categories, '2026-06');

		const bolig = summary.categories.find((g) => g.categoryId === 'cat-1');
		expect(bolig).toBeDefined();
		expect(bolig!.incomeTotal).toBe(3000000);
		expect(bolig!.expenseTotal).toBe(800000);
		expect(bolig!.balance).toBe(2200000);

		const mad = summary.categories.find((g) => g.categoryId === 'cat-2');
		expect(mad).toBeDefined();
		expect(mad!.incomeTotal).toBe(0);
		expect(mad!.expenseTotal).toBe(300000);
		expect(mad!.balance).toBe(-300000);
	});

	it('handles yearly frequency conversion', () => {
		const items = [
			makeItem({ categoryId: 'cat-1', type: 'expense', amountInCents: 1200000, frequency: 'yearly' })
		];
		const summary = calculateMonthSummary(items, categories, '2026-06');
		expect(summary.totalExpenses).toBe(100000);
	});

	it('includes category name and color from lookup', () => {
		const items = [
			makeItem({ categoryId: 'cat-1', type: 'expense', amountInCents: 100000, frequency: 'monthly' })
		];
		const summary = calculateMonthSummary(items, categories, '2026-06');
		const group = summary.categories[0];
		expect(group.categoryName).toBe('Bolig');
		expect(group.categoryColor).toBe('#ef4444');
	});

	it('handles uncategorized items', () => {
		const items = [
			makeItem({ categoryId: 'uncategorized', type: 'expense', amountInCents: 50000, frequency: 'monthly' })
		];
		const summary = calculateMonthSummary(items, categories, '2026-06');
		const group = summary.categories[0];
		expect(group.categoryName).toBe('Ingen kategori');
		expect(group.categoryColor).toBe('#9ca3af');
	});

	it('filters out items not active in the given month', () => {
		const items = [
			makeItem({ categoryId: 'cat-1', startDate: new Date('2026-07-01'), type: 'expense', amountInCents: 100000, frequency: 'monthly' })
		];
		const summary = calculateMonthSummary(items, categories, '2026-06');
		expect(summary.totalExpenses).toBe(0);
	});

	it('sets correct month metadata', () => {
		const summary = calculateMonthSummary([], categories, '2026-06');
		expect(summary.month).toBe('2026-06');
		expect(summary.year).toBe(2026);
		expect(summary.monthNumber).toBe(5);
	});

	it('counts a one-time item at full amount only in its month', () => {
		const item = makeItem({
			categoryId: 'cat-1',
			type: 'expense',
			amountInCents: 500000,
			isOneTime: true,
			date: new Date('2026-06-20')
		});
		const inMonth = calculateMonthSummary([item], categories, '2026-06');
		expect(inMonth.totalExpenses).toBe(500000);

		const otherMonth = calculateMonthSummary([item], categories, '2026-07');
		expect(otherMonth.totalExpenses).toBe(0);
	});
});
