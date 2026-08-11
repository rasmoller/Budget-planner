import { isUncategorized } from '$lib/types';
import type { RecurringItem, MonthSummary, CategoryGroup } from '$lib/types';

export function getMonthlyAmount(item: RecurringItem): number {
	if (item.isOneTime) return item.amountInCents;
	switch (item.frequency) {
		case 'daily':
			return item.amountInCents * 30;
		case 'weekly':
			return item.amountInCents * 4.33;
		case 'monthly':
			return item.amountInCents;
		case 'yearly':
			return item.amountInCents / 12;
	}
}

export function getMonthKey(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthNumber(monthKey: string): number {
	return parseInt(monthKey.split('-')[1]) - 1;
}

export function getYearFromKey(monthKey: string): number {
	return parseInt(monthKey.split('-')[0]);
}

export function generateMonthKeys(year: number): string[] {
	return Array.from({ length: 12 }, (_, i) => {
		const month = String(i + 1).padStart(2, '0');
		return `${year}-${month}`;
	});
}

export function isItemActiveInMonth(item: RecurringItem, monthKey: string): boolean {
	if (!item.isActive) return false;
	const [year, month] = monthKey.split('-').map(Number);
	if (item.isOneTime && item.date) {
		const itemDate = new Date(item.date);
		return itemDate.getFullYear() === year && itemDate.getMonth() + 1 === month;
	}
	const itemStart = new Date(item.startDate);
	const itemYear = itemStart.getFullYear();
	const itemMonth = itemStart.getMonth() + 1;
	return year > itemYear || (year === itemYear && month >= itemMonth);
}

export function getEffectiveItem(item: RecurringItem, monthKey: string): RecurringItem {
	const [year, month] = monthKey.split('-').map(Number);
	const changes = (item.futureChanges ?? [])
		.filter((change) => {
			const d = new Date(change.effectiveDate);
			const changeYear = d.getFullYear();
			const changeMonth = d.getMonth() + 1;
			return changeYear < year || (changeYear === year && changeMonth <= month);
		})
		.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

	let effective: RecurringItem = item;
	for (const change of changes) {
		effective = {
			...effective,
			...(change.amountInCents !== undefined ? { amountInCents: change.amountInCents } : {}),
			...(change.frequency !== undefined ? { frequency: change.frequency } : {}),
			...(change.isActive !== undefined ? { isActive: change.isActive } : {})
		};
	}
	return effective;
}

export function isIncomeItem(item: RecurringItem): boolean {
	return item.type === 'income';
}

export function isExpenseItem(item: RecurringItem): boolean {
	return item.type === 'expense';
}

export function calculateMonthSummary(
	items: RecurringItem[],
	categories: { id: string; name: string; color: string }[],
	monthKey: string
): MonthSummary {
	const [year, month] = monthKey.split('-').map(Number);
	const activeItems = items
		.map((item) => getEffectiveItem(item, monthKey))
		.filter((item) => isItemActiveInMonth(item, monthKey));

	const categoryMap = new Map(categories.map((c) => [c.id, c]));
	const grouped = new Map<string, CategoryGroup>();

	for (const item of activeItems) {
		const key = item.categoryId || 'uncategorized';
		let group = grouped.get(key);
		if (!group) {
			const isUncat = isUncategorized(item.categoryId);
			const cat = categoryMap.get(item.categoryId);
			group = {
				categoryId: key,
				categoryName: isUncat ? 'Ingen kategori' : (cat?.name ?? 'Ukendt'),
				categoryColor: isUncat ? '#9ca3af' : (cat?.color ?? '#9ca3af'),
				incomeTotal: 0,
				expenseTotal: 0,
				balance: 0,
				items: []
			};
			grouped.set(key, group);
		}

		group.items.push(item);
		const amount = getMonthlyAmount(item);
		if (item.type === 'income') {
			group.incomeTotal += amount;
		} else {
			group.expenseTotal += amount;
		}
	}

	const groups = Array.from(grouped.values()).map((g) => ({
		...g,
		balance: g.incomeTotal - g.expenseTotal
	}));

	const totalIncome = groups.reduce((sum, g) => sum + g.incomeTotal, 0);
	const totalExpenses = groups.reduce((sum, g) => sum + g.expenseTotal, 0);

	return {
		month: monthKey,
		year,
		monthNumber: month - 1,
		totalIncome,
		totalExpenses,
		balance: totalIncome - totalExpenses,
		categories: groups
	};
}
