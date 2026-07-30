import { writable, get } from 'svelte/store';
import { db } from '$lib/db/schema';
import type { Budget, Currency } from '$lib/types';

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
					currency: 'DKK',
					isArchived: false,
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
		async create(name: string, currency: Currency = 'DKK') {
			const newBudget: Budget = {
				id: crypto.randomUUID(),
				name,
				currency,
				isArchived: false,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			await db.budgets.add(newBudget);
			const budgets = await db.budgets.toArray();
			allBudgets.set(budgets);
			return newBudget;
		},
		async duplicate(sourceBudgetId: string) {
			const source = await db.budgets.get(sourceBudgetId);
			if (!source) return null;

			const newBudget: Budget = {
				id: crypto.randomUUID(),
				name: `${source.name} (kopi)`,
				currency: source.currency,
				isArchived: false,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			await db.budgets.add(newBudget);

			const sourceCategories = await db.categories.where('budgetId').equals(sourceBudgetId).toArray();
			const sourceItems = await db.recurringItems.where('budgetId').equals(sourceBudgetId).toArray();

			const catIdMap: Record<string, string> = {};
			for (const cat of sourceCategories) {
				const newCatId = crypto.randomUUID();
				catIdMap[cat.id] = newCatId;
				await db.categories.add({
					...cat,
					id: newCatId,
					budgetId: newBudget.id,
					createdAt: new Date(),
					updatedAt: new Date()
				});
			}

			for (const item of sourceItems) {
				await db.recurringItems.add({
					...item,
					id: crypto.randomUUID(),
					budgetId: newBudget.id,
					categoryId: catIdMap[item.categoryId] || item.categoryId,
					createdAt: new Date(),
					updatedAt: new Date()
				});
			}

			const budgets = await db.budgets.toArray();
			allBudgets.set(budgets);
			return newBudget;
		},
		async archive(budgetId: string) {
			await db.budgets.update(budgetId, { isArchived: true, updatedAt: new Date() });
			const budgets = await db.budgets.toArray();
			allBudgets.set(budgets);
			const current = get(currentBudget);
			if (current?.id === budgetId) {
				const active = budgets.filter((b) => !b.isArchived);
				currentBudget.set(active.length > 0 ? active[0] : null);
			}
		},
		async unarchive(budgetId: string) {
			await db.budgets.update(budgetId, { isArchived: false, updatedAt: new Date() });
			const budgets = await db.budgets.toArray();
			allBudgets.set(budgets);
		},
		async updateCurrency(currency: Currency) {
			const b = get(currentBudget);
			if (!b) return;
			await db.budgets.update(b.id, { currency, updatedAt: new Date() });
			currentBudget.update((curr) => (curr ? { ...curr, currency, updatedAt: new Date() } : curr));
			const budgets = await db.budgets.toArray();
			allBudgets.set(budgets);
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
