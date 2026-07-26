import { writable, get } from 'svelte/store';
import { db } from '$lib/db/schema';
import type { Budget } from '$lib/types';

export const allBudgets = writable<Budget[]>([]);

function createBudgetStore() {
	const currentBudget = writable<Budget | null>(null);

	return {
		subscribe: currentBudget.subscribe,
		async load() {
			const budgets = await db.budgets.toArray();
			allBudgets.set(budgets);
			if (budgets.length === 0) {
				const defaultBudget: Budget = {
					id: crypto.randomUUID(),
					name: 'Mit Budget',
					createdAt: new Date(),
					updatedAt: new Date()
				};
				await db.budgets.add(defaultBudget);
				currentBudget.set(defaultBudget);
				allBudgets.set([defaultBudget]);
			} else {
				currentBudget.set(budgets[0]);
			}
		},
		async switchTo(budgetId: string) {
			const b = await db.budgets.get(budgetId);
			if (b) {
				currentBudget.set(b);
			}
		},
		async create(name: string) {
			const newBudget: Budget = {
				id: crypto.randomUUID(),
				name,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			await db.budgets.add(newBudget);
			const budgets = await db.budgets.toArray();
			allBudgets.set(budgets);
			return newBudget;
		},
		async remove(budgetId: string) {
			const cats = await db.categories.where('budgetId').equals(budgetId).toArray();
			const categoryIds = cats.map((c) => c.id);

			await db.recurringItems.where('budgetId').equals(budgetId).delete();
			for (const catId of categoryIds) {
				await db.categories.delete(catId);
			}
			await db.budgets.delete(budgetId);

			const budgets = await db.budgets.toArray();
			allBudgets.set(budgets);

			const current = get(currentBudget);
			if (current?.id === budgetId) {
				currentBudget.set(budgets.length > 0 ? budgets[0] : null);
			}
		},
		async updateName(name: string) {
			const b = get(currentBudget);
			if (!b) return;
			await db.budgets.update(b.id, { name, updatedAt: new Date() });
			currentBudget.update((curr) => (curr ? { ...curr, name, updatedAt: new Date() } : curr));
			const budgets = await db.budgets.toArray();
			allBudgets.set(budgets);
		}
	};
}

export const budget = createBudgetStore();
