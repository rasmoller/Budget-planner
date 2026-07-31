import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { tick } from 'svelte';
import ActionBar from './ActionBar.svelte';
import { viewMode } from '$lib/stores/viewMode';
import { currentLanguage } from '$lib/i18n';

beforeEach(() => {
	currentLanguage.set('da');
	viewMode.set('month');
});

function renderActionBar() {
	const handlers = {
		prevYear: vi.fn(),
		nextYear: vi.fn(),
		prevMonth: vi.fn(),
		nextMonth: vi.fn()
	};
	render(ActionBar, {
		props: {
			currentYear: 2026,
			selectedMonth: '2026-03',
			...handlers
		}
	});
	return handlers;
}

describe('ActionBar', () => {
	it('shows the selected month name and year in month view', () => {
		renderActionBar();
		expect(screen.getByText('Marts 2026')).toBeInTheDocument();
	});

	it('switches to year view when the year view button is clicked', async () => {
		renderActionBar();
		await fireEvent.click(screen.getByRole('button', { name: 'Årsvisning' }));
		expect(get(viewMode)).toBe('year');
	});

	it('switches back to month view when the month view button is clicked', async () => {
		renderActionBar();
		viewMode.set('year');
		await fireEvent.click(screen.getByRole('button', { name: 'Månedsvisning' }));
		expect(get(viewMode)).toBe('month');
	});

	it('shows the current year and calls nextYear in year view', async () => {
		const handlers = renderActionBar();
		viewMode.set('year');
		await tick();
		expect(screen.getByText('2026')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: '→' }));
		expect(handlers.nextYear).toHaveBeenCalledTimes(1);
	});

	it('calls prevMonth and nextMonth in month view', async () => {
		const handlers = renderActionBar();
		await fireEvent.click(screen.getByRole('button', { name: '→' }));
		await fireEvent.click(screen.getByRole('button', { name: '←' }));
		expect(handlers.nextMonth).toHaveBeenCalledTimes(1);
		expect(handlers.prevMonth).toHaveBeenCalledTimes(1);
	});

	it('shows the currency selector with the budget currency as auto option', () => {
		renderActionBar();
		expect(screen.getByRole('option', { name: 'Auto (DKK)' })).toBeInTheDocument();
	});
});
