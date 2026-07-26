import Dexie, { type Table } from 'dexie';
import type { Budget, Category, RecurringItem } from '$lib/types';

export class BudgetDatabase extends Dexie {
	budgets!: Table<Budget>;
	categories!: Table<Category>;
	recurringItems!: Table<RecurringItem>;

	constructor() {
		super('budget-planner');
		this.version(1).stores({
			budgets: 'id, createdAt',
			categories: 'id, budgetId',
			recurringItems: 'id, budgetId, categoryId, type, frequency, isActive'
		});
	}
}

export const db = new BudgetDatabase();
