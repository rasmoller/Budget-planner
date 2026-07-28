import { writable, get } from 'svelte/store';
import { db } from '$lib/db/schema';
import type { Category } from '$lib/types';
import { budget } from './budget';

function createCategoryStore() {
	const { subscribe, set, update } = writable<Category[]>([]);

	return {
		subscribe,
		async load() {
			const b = get(budget);
			if (!b) return;
			const categories = await db.categories
				.where('budgetId')
				.equals(b.id)
				.sortBy('order');
			set(categories);
		},
		async add(data: Omit<Category, 'id' | 'budgetId' | 'createdAt' | 'updatedAt' | 'order'>) {
			const b = get(budget);
			if (!b) return;
			const cats = get({ subscribe });
			const category: Category = {
				...data,
				id: crypto.randomUUID(),
				budgetId: b.id,
				order: cats.length,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			await db.categories.add(category);
			update((cats) => [...cats, category]);
			return category;
		},
		async update(id: string, data: Partial<Pick<Category, 'name' | 'color'>>) {
			const existing = await db.categories.get(id);
			if (!existing) return;
			const updated = { ...existing, ...data, updatedAt: new Date() };
			await db.categories.update(id, updated);
			update((cats) => cats.map((c) => (c.id === id ? updated : c)));
		},
		async reorder(orderedIds: string[]) {
			const b = get(budget);
			if (!b) return;
			const updates: Promise<number>[] = [];
			orderedIds.forEach((id, index) => {
				updates.push(
					db.categories.update(id, { order: index, updatedAt: new Date() })
				);
			});
			await Promise.all(updates);
			const categories = await db.categories
				.where('budgetId')
				.equals(b.id)
				.sortBy('order');
			set(categories);
		},
		async remove(id: string) {
			await db.categories.delete(id);
			update((cats) => cats.filter((c) => c.id !== id));
		}
	};
}

export const categories = createCategoryStore();
