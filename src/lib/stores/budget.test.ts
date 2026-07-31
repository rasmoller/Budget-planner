import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { db } from '$lib/db/schema';
import { budget, allBudgets } from './budget';
import { categories } from './categories';
import { recurringItems } from './recurringItems';
import type { Budget, Category, RecurringItem } from '$lib/types';

beforeEach(async () => {
	await db.budgets.clear();
	await db.categories.clear();
	await db.recurringItems.clear();
});

function makeBudget(overrides: Partial<Budget> = {}): Budget {
	return {
		id: crypto.randomUUID(),
		name: 'Test Budget',
		currency: 'DKK',
		isArchived: false,
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
		...overrides
	};
}

function makeCategory(overrides: Partial<Category> = {}): Category {
	return {
		id: crypto.randomUUID(),
		budgetId: '',
		name: 'Test Category',
		color: '#ff0000',
		order: 0,
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
		...overrides
	};
}

function makeItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
	return {
		id: crypto.randomUUID(),
		budgetId: '',
		categoryId: '',
		type: 'expense',
		name: 'Test Item',
		amountInCents: 100000,
		frequency: 'monthly',
		startDate: new Date('2026-01-01'),
		isActive: true,
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
		...overrides
	};
}

// ----------------------------------------------------------------
// Budget store
// ----------------------------------------------------------------
describe('budget store', () => {
	it('load creates a default budget when DB is empty', async () => {
		expect(get(budget)).toBeNull();
		await budget.load();
		const b = get(budget);
		expect(b).not.toBeNull();
		expect(b!.name).toBe('Mit Budget');
		expect(b!.currency).toBe('DKK');
		expect(b!.isArchived).toBe(false);
	});

	it('load loads existing budgets from DB', async () => {
		const existing: Budget = makeBudget({ id: 'b-1', name: 'My Budget', currency: 'USD' });
		await db.budgets.add(existing);

		await budget.load();
		const b = get(budget);
		expect(b).not.toBeNull();
		expect(b!.id).toBe('b-1');
		expect(b!.name).toBe('My Budget');
		expect(b!.currency).toBe('USD');
	});

	it('load populates allBudgets', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1', name: 'One' }));
		await db.budgets.add(makeBudget({ id: 'b-2', name: 'Two' }));

		await budget.load();
		const list = get(allBudgets);
		expect(list).toHaveLength(2);
		expect(list.map((b) => b.name).sort()).toEqual(['One', 'Two']);
	});

	it('create adds a new budget to DB and store', async () => {
		await budget.load();
		const created = await budget.create('New Budget', 'EUR');
		expect(created.name).toBe('New Budget');
		expect(created.currency).toBe('EUR');

		const fromDb = await db.budgets.get(created.id);
		expect(fromDb).not.toBeNull();
		expect(fromDb!.name).toBe('New Budget');

		const list = get(allBudgets);
		expect(list.some((b) => b.id === created.id)).toBe(true);
	});

	it('switchTo changes the current budget', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1', name: 'First' }));
		await db.budgets.add(makeBudget({ id: 'b-2', name: 'Second' }));
		await budget.load();

		expect(get(budget)!.id).toBe('b-1');
		await budget.switchTo('b-2');
		expect(get(budget)!.id).toBe('b-2');
		expect(get(budget)!.name).toBe('Second');
	});

	it('duplicate copies a budget with its categories and items', async () => {
		await db.budgets.add(makeBudget({ id: 'src', name: 'Source' }));
		await db.categories.add(makeCategory({ id: 'cat-1', budgetId: 'src', name: 'Rent' }));
		await db.categories.add(makeCategory({ id: 'cat-2', budgetId: 'src', name: 'Food' }));
		await db.recurringItems.add(
			makeItem({ id: 'item-1', budgetId: 'src', categoryId: 'cat-1', name: 'Leje' })
		);
		await budget.load();

		const dup = await budget.duplicate('src');
		expect(dup).not.toBeNull();
		expect(dup!.name).toBe('Source (kopi)');
		expect(dup!.id).not.toBe('src');

		const dupCats = await db.categories.where('budgetId').equals(dup!.id).toArray();
		expect(dupCats).toHaveLength(2);
		const catNames = dupCats.map((c) => c.name).sort();
		expect(catNames).toEqual(['Food', 'Rent']);

		const dupItems = await db.recurringItems.where('budgetId').equals(dup!.id).toArray();
		expect(dupItems).toHaveLength(1);
		expect(dupItems[0].name).toBe('Leje');
		expect(dupCats.some((c) => c.id === dupItems[0].categoryId)).toBe(true);
	});

	it('archive marks budget as archived and switches away if current', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1', name: 'Active' }));
		await db.budgets.add(makeBudget({ id: 'b-2', name: 'ToArchive' }));
		await budget.load();

		await budget.switchTo('b-2');
		expect(get(budget)!.id).toBe('b-2');

		await budget.archive('b-2');
		const archived = await db.budgets.get('b-2');
		expect(archived!.isArchived).toBe(true);

		expect(get(budget)!.id).toBe('b-1');
	});

	it('unarchive restores a budget', async () => {
		await db.budgets.add(
			makeBudget({ id: 'b-1', name: 'Gone', isArchived: true })
		);
		await budget.load();

		const listBefore = get(allBudgets).filter((b) => !b.isArchived);
		expect(listBefore).toHaveLength(0);

		await budget.unarchive('b-1');
		const restored = await db.budgets.get('b-1');
		expect(restored!.isArchived).toBe(false);

		const listAfter = get(allBudgets).filter((b) => !b.isArchived);
		expect(listAfter).toHaveLength(1);
	});

	it('updateCurrency updates the current budget currency', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1', name: 'Test' }));
		await budget.load();
		expect(get(budget)!.currency).toBe('DKK');

		await budget.updateCurrency('USD');
		expect(get(budget)!.currency).toBe('USD');

		const fromDb = await db.budgets.get('b-1');
		expect(fromDb!.currency).toBe('USD');
	});

	it('updateName updates the current budget name', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1', name: 'Old' }));
		await budget.load();
		expect(get(budget)!.name).toBe('Old');

		await budget.updateName('Renamed');
		expect(get(budget)!.name).toBe('Renamed');

		const fromDb = await db.budgets.get('b-1');
		expect(fromDb!.name).toBe('Renamed');
	});

	it('updateName can rename a specific budget without switching to it', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1', name: 'First' }));
		await db.budgets.add(makeBudget({ id: 'b-2', name: 'Second' }));
		await budget.load();

		await budget.updateName('Renamed Second', 'b-2');

		expect(get(budget)!.id).toBe('b-1');
		expect(get(budget)!.name).toBe('First');
		expect((await db.budgets.get('b-2'))!.name).toBe('Renamed Second');
		expect(get(allBudgets).find((b) => b.id === 'b-2')!.name).toBe('Renamed Second');
	});

	it('remove deletes budget and cascades to categories and items', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1', name: 'ToDelete' }));
		await db.categories.add(makeCategory({ id: 'cat-1', budgetId: 'b-1' }));
		await db.recurringItems.add(
			makeItem({ id: 'item-1', budgetId: 'b-1', categoryId: 'cat-1' })
		);
		await budget.load();
		expect(get(budget)).not.toBeNull();

		await budget.remove('b-1');

		expect(await db.budgets.get('b-1')).toBeUndefined();
		expect(await db.categories.get('cat-1')).toBeUndefined();
		expect(await db.recurringItems.get('item-1')).toBeUndefined();

		expect(get(allBudgets).find((b) => b.id === 'b-1')).toBeUndefined();
	});
});

// ----------------------------------------------------------------
// Categories store
// ----------------------------------------------------------------
describe('categories store', () => {
	it('load returns empty when no categories', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1' }));
		await budget.load();
		await categories.load();
		expect(get(categories)).toEqual([]);
	});

	it('load loads categories for the current budget', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1' }));
		await db.categories.add(makeCategory({ id: 'c-1', budgetId: 'b-1', name: 'Food' }));
		await db.categories.add(makeCategory({ id: 'c-2', budgetId: 'b-1', name: 'Rent' }));
		await budget.load();
		await categories.load();

		const list = get(categories);
		expect(list).toHaveLength(2);
		expect(list.map((c) => c.name).sort()).toEqual(['Food', 'Rent']);
	});

	it('add creates a category', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1' }));
		await budget.load();
		await categories.load();

		const cat = await categories.add({ name: 'New Cat', color: '#00ff00' });
		expect(cat).not.toBeNull();
		expect(cat!.name).toBe('New Cat');
		expect(cat!.color).toBe('#00ff00');
		expect(cat!.budgetId).toBe('b-1');

		const fromDb = await db.categories.get(cat!.id);
		expect(fromDb).not.toBeNull();

		expect(get(categories).some((c) => c.id === cat!.id)).toBe(true);
	});

	it('update modifies category name and color', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1' }));
		await db.categories.add(makeCategory({ id: 'c-1', budgetId: 'b-1', name: 'Old' }));
		await budget.load();
		await categories.load();

		await categories.update('c-1', { name: 'Updated', color: '#0000ff' });

		const fromDb = await db.categories.get('c-1');
		expect(fromDb!.name).toBe('Updated');
		expect(fromDb!.color).toBe('#0000ff');

		const inStore = get(categories).find((c) => c.id === 'c-1');
		expect(inStore!.name).toBe('Updated');
	});

	it('duplicate copies a category and its items', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1' }));
		await db.categories.add(makeCategory({ id: 'c-1', budgetId: 'b-1', name: 'Bills' }));
		await db.recurringItems.add(
			makeItem({ id: 'i-1', budgetId: 'b-1', categoryId: 'c-1', name: 'Electricity' })
		);
		await budget.load();
		await categories.load();

		const dup = await categories.duplicate('c-1');
		expect(dup).not.toBeNull();
		expect(dup!.name).toBe('Bills (kopi)');
		expect(dup!.id).not.toBe('c-1');

		const items = await db.recurringItems.where('categoryId').equals(dup!.id).toArray();
		expect(items).toHaveLength(1);
		expect(items[0].name).toBe('Electricity');
	});

	it('remove deletes a category from DB and store', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1' }));
		await db.categories.add(makeCategory({ id: 'c-1', budgetId: 'b-1' }));
		await budget.load();
		await categories.load();
		expect(get(categories)).toHaveLength(1);

		await categories.remove('c-1');
		expect(await db.categories.get('c-1')).toBeUndefined();
		expect(get(categories)).toHaveLength(0);
	});

	it('reorder persists new ordering', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1' }));
		await db.categories.add(makeCategory({ id: 'c-1', budgetId: 'b-1', name: 'A', order: 0 }));
		await db.categories.add(makeCategory({ id: 'c-2', budgetId: 'b-1', name: 'B', order: 1 }));
		await budget.load();
		await categories.load();

		await categories.reorder(['c-2', 'c-1']);

		const fromDb = await db.categories.get('c-1');
		expect(fromDb!.order).toBe(1);
		const fromDb2 = await db.categories.get('c-2');
		expect(fromDb2!.order).toBe(0);

		const storeOrder = get(categories).map((c) => c.id);
		expect(storeOrder).toEqual(['c-2', 'c-1']);
	});
});

// ----------------------------------------------------------------
// Recurring Items store
// ----------------------------------------------------------------
describe('recurringItems store', () => {
	it('load returns empty when no items', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1' }));
		await budget.load();
		await recurringItems.load();
		expect(get(recurringItems)).toEqual([]);
	});

	it('load loads items for the current budget', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1' }));
		await db.recurringItems.add(
			makeItem({ id: 'i-1', budgetId: 'b-1', name: 'Rent' })
		);
		await db.recurringItems.add(
			makeItem({ id: 'i-2', budgetId: 'b-1', name: 'Food' })
		);
		await budget.load();
		await recurringItems.load();

		const list = get(recurringItems);
		expect(list).toHaveLength(2);
		expect(list.map((i) => i.name).sort()).toEqual(['Food', 'Rent']);
	});

	it('add creates a recurring item', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1' }));
		await budget.load();
		await recurringItems.load();

		const item = await recurringItems.add({
			categoryId: 'cat-1',
			type: 'income',
			name: 'Salary',
			amountInCents: 5000000,
			frequency: 'monthly',
			startDate: new Date('2026-06-01'),
			isActive: true
		});
		expect(item).not.toBeNull();
		expect(item!.name).toBe('Salary');
		expect(item!.type).toBe('income');
		expect(item!.amountInCents).toBe(5000000);
		expect(item!.budgetId).toBe('b-1');

		const fromDb = await db.recurringItems.get(item!.id);
		expect(fromDb).not.toBeNull();

		expect(get(recurringItems).some((i) => i.id === item!.id)).toBe(true);
	});

	it('update modifies item fields', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1' }));
		await db.recurringItems.add(
			makeItem({ id: 'i-1', budgetId: 'b-1', name: 'Old', amountInCents: 50000 })
		);
		await budget.load();
		await recurringItems.load();

		await recurringItems.update('i-1', { name: 'Updated', amountInCents: 75000 });

		const fromDb = await db.recurringItems.get('i-1');
		expect(fromDb!.name).toBe('Updated');
		expect(fromDb!.amountInCents).toBe(75000);

		const inStore = get(recurringItems).find((i) => i.id === 'i-1');
		expect(inStore!.name).toBe('Updated');
		expect(inStore!.amountInCents).toBe(75000);
	});

	it('duplicate copies an item', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1' }));
		await db.recurringItems.add(
			makeItem({ id: 'i-1', budgetId: 'b-1', name: 'Insurance', amountInCents: 200000 })
		);
		await budget.load();
		await recurringItems.load();

		const dup = await recurringItems.duplicate('i-1');
		expect(dup).not.toBeNull();
		expect(dup!.name).toBe('Insurance (kopi)');
		expect(dup!.id).not.toBe('i-1');
		expect(dup!.amountInCents).toBe(200000);

		expect(get(recurringItems)).toHaveLength(2);
	});

	it('remove deletes an item from DB and store', async () => {
		await db.budgets.add(makeBudget({ id: 'b-1' }));
		await db.recurringItems.add(
			makeItem({ id: 'i-1', budgetId: 'b-1' })
		);
		await budget.load();
		await recurringItems.load();
		expect(get(recurringItems)).toHaveLength(1);

		await recurringItems.remove('i-1');
		expect(await db.recurringItems.get('i-1')).toBeUndefined();
		expect(get(recurringItems)).toHaveLength(0);
	});
});
