import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';
import type { CategoryGroup } from '$lib/types';
import { mockChartCalls, resetMockChartCalls } from './mock-chart-state';

vi.mock('svelte-chartjs', async () => {
	const { default: MockDoughnut } = await import('./MockDoughnut.svelte');
	return { Doughnut: MockDoughnut };
});

import NestedDonut from './NestedDonut.svelte';

beforeEach(() => {
	resetMockChartCalls();
});

function makeGroup(overrides: Partial<CategoryGroup>): CategoryGroup {
	return {
		categoryId: 'c1',
		categoryName: 'Bolig',
		categoryColor: '#6366f1',
		incomeTotal: 0,
		expenseTotal: 0,
		balance: 0,
		items: [],
		...overrides
	};
}

function lastCall() {
	const calls = get(mockChartCalls);
	return calls[calls.length - 1] as { data: { datasets: any[] } };
}

describe('NestedDonut', () => {
	it('builds one inner-ring entry per category with its total', () => {
		render(NestedDonut, {
			props: {
				groups: [
					makeGroup({ categoryId: 'c1', categoryName: 'Bolig', categoryColor: '#6366f1', incomeTotal: 10000, expenseTotal: 40000 }),
					makeGroup({ categoryId: 'c2', categoryName: 'Mad', categoryColor: '#22c55e', incomeTotal: 0, expenseTotal: 20000 })
				]
			}
		});

		const inner = lastCall().data.datasets[0];
		expect(inner.data).toEqual([50000, 20000]);
		expect(inner.backgroundColor).toEqual(['#6366f1', '#22c55e']);
	});

	it('places a transparent spacer dataset between the rings', () => {
		render(NestedDonut, { props: { groups: [makeGroup({ expenseTotal: 10000 })] } });

		const spacer = lastCall().data.datasets[1];
		expect(spacer.data).toEqual([1]);
		expect(spacer.backgroundColor).toBe('transparent');
	});

	it('builds outer-ring arcs for income and expense separately in category order', () => {
		render(NestedDonut, {
			props: {
				groups: [
					makeGroup({ categoryId: 'c1', categoryName: 'Bolig', categoryColor: '#6366f1', incomeTotal: 10000, expenseTotal: 40000 }),
					makeGroup({ categoryId: 'c2', categoryName: 'Mad', categoryColor: '#22c55e', incomeTotal: 30000, expenseTotal: 20000 })
				]
			}
		});

		const outer = lastCall().data.datasets[2];
		expect(outer.data).toEqual([10000, 40000, 30000, 20000]);
		expect(outer.backgroundColor).toEqual(['#6366f1', '#6366f1', '#22c55e', '#22c55e']);
	});

	it('omits zero totals from the outer ring', () => {
		render(NestedDonut, {
			props: {
				groups: [
					makeGroup({ categoryId: 'c1', categoryName: 'Bolig', incomeTotal: 10000, expenseTotal: 0 }),
					makeGroup({ categoryId: 'c2', categoryName: 'Mad', incomeTotal: 0, expenseTotal: 0 })
				]
			}
		});

		const outer = lastCall().data.datasets[2];
		expect(outer.data).toEqual([10000]);
	});
});
