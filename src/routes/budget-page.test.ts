import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import Page from './+page.svelte';
import { db } from '$lib/db/schema';
import { budget } from '$lib/stores/budget';
import { categories } from '$lib/stores/categories';
import { recurringItems } from '$lib/stores/recurringItems';
import { currentLanguage } from '$lib/i18n';

beforeEach(async () => {
	await db.budgets.clear();
	await db.categories.clear();
	await db.recurringItems.clear();
	currentLanguage.set('da');
});

const now = () => new Date('2026-01-01');

async function seedData() {
	const budgetId = 'b-1';
	await db.budgets.add({
		id: budgetId,
		name: 'Test Budget',
		currency: 'DKK',
		isArchived: false,
		createdAt: now(),
		updatedAt: now()
	});
	await db.categories.add({
		id: 'c-1',
		budgetId,
		name: 'Bolig',
		color: '#6366f1',
		order: 0,
		createdAt: now(),
		updatedAt: now()
	});
	await db.recurringItems.add({
		id: 'i-1',
		budgetId,
		categoryId: 'c-1',
		type: 'income',
		name: 'Løn',
		amountInCents: 25000,
		frequency: 'monthly',
		startDate: now(),
		isActive: true,
		createdAt: now(),
		updatedAt: now()
	});
	await db.recurringItems.add({
		id: 'i-2',
		budgetId,
		categoryId: 'c-1',
		type: 'expense',
		name: 'Husleje',
		amountInCents: 8000,
		frequency: 'monthly',
		startDate: now(),
		isActive: true,
		createdAt: now(),
		updatedAt: now()
	});

	await budget.load();
	await categories.load();
	await recurringItems.load();
}

describe('budget page item delete buttons', () => {
	it('shows a delete button next to the edit button for each income and expense item', async () => {
		await seedData();
		render(Page);

		await fireEvent.click(screen.getByRole('button', { name: /Bolig/ }));

		expect(screen.getByRole('button', { name: 'Rediger Løn' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Slet Løn' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Rediger Husleje' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Slet Husleje' })).toBeInTheDocument();
	});

	it('removes an expense item when its delete button is clicked and confirmed', async () => {
		await seedData();
		render(Page);

		await fireEvent.click(screen.getByRole('button', { name: /Bolig/ }));
		await fireEvent.click(screen.getByRole('button', { name: 'Slet Husleje' }));

		const confirmDialog = document.querySelector('dialog[open]');
		expect(confirmDialog).not.toBeNull();
		expect(within(confirmDialog as HTMLElement).getByText('Er du sikker?')).toBeInTheDocument();

		await fireEvent.click(within(confirmDialog as HTMLElement).getByRole('button', { name: 'Slet' }));

		await waitFor(() => {
			expect(screen.queryByRole('button', { name: 'Slet Husleje' })).not.toBeInTheDocument();
		});
		expect(screen.getByRole('button', { name: 'Slet Løn' })).toBeInTheDocument();
		expect(await db.recurringItems.get('i-2')).toBeUndefined();
		expect(await db.recurringItems.get('i-1')).toBeDefined();
	});

	it('removes an income item when its delete button is clicked and confirmed', async () => {
		await seedData();
		render(Page);

		await fireEvent.click(screen.getByRole('button', { name: /Bolig/ }));
		await fireEvent.click(screen.getByRole('button', { name: 'Slet Løn' }));

		const confirmDialog = document.querySelector('dialog[open]');
		expect(confirmDialog).not.toBeNull();

		await fireEvent.click(within(confirmDialog as HTMLElement).getByRole('button', { name: 'Slet' }));

		await waitFor(() => {
			expect(screen.queryByRole('button', { name: 'Slet Løn' })).not.toBeInTheDocument();
		});
		expect(screen.getByRole('button', { name: 'Slet Husleje' })).toBeInTheDocument();
		expect(await db.recurringItems.get('i-1')).toBeUndefined();
		expect(await db.recurringItems.get('i-2')).toBeDefined();
	});
});
