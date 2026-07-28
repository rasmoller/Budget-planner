<script lang="ts">
	import { categories } from '$lib/stores/categories';
	import { recurringItems } from '$lib/stores/recurringItems';
	import { calculateMonthSummary } from '$lib/utils/budget';
	import { formatDKK } from '$lib/utils/currency';
	import { t } from '$lib/i18n';
	import NestedDonut from '$lib/components/charts/NestedDonut.svelte';

	let selectedMonth = $state(
		`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
	);

	const monthSummary = $derived(
		calculateMonthSummary($recurringItems, $categories, selectedMonth)
	);

	const totalIncome = $derived(monthSummary.totalIncome);
	const totalExpenses = $derived(monthSummary.totalExpenses);
	const balance = $derived(totalIncome - totalExpenses);

	const hasData = $derived(monthSummary.categories.length > 0);

	function prevMonth() {
		const [y, m] = selectedMonth.split('-').map(Number);
		if (m === 1) selectedMonth = `${y - 1}-12`;
		else selectedMonth = `${y}-${String(m - 1).padStart(2, '0')}`;
	}

	function nextMonth() {
		const [y, m] = selectedMonth.split('-').map(Number);
		if (m === 12) selectedMonth = `${y + 1}-01`;
		else selectedMonth = `${y}-${String(m + 1).padStart(2, '0')}`;
	}
</script>

<svelte:head>
	<title>{$t.nav.charts} - Budget Planner</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold">{$t.nav.charts}</h2>
	</div>

	<div class="flex items-center justify-center gap-4">
		<button onclick={prevMonth} class="btn-sm btn-outline">←</button>
		<span class="text-xl font-semibold">
			{$t.months[parseInt(selectedMonth.split('-')[1]) - 1]} {selectedMonth.split('-')[0]}
		</span>
		<button onclick={nextMonth} class="btn-sm btn-outline">→</button>
	</div>

	<div class="grid grid-cols-3 gap-4">
		<div class="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
			<p class="text-sm text-gray-500">{$t.budget.totalIncome}</p>
			<p class="text-xl font-bold" style="color: var(--color-income)">
				{formatDKK(totalIncome)}
			</p>
		</div>
		<div class="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
			<p class="text-sm text-gray-500">{$t.budget.totalExpenses}</p>
			<p class="text-xl font-bold" style="color: var(--color-expense)">
				{formatDKK(totalExpenses)}
			</p>
		</div>
		<div class="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
			<p class="text-sm text-gray-500">{$t.budget.balance}</p>
			<p class="text-xl font-bold" style="color: {balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
				{formatDKK(balance)}
			</p>
		</div>
	</div>

	{#if hasData}
		<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex justify-center">
			<NestedDonut groups={monthSummary.categories} />
		</div>

		<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] divide-y divide-[var(--color-border)]">
			<div class="grid grid-cols-4 gap-2 p-3 text-xs font-medium text-gray-500">
				<span>{$t.budget.category}</span>
				<span class="text-right">{$t.budget.totalIncome}</span>
				<span class="text-right">{$t.budget.totalExpenses}</span>
				<span class="text-right">{$t.budget.balance}</span>
			</div>
			{#each monthSummary.categories as group (group.categoryId)}
				<div class="grid grid-cols-4 gap-2 p-3 items-center">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 rounded-full" style="background-color: {group.categoryColor}"></div>
						<span class="text-sm font-medium">{group.categoryName}</span>
					</div>
					<span class="text-right font-mono text-sm" style="color: var(--color-income)">
						{group.incomeTotal > 0 ? formatDKK(group.incomeTotal) : '—'}
					</span>
					<span class="text-right font-mono text-sm" style="color: var(--color-expense)">
						{group.expenseTotal > 0 ? formatDKK(group.expenseTotal) : '—'}
					</span>
					<span class="text-right font-mono text-sm font-semibold" style="color: {group.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
						{formatDKK(group.balance)}
					</span>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-12 text-gray-500">
			{$t.budget.noItems}
		</div>
	{/if}
</div>
