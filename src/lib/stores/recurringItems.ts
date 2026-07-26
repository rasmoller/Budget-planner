import { writable, get } from 'svelte/store';
import { db } from '$lib/db/schema';
import type { RecurringItem } from '$lib/types';
import { budget } from './budget';

function createRecurringItemStore() {
	const { subscribe, set, update } = writable<RecurringItem[]>([]);

	return {
		subscribe,
		async load() {
			const b = get(budget);
			if (!b) return;
			const items = await db.recurringItems.where('budgetId').equals(b.id).toArray();
			set(items);
		},
		async add(data: Omit<RecurringItem, 'id' | 'budgetId' | 'createdAt' | 'updatedAt'>) {
			const b = get(budget);
			if (!b) return;
			const item: RecurringItem = {
				...data,
				id: crypto.randomUUID(),
				budgetId: b.id,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			await db.recurringItems.add(item);
			update((items) => [...items, item]);
			return item;
		},
		async update(id: string, data: Partial<Omit<RecurringItem, 'id' | 'budgetId' | 'createdAt'>>) {
			const existing = await db.recurringItems.get(id);
			if (!existing) return;
			const updated = { ...existing, ...data, updatedAt: new Date() };
			await db.recurringItems.update(id, updated);
			update((items) => items.map((i) => (i.id === id ? updated : i)));
		},
		async remove(id: string) {
			await db.recurringItems.delete(id);
			update((items) => items.filter((i) => i.id !== id));
		}
	};
}

export const recurringItems = createRecurringItemStore();
