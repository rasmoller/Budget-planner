<script lang="ts">
	import { budget } from '$lib/stores/budget';
	import { categories } from '$lib/stores/categories';
	import { recurringItems } from '$lib/stores/recurringItems';
	import { formatCurrency } from '$lib/utils/currency';
	import {
		calculateMonthSummary,
		generateMonthKeys,
		isItemActiveInMonth,
		getMonthlyAmount
	} from '$lib/utils/budget';
	import { t } from '$lib/i18n';
	import type { RecurringItem, CategoryGroup, Currency } from '$lib/types';
	import { displayCurrency, exchangeRates, formatDisplay } from '$lib/stores/displayCurrency';

	let currentYear = $state(new Date().getFullYear());
	let expandedCategories = $state(new Set<string>());
	let expandedItems = $state(new Set<string>());
	let viewMode = $state<'year' | 'month'>('year');
	let selectedMonth = $state(
		`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
	);

	const monthKeys = $derived(generateMonthKeys(currentYear));

	const yearSummaries = $derived(
		monthKeys.map((mk) => calculateMonthSummary($recurringItems, $categories, mk))
	);

	const monthSummary = $derived(
		viewMode === 'month'
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
			daily: 'Dagligt',
			weekly: 'Ugentligt',
			monthly: 'Månedligt',
			yearly: 'Årligt'
		};
		return labels[freq] || freq;
	}

	function prevYear() {
		currentYear--;
	}

	function nextYear() {
		currentYear++;
	}

	function getMonthTotals(items: RecurringItem[], mk: string): number {
		return items
			.filter((item) => isItemActiveInMonth(item, mk))
			.reduce((sum, item) => sum + getMonthlyAmount(item), 0);
	}

	function sortGroups(groups: CategoryGroup[]): CategoryGroup[] {
		return [...groups].sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'da'));
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
	<title>Budget Planner</title>
</svelte:head>

<div class="space-y-6">
		<div class="flex justify-end gap-2 items-center -mt-4 mb-2">
			<select
				value={$displayCurrency ?? 'none'}
				onchange={(e) => {
					const val = (e.target as HTMLSelectElement).value;
					displayCurrency.set(val === 'none' ? null : val as Currency);
					localStorage.setItem('displayCurrency', val);
				}}
				class="px-2 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-sm"
			>
				<option value="none">Auto ({$budget?.currency ?? 'DKK'})</option>
				<option value="DKK">DKK</option>
				<option value="EUR">EUR</option>
				<option value="USD">USD</option>
				<option value="SEK">SEK</option>
				<option value="NOK">NOK</option>
			</select>
			<button
				onclick={() => (viewMode = 'year')}
				class="btn-sm {viewMode === 'year' ? 'btn-primary' : 'btn-outline'}"
			>
				{$t.overview.yearView}
			</button>
			<button
				onclick={() => (viewMode = 'month')}
				class="btn-sm {viewMode === 'month' ? 'btn-primary' : 'btn-outline'}"
			>
				{$t.overview.monthView}
			</button>
		</div>

	{#if viewMode === 'year'}
		<div class="flex items-center justify-center gap-4">
			<button onclick={prevYear} class="btn-sm btn-outline">
				←
			</button>
			<span class="text-xl font-semibold">{currentYear}</span>
			<button onclick={nextYear} class="btn-sm btn-outline">
				→
			</button>
		</div>

		<div class="grid grid-cols-3 gap-4">
			<div class="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
				<p class="text-sm text-gray-500">{$t.budget.totalIncome}</p>
				<p class="text-xl font-bold" style="color: var(--color-income)">
					{fmt(yearTotals.income)}
				</p>
			</div>
			<div class="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
				<p class="text-sm text-gray-500">{$t.budget.totalExpenses}</p>
				<p class="text-xl font-bold" style="color: var(--color-expense)">
					{fmt(yearTotals.expense)}
				</p>
			</div>
			<div class="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
				<p class="text-sm text-gray-500">{$t.budget.balance}</p>
				<p
					class="text-xl font-bold"
					style="color: {yearTotals.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}"
				>
					{fmt(yearTotals.balance)}
				</p>
			</div>
		</div>

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
							class="w-full flex items-center justify-between p-3 text-left hover:bg-[var(--color-border)] rounded-lg transition-colors"
						>
							<div class="flex items-center gap-2">
								<span class="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
								<div class="w-3 h-3 rounded-full" style="background-color: {group.categoryColor}"></div>
								<span class="font-medium">{group.categoryName}</span>
							</div>
							<div class="flex items-center gap-3 font-mono text-sm">
								{#if group.incomeTotal > 0}
									<span style="color: var(--color-income)">+{fmt(group.incomeTotal)}</span>
								{/if}
								{#if group.expenseTotal > 0}
									<span style="color: var(--color-expense)">-{fmt(group.expenseTotal)}</span>
								{/if}
								<span class="font-semibold" style="color: {group.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
									{fmt(group.balance)}/år
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
											class="w-full flex items-center justify-between p-3 pl-10 text-left hover:bg-[var(--color-border)] transition-colors"
										>
											<div class="flex items-center gap-2">
												<span class="text-gray-400 text-sm">{itemExpanded ? '▼' : '▶'}</span>
												<span class="text-xs px-1.5 py-0.5 rounded {item.type === 'income' ? 'bg-[var(--color-income)]/10 text-[var(--color-income)]' : 'bg-[var(--color-expense)]/10 text-[var(--color-expense)]'}">
													{item.type === 'income' ? 'Indtægt' : 'Udgift'}
												</span>
												<span>{item.name}</span>
												<span class="text-xs text-gray-500">({formatFrequency(item.frequency)})</span>
											</div>
											<span class="font-mono text-sm" style="color: {item.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)'}">
												{item.type === 'expense' ? '-' : ''}{fmt(getMonthlyAmount(item))}/md
											</span>
										</button>
										{#if itemExpanded}
											<div class="bg-[var(--color-bg)] border-t border-[var(--color-border)]">
												{#each monthKeys as mk, i}
													{@const active = isItemActiveInMonth(item, mk)}
													<div class="flex justify-between px-14 py-2 text-sm {i % 2 === 0 ? 'bg-[var(--color-surface)]' : ''}">
														<span class="{active ? '' : 'text-gray-400'}">
															{$t.months[i]} {currentYear}
														</span>
														<span class="font-mono {active ? '' : 'text-gray-400'}">
															{active ? fmt(getMonthlyAmount(item)) : '—'}
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
						onclick={() => { selectedMonth = ms.month; viewMode = 'month'; }}
						class="w-full flex items-center justify-between p-3 text-left hover:bg-[var(--color-border)] transition-colors"
					>
						<span>{$t.months[i]} {currentYear}</span>
						<div class="flex gap-4">
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
	{:else}
		<div class="space-y-4">
			<div class="flex items-center justify-center gap-4">
				<button
					onclick={() => {
						const [y, m] = selectedMonth.split('-').map(Number);
						if (m === 1) {
							selectedMonth = `${y - 1}-12`;
						} else {
							selectedMonth = `${y}-${String(m - 1).padStart(2, '0')}`;
						}
					}}
					class="btn-sm btn-outline"
				>
					←
				</button>
				<span class="text-xl font-semibold">
					{$t.months[parseInt(selectedMonth.split('-')[1]) - 1]} {selectedMonth.split('-')[0]}
				</span>
				<button
					onclick={() => {
						const [y, m] = selectedMonth.split('-').map(Number);
						if (m === 12) {
							selectedMonth = `${y + 1}-01`;
						} else {
							selectedMonth = `${y}-${String(m + 1).padStart(2, '0')}`;
						}
					}}
					class="btn-sm btn-outline"
				>
					→
				</button>
			</div>

			{#if monthSummary}
				<div class="grid grid-cols-3 gap-4">
					<div class="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
			<p class="text-sm text-gray-500">{$t.budget.totalIncome}</p>
						<p class="text-xl font-bold" style="color: var(--color-income)">
							{fmt(monthSummary.totalIncome)}
						</p>
					</div>
					<div class="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
			<p class="text-sm text-gray-500">{$t.budget.totalExpenses}</p>
						<p class="text-xl font-bold" style="color: var(--color-expense)">
							{fmt(monthSummary.totalExpenses)}
						</p>
					</div>
					<div class="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
			<p class="text-sm text-gray-500">{$t.budget.balance}</p>
						<p
							class="text-xl font-bold"
							style="color: {monthSummary.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}"
						>
							{fmt(monthSummary.balance)}
						</p>
					</div>
				</div>

				{#if monthSummary.categories.length > 0}
					{@const sorted = sortGroups(monthSummary.categories)}
					<div class="space-y-3">
						{#each sorted as group (group.categoryId)}
							{@const isExpanded = expandedCategories.has(group.categoryId + '-month')}
							<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
								<button
									onclick={() => toggleCategory(group.categoryId + '-month')}
									class="w-full flex items-center justify-between p-3 text-left hover:bg-[var(--color-border)] rounded-lg transition-colors"
								>
									<div class="flex items-center gap-2">
										<span class="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
										<div class="w-3 h-3 rounded-full" style="background-color: {group.categoryColor}"></div>
										<span class="font-medium">{group.categoryName}</span>
									</div>
									<div class="flex items-center gap-3 font-mono text-sm">
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
											<div class="flex justify-between p-3 pl-10">
												<span>
													<span class="text-xs px-1.5 py-0.5 rounded {item.type === 'income' ? 'bg-[var(--color-income)]/10 text-[var(--color-income)]' : 'bg-[var(--color-expense)]/10 text-[var(--color-expense)]'}">
														{item.type === 'income' ? 'I' : 'U'}
													</span>
													{item.name}
													<span class="text-xs text-gray-500">({formatFrequency(item.frequency)})</span>
												</span>
												<span class="font-mono" style="color: {item.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)'}">
													{item.type === 'expense' ? '-' : ''}{fmt(getMonthlyAmount(item))}
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
						Ingen data for denne måned.
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>
