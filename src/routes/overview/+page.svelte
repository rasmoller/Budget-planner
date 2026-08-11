<script lang="ts">
	import { budget } from '$lib/stores/budget';
	import { categories } from '$lib/stores/categories';
	import { recurringItems } from '$lib/stores/recurringItems';
	import {
		calculateMonthSummary,
		generateMonthKeys,
		isItemActiveInMonth,
		getMonthlyAmount,
		getMonthlyAmountRange,
		getEffectiveItem,
		isVariableItem
	} from '$lib/utils/budget';
	import { t } from '$lib/i18n';
	import SummaryCards from '$lib/components/SummaryCards.svelte';
	import ActionBar from '$lib/components/ActionBar.svelte';
	import type { RecurringItem, CategoryGroup, Currency } from '$lib/types';
	import { viewMode } from '$lib/stores/viewMode';
	import { displayCurrency, exchangeRates, formatDisplay } from '$lib/stores/displayCurrency';

	let currentYear = $state(new Date().getFullYear());
	let expandedCategories = $state(new Set<string>());
	let expandedItems = $state(new Set<string>());
	let selectedMonth = $state(
		`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
	);

	const monthKeys = $derived(generateMonthKeys(currentYear));

	const yearSummaries = $derived(
		monthKeys.map((mk) => calculateMonthSummary($recurringItems, $categories, mk))
	);

	const monthSummary = $derived(
		$viewMode === 'month'
			? calculateMonthSummary($recurringItems, $categories, selectedMonth)
			: null
	);

	const yearTotals = $derived({
		income: yearSummaries.reduce((sum, s) => sum + s.totalIncome, 0),
		expense: yearSummaries.reduce((sum, s) => sum + s.totalExpenses, 0),
		balance: yearSummaries.reduce((sum, s) => sum + s.balance, 0)
	});

	function toggleCategory(id: string) {
		const newSet = new Set(expandedCategories);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		expandedCategories = newSet;
	}

	function toggleItem(id: string) {
		const newSet = new Set(expandedItems);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		expandedItems = newSet;
	}

	function formatFrequency(freq: string): string {
		const labels: Record<string, string> = {
			daily: $t.frequency.daily,
			weekly: $t.frequency.weekly,
			monthly: $t.frequency.monthly,
			yearly: $t.frequency.yearly
		};
		return labels[freq] || freq;
	}

	function prevYear() {
		currentYear--;
	}

	function nextYear() {
		currentYear++;
	}

	function prevMonth() {
		const [y, m] = selectedMonth.split('-').map(Number);
		selectedMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
	}

	function nextMonth() {
		const [y, m] = selectedMonth.split('-').map(Number);
		selectedMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
	}

	function getMonthTotals(items: RecurringItem[], mk: string): number {
		return items
			.map((item) => getEffectiveItem(item, mk))
			.filter((item) => isItemActiveInMonth(item, mk))
			.reduce((sum, item) => sum + getMonthlyAmount(item), 0);
	}

	function sortGroups(groups: CategoryGroup[]): CategoryGroup[] {
		return [...groups].sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'da'));
	}

	function fmt(amount: number): string {
		return formatDisplay(amount, $budget?.currency ?? 'DKK', $displayCurrency, $exchangeRates);
	}

	function formatMonthlyAmount(item: RecurringItem): string {
		if (isVariableItem(item)) {
			const { min, max } = getMonthlyAmountRange(item);
			return min === max ? `~${fmt(min)}` : `${fmt(min)}\u2013${fmt(max)}`;
		}
		return fmt(getMonthlyAmount(item));
	}

	if (typeof localStorage !== 'undefined') {
		const saved = localStorage.getItem('displayCurrency');
		if (saved && saved !== 'none') displayCurrency.set(saved as Currency);
	}
</script>

<svelte:head>
	<title>Budget Planner</title>
</svelte:head>

<div class="space-y-6">
	<ActionBar {currentYear} {selectedMonth} {prevYear} {nextYear} {prevMonth} {nextMonth} />

	{#if $viewMode === 'year'}
		{#if $categories.length > 0 && $recurringItems.length > 0}
			{@const allGroups = (() => {
				const map = new Map<string, CategoryGroup>();
				for (const ms of yearSummaries) {
					for (const g of ms.categories) {
						let group = map.get(g.categoryId);
						if (!group) {
							group = {
								...g,
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
				return sortGroups(
					Array.from(map.values()).map((g) => ({ ...g, balance: g.incomeTotal - g.expenseTotal }))
				);
			})()}

			<div class="space-y-3">
				{#each allGroups as group (group.categoryId)}
					{@const isExpanded = expandedCategories.has(group.categoryId)}
					<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
						<button
							onclick={() => toggleCategory(group.categoryId)}
							class="w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-1 p-3 text-left hover:bg-[var(--color-border)] rounded-lg transition-colors"
						>
							<div class="flex items-center gap-2 flex-wrap">
								<span class="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
								<div class="w-3 h-3 rounded-full" style="background-color: {group.categoryColor}"></div>
								<span class="font-medium">{group.categoryName}</span>
							</div>
							<div class="flex items-center gap-2 sm:gap-3 font-mono text-sm flex-wrap">
								{#if group.incomeTotal > 0}
									<span style="color: var(--color-income)">+{fmt(group.incomeTotal)}</span>
								{/if}
								{#if group.expenseTotal > 0}
									<span style="color: var(--color-expense)">-{fmt(group.expenseTotal)}</span>
								{/if}
								<span class="font-semibold" style="color: {group.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
									{fmt(group.balance)}{$t.common.perYear}
								</span>
							</div>
						</button>
						{#if isExpanded}
							<div class="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
								{#each group.items as item}
									{@const itemExpanded = expandedItems.has(item.id)}
									<div>
										<button
											onclick={() => toggleItem(item.id)}
											class="w-full flex flex-wrap items-center justify-between gap-x-2 gap-y-1 p-3 pl-8 sm:pl-10 text-left hover:bg-[var(--color-border)] transition-colors"
										>
											<div class="flex items-center gap-2 flex-wrap">
												<span class="text-gray-400 text-sm">{itemExpanded ? '▼' : '▶'}</span>
												<span class="text-xs px-1.5 py-0.5 rounded {item.type === 'income' ? 'bg-[var(--color-income)]/10 text-[var(--color-income)]' : 'bg-[var(--color-expense)]/10 text-[var(--color-expense)]'}">
													{item.type === 'income' ? $t.summary.income : $t.summary.expense}
												</span>
												<span>{item.name}</span>
												<span class="text-xs text-gray-500">({formatFrequency(item.frequency)})</span>
											</div>
											<span class="font-mono text-sm shrink-0" style="color: {item.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)'}">
												{item.type === 'expense' ? '-' : ''}{formatMonthlyAmount(item)}{$t.common.perMonth}
											</span>
										</button>
										{#if itemExpanded}
											<div class="bg-[var(--color-bg)] border-t border-[var(--color-border)]">
												{#each monthKeys as mk, i}
													{@const effective = getEffectiveItem(item, mk)}
													{@const active = isItemActiveInMonth(effective, mk)}
													<div class="flex justify-between gap-2 px-6 sm:px-14 py-2 text-sm {i % 2 === 0 ? 'bg-[var(--color-surface)]' : ''}">
														<span class="{active ? '' : 'text-gray-400'}">
															{$t.months[i]} {currentYear}
														</span>
														<span class="font-mono {active ? '' : 'text-gray-400'}">
															{active ? formatMonthlyAmount(effective) : '—'}
														</span>
													</div>
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<div class="mt-8">
			<h3 class="text-lg font-semibold mb-3">{$t.nav.overview}</h3>
			<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] divide-y divide-[var(--color-border)]">
				{#each yearSummaries as ms, i}
					<button
						onclick={() => { selectedMonth = ms.month; viewMode.set('month'); }}
						class="w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-1 p-3 text-left hover:bg-[var(--color-border)] transition-colors"
					>
						<span>{$t.months[i]} {currentYear}</span>
						<div class="flex gap-2 sm:gap-4 flex-wrap">
							<span class="font-mono text-sm" style="color: var(--color-income)">
								{fmt(ms.totalIncome)}
							</span>
							<span class="font-mono text-sm" style="color: var(--color-expense)">
								-{fmt(ms.totalExpenses)}
							</span>
							<span
								class="font-mono text-sm font-semibold"
								style="color: {ms.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}"
							>
								{fmt(ms.balance)}
							</span>
						</div>
					</button>
				{/each}
		</div>
	</div>

	<SummaryCards income={yearTotals.income} expense={yearTotals.expense} {fmt} />
	{:else}
		<div class="space-y-4">
			{#if monthSummary}

				{#if monthSummary.categories.length > 0}
					{@const sorted = sortGroups(monthSummary.categories)}
					<div class="space-y-3">
						{#each sorted as group (group.categoryId)}
							{@const isExpanded = expandedCategories.has(group.categoryId + '-month')}
							<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
								<button
									onclick={() => toggleCategory(group.categoryId + '-month')}
									class="w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-1 p-3 text-left hover:bg-[var(--color-border)] rounded-lg transition-colors"
								>
									<div class="flex items-center gap-2 flex-wrap">
										<span class="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
										<div class="w-3 h-3 rounded-full" style="background-color: {group.categoryColor}"></div>
										<span class="font-medium">{group.categoryName}</span>
									</div>
									<div class="flex items-center gap-2 sm:gap-3 font-mono text-sm flex-wrap">
										{#if group.incomeTotal > 0}
											<span style="color: var(--color-income)">+{fmt(group.incomeTotal)}</span>
										{/if}
										{#if group.expenseTotal > 0}
											<span style="color: var(--color-expense)">-{fmt(group.expenseTotal)}</span>
										{/if}
										<span class="font-semibold" style="color: {group.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
											{fmt(group.balance)}
										</span>
									</div>
								</button>
								{#if isExpanded}
									<div class="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
										{#each group.items as item}
											<div class="flex justify-between gap-2 p-3 pl-8 sm:pl-10">
												<span class="min-w-0">
													<span class="text-xs px-1.5 py-0.5 rounded {item.type === 'income' ? 'bg-[var(--color-income)]/10 text-[var(--color-income)]' : 'bg-[var(--color-expense)]/10 text-[var(--color-expense)]'}">
														{item.type === 'income' ? $t.overview.incomeShort : $t.overview.expenseShort}
													</span>
													{item.name}
													<span class="text-xs text-gray-500">({formatFrequency(item.frequency)})</span>
												</span>
												<span class="font-mono shrink-0" style="color: {item.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)'}">
													{item.type === 'expense' ? '-' : ''}{formatMonthlyAmount(item)}
												</span>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-center py-8 text-gray-500">
						{$t.common.noDataForMonth}
					</div>
				{/if}

			<SummaryCards income={monthSummary.totalIncome} expense={monthSummary.totalExpenses} {fmt} />
			{/if}
		</div>
	{/if}
</div>
