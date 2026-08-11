import { describe, it, expect } from 'vitest';
import {
	getMonthlyAmount,
	getMonthKey,
	getMonthNumber,
	getYearFromKey,
	generateMonthKeys,
	isItemActiveInMonth,
	getEffectiveItem,
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
});

describe('getEffectiveItem', () => {
	function makeChange(overrides: Partial<import('$lib/types').ScheduledChange> = {}): import('$lib/types').ScheduledChange {
		return {
			id: 'change-1',
			effectiveDate: new Date('2026-03-01'),
			createdAt: new Date(),
			...overrides
		};
	}

	it('returns the item unchanged when there are no future changes', () => {
		const item = makeItem({ amountInCents: 100000, futureChanges: [] });
		const effective = getEffectiveItem(item, '2026-06');
		expect(effective.amountInCents).toBe(100000);
	});

	it('applies an amount change that is effective in or before the month', () => {
		const item = makeItem({
			amountInCents: 100000,
			futureChanges: [makeChange({ effectiveDate: new Date('2026-03-01'), amountInCents: 200000 })]
		});
		expect(getEffectiveItem(item, '2026-02').amountInCents).toBe(100000);
		expect(getEffectiveItem(item, '2026-03').amountInCents).toBe(200000);
		expect(getEffectiveItem(item, '2026-08').amountInCents).toBe(200000);
	});

	it('applies an isActive deactivation from the effective month onward', () => {
		const item = makeItem({
			isActive: true,
			futureChanges: [makeChange({ effectiveDate: new Date('2026-05-01'), isActive: false })]
		});
		expect(getEffectiveItem(item, '2026-04').isActive).toBe(true);
		expect(getEffectiveItem(item, '2026-05').isActive).toBe(false);
		expect(isItemActiveInMonth(getEffectiveItem(item, '2026-05'), '2026-05')).toBe(false);
	});

	it('applies multiple changes in chronological order', () => {
		const item = makeItem({
			amountInCents: 100000,
			futureChanges: [
				makeChange({ id: 'c1', effectiveDate: new Date('2026-03-01'), amountInCents: 200000 }),
				makeChange({ id: 'c2', effectiveDate: new Date('2026-07-01'), amountInCents: 300000 })
			]
		});
		expect(getEffectiveItem(item, '2026-02').amountInCents).toBe(100000);
		expect(getEffectiveItem(item, '2026-04').amountInCents).toBe(200000);
		expect(getEffectiveItem(item, '2026-08').amountInCents).toBe(300000);
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

	it('applies future-dated amount changes across months', () => {
		const item = makeItem({
			categoryId: 'cat-1',
			type: 'expense',
			amountInCents: 100000,
			frequency: 'monthly',
			futureChanges: [
				{
					id: 'c1',
					effectiveDate: new Date('2026-07-01'),
					amountInCents: 500000,
					createdAt: new Date()
				}
			]
		});
		const june = calculateMonthSummary([item], categories, '2026-06');
		expect(june.totalExpenses).toBe(100000);
		const july = calculateMonthSummary([item], categories, '2026-07');
		expect(july.totalExpenses).toBe(500000);
	});

	it('excludes items deactivated by a future change from later months', () => {
		const item = makeItem({
			categoryId: 'cat-1',
			type: 'expense',
			amountInCents: 100000,
			frequency: 'monthly',
			futureChanges: [
				{
					id: 'c1',
					effectiveDate: new Date('2026-09-01'),
					isActive: false,
					createdAt: new Date()
				}
			]
		});
		const august = calculateMonthSummary([item], categories, '2026-08');
		expect(august.totalExpenses).toBe(100000);
		const september = calculateMonthSummary([item], categories, '2026-09');
		expect(september.totalExpenses).toBe(0);
	});
});
