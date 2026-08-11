<script lang="ts">
	import { budget } from '$lib/stores/budget';
	import { categories } from '$lib/stores/categories';
	import { recurringItems } from '$lib/stores/recurringItems';
	import {
		calculateMonthSummary,
		generateMonthKeys
	} from '$lib/utils/budget';
	import { t } from '$lib/i18n';
	import NestedDonut from '$lib/components/charts/NestedDonut.svelte';
	import { displayCurrency, exchangeRates, formatDisplay, convertGroups } from '$lib/stores/displayCurrency';
	import ActionBar from '$lib/components/ActionBar.svelte';
	import SummaryCards from '$lib/components/SummaryCards.svelte';
	import { viewMode } from '$lib/stores/viewMode';
	import type { Currency, CategoryGroup } from '$lib/types';

	let currentYear = $state(new Date().getFullYear());
	let selectedMonth = $state(
		`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
	);

	let enabledCategoryIds = $state(new Set<string>());

	const monthKeys = $derived(generateMonthKeys(currentYear));

	const yearSummaries = $derived(
		monthKeys.map((mk) => calculateMonthSummary($recurringItems, $categories, mk))
	);

	const yearCategories = $derived.by(() => {
		const map = new Map<string, CategoryGroup>();
		for (const ms of yearSummaries) {
			for (const g of ms.categories) {
				let group = map.get(g.categoryId);
				if (!group) {
					group = {
						categoryId: g.categoryId,
						categoryName: g.categoryName,
						categoryColor: g.categoryColor,
						incomeTotal: 0,
						expenseTotal: 0,
						balance: 0,
						items: []
					};
					map.set(g.categoryId, group);
				}
				group.incomeTotal += g.incomeTotal;
				group.expenseTotal += g.expenseTotal;
				for (const item of g.items) {
					if (!group.items.find((i) => i.id === item.id)) {
						group.items.push(item);
					}
				}
			}
		}
		return Array.from(map.values()).map((g) => ({
			...g,
			balance: g.incomeTotal - g.expenseTotal
		}));
	});

	const monthSummary = $derived(
		calculateMonthSummary($recurringItems, $categories, selectedMonth)
	);

	const rawCategories = $derived(
		$viewMode === 'year' ? yearCategories : monthSummary.categories
	);

	const hasData = $derived(
		$viewMode === 'year'
			? yearSummaries.some((ms) => ms.categories.length > 0)
			: monthSummary.categories.length > 0
	);

	const displayCurrencyValue = $derived($displayCurrency ?? $budget?.currency ?? 'DKK');
	const displayGroups = $derived(
		$exchangeRates && displayCurrencyValue !== ($budget?.currency ?? 'DKK')
			? convertGroups(rawCategories, $budget?.currency ?? 'DKK', displayCurrencyValue, $exchangeRates)
			: rawCategories
	);

	const filteredGroups = $derived(displayGroups.filter((g) => enabledCategoryIds.has(g.categoryId)));

	const filteredIncome = $derived(filteredGroups.reduce((s, g) => s + g.incomeTotal, 0));
	const filteredExpenses = $derived(filteredGroups.reduce((s, g) => s + g.expenseTotal, 0));
	$effect(() => {
		const key = `chartCategoryFilter-${$budget?.id ?? 'default'}`;
		const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
		if (saved) {
			try {
				const savedIds = JSON.parse(saved) as string[];
				const savedSet = new Set(savedIds);
				const displayIds = new Set(displayGroups.map((g) => g.categoryId));
				const valid = new Set(savedIds.filter((id) => displayIds.has(id)));
				for (const id of displayIds) {
					if (!savedSet.has(id)) valid.add(id);
				}
				enabledCategoryIds = valid;
				return;
			} catch {}
		}
		enabledCategoryIds = new Set(displayGroups.map((g) => g.categoryId));
	});

	$effect(() => {
		const key = `chartCategoryFilter-${$budget?.id ?? 'default'}`;
		localStorage.setItem(key, JSON.stringify([...enabledCategoryIds]));
	});

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

	function prevYear() { currentYear--; }
	function nextYear() { currentYear++; }

	function toggleCategory(id: string) {
		const next = new Set(enabledCategoryIds);
		if (next.has(id)) next.delete(id); else next.add(id);
		enabledCategoryIds = next;
	}

	function toggleAll() {
		if (enabledCategoryIds.size === displayGroups.length) {
			enabledCategoryIds = new Set();
		} else {
			enabledCategoryIds = new Set(displayGroups.map((g) => g.categoryId));
		}
	}

	function fmt(amount: number): string {
		return formatDisplay(amount, $budget?.currency ?? 'DKK', $displayCurrency, $exchangeRates);
	}

	if (typeof localStorage !== 'undefined') {
		const saved = localStorage.getItem('displayCurrency');
		if (saved && saved !== 'none') displayCurrency.set(saved as Currency);
	}
</script>

<svelte:head>
	<title>{$t.nav.charts} - Budget Planner</title>
</svelte:head>

<div class="space-y-6">
	<ActionBar {currentYear} {selectedMonth} {prevYear} {nextYear} {prevMonth} {nextMonth} />

	<SummaryCards income={filteredIncome} expense={filteredExpenses} fmt={fmt} />

	{#if hasData}
		<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-6">
			<NestedDonut groups={filteredGroups} currency={displayCurrencyValue} />
		</div>

		<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] divide-y divide-[var(--color-border)]">
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 text-xs font-medium text-gray-500">
				<span class="flex items-center gap-2">
					<input
						type="checkbox"
						checked={enabledCategoryIds.size === displayGroups.length}
						onchange={toggleAll}
						class="w-3.5 h-3.5"
					/>
					{$t.field.category}
				</span>
				<span class="text-right">{$t.summary.totalIncome}</span>
				<span class="text-right">{$t.summary.totalExpenses}</span>
				<span class="text-right">{$t.summary.balance}</span>
			</div>
			{#each displayGroups as group (group.categoryId)}
				{@const isEnabled = enabledCategoryIds.has(group.categoryId)}
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 items-center {isEnabled ? '' : 'opacity-40'}">
					<div class="flex items-center gap-2 min-w-0">
						<input
							type="checkbox"
							checked={isEnabled}
							onchange={() => toggleCategory(group.categoryId)}
							class="w-3.5 h-3.5 shrink-0"
						/>
						<div class="w-3 h-3 rounded-full shrink-0" style="background-color: {group.categoryColor}"></div>
						<span class="text-sm font-medium truncate">{group.categoryName}</span>
					</div>
					<span class="text-right font-mono text-sm" style="color: var(--color-income)">
						{group.incomeTotal > 0 ? fmt(group.incomeTotal) : '—'}
					</span>
					<span class="text-right font-mono text-sm" style="color: var(--color-expense)">
						{group.expenseTotal > 0 ? fmt(group.expenseTotal) : '—'}
					</span>
					<span class="text-right font-mono text-sm font-semibold" style="color: {group.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
						{fmt(group.balance)}
					</span>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-12 text-gray-500">
			{$t.entry.noItems}
		</div>
	{/if}
</div>
