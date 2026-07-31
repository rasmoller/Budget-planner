import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SummaryCards from './SummaryCards.svelte';
import { currentLanguage } from '$lib/i18n';

beforeEach(() => {
	currentLanguage.set('da');
});

function renderCards(income: number, expense: number) {
	return render(SummaryCards, {
		props: { income, expense, fmt: (n: number) => `fmt:${n}` }
	});
}

function balanceElement(container: HTMLElement, value: string) {
	return [...container.querySelectorAll('p')].find((p) => p.textContent === value);
}

describe('SummaryCards', () => {
	it('shows the income and expense totals', () => {
		renderCards(100000, 40000);
		expect(screen.getByText('fmt:100000')).toBeInTheDocument();
		expect(screen.getByText('fmt:40000')).toBeInTheDocument();
	});

	it('shows the balance as income minus expense', () => {
		renderCards(100000, 40000);
		expect(screen.getByText('fmt:60000')).toBeInTheDocument();
	});

	it('links the income and expense cards to their pages', () => {
		const { container } = renderCards(0, 0);
		expect(container.querySelector('a[href="/incomes"]')).not.toBeNull();
		expect(container.querySelector('a[href="/expenses"]')).not.toBeNull();
	});

	it('renders a negative balance with the expense color', () => {
		const { container } = renderCards(10000, 30000);
		const el = balanceElement(container, 'fmt:-20000');
		expect(el).toBeDefined();
		expect(el!.getAttribute('style')).toContain('var(--color-expense)');
	});

	it('renders a positive balance with the income color', () => {
		const { container } = renderCards(50000, 10000);
		const el = balanceElement(container, 'fmt:40000');
		expect(el).toBeDefined();
		expect(el!.getAttribute('style')).toContain('var(--color-income)');
	});
});
