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
		this.version(2).stores({
			budgets: 'id, createdAt',
			categories: 'id, budgetId, order',
			recurringItems: 'id, budgetId, categoryId, type, frequency, isActive'
		}).upgrade(async (tx) => {
			const categories = await tx.table('categories').toArray();
			for (let i = 0; i < categories.length; i++) {
				await tx.table('categories').update(categories[i].id, { order: i });
			}
		});
		this.version(3).stores({
			budgets: 'id, createdAt, isArchived',
			categories: 'id, budgetId, order',
			recurringItems: 'id, budgetId, categoryId, type, frequency, isActive'
		}).upgrade(async (tx) => {
			const budgets = await tx.table('budgets').toArray();
			for (const b of budgets) {
				await tx.table('budgets').update(b.id, {
					currency: b.currency || 'DKK',
					isArchived: b.isArchived ?? false
				});
			}
		});
	}
}

export const db = new BudgetDatabase();
