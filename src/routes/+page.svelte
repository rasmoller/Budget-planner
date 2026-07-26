<script lang="ts">
	import { budget } from '$lib/stores/budget';
	import { categories } from '$lib/stores/categories';
	import { recurringItems } from '$lib/stores/recurringItems';
	import { formatDKK } from '$lib/utils/currency';
	import {
		calculateMonthSummary,
		getMonthKey,
		generateMonthKeys,
		getMonthlyAmount,
		isItemActiveInMonth
	} from '$lib/utils/budget';
	import { t } from '$lib/i18n';
	import { UNCATEGORIZED } from '$lib/types';
	import type { RecurringItem, CategoryGroup } from '$lib/types';

	const currentYear = new Date().getFullYear();
	const monthKeys = generateMonthKeys(currentYear);

	let selectedMonth = $state(getMonthKey(new Date()));
	let allDataLoaded = $state(true);

	let catDialog = $state<HTMLDialogElement | null>(null);
	let itemDialog = $state<HTMLDialogElement | null>(null);
	let deleteDialog = $state<HTMLDialogElement | null>(null);

	let editingCategoryId = $state<string | null>(null);
	let editingItemId = $state<string | null>(null);
	let deleteTarget = $state<{ type: 'category' | 'item'; id: string; name: string } | null>(null);

	let catFormName = $state('');
	let catFormColor = $state('#6366f1');

	let itemFormCategoryId = $state('');
	let itemFormType = $state<'income' | 'expense'>('expense');
	let itemFormName = $state('');
	let itemFormAmount = $state(0);
	let itemFormFrequency = $state<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

	let expandedCategories = $state(new Set<string>());

	const defaultColors = [
		'#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
		'#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
	];

	let summary = $derived(
		calculateMonthSummary($recurringItems, $categories, selectedMonth)
	);

	let allCategoryGroups = $derived(() => {
		if (!summary) return [];
		const existingIds = new Set(summary.categories.map((g) => g.categoryId));
		const emptyGroups: CategoryGroup[] = $categories
			.filter((c) => !existingIds.has(c.id))
			.map((c) => ({
				categoryId: c.id,
				categoryName: c.name,
				categoryColor: c.color,
				incomeTotal: 0,
				expenseTotal: 0,
				balance: 0,
				items: []
			}));
		return [...summary.categories, ...emptyGroups];
	});

	function toggleCategory(id: string) {
		const newSet = new Set(expandedCategories);
		if (newSet.has(id)) newSet.delete(id);
		else newSet.add(id);
		expandedCategories = newSet;
	}

	function getFrequencyShort(freq: string): string {
		return { daily: '/dag', weekly: '/uge', monthly: '/md', yearly: '/år' }[freq] || '';
	}

	function openAddCategory() {
		editingCategoryId = null;
		catFormName = '';
		catFormColor = '#6366f1';
		catDialog?.showModal();
	}

	function openEditCategory(id: string, name: string, color: string) {
		editingCategoryId = id;
		catFormName = name;
		catFormColor = color;
		catDialog?.showModal();
	}

	function openAddItem(categoryId: string, type: 'income' | 'expense') {
		editingItemId = null;
		itemFormCategoryId = categoryId;
		itemFormType = type;
		itemFormName = '';
		itemFormAmount = 0;
		itemFormFrequency = 'monthly';
		itemDialog?.showModal();
	}

	function openEditItem(item: RecurringItem) {
		editingItemId = item.id;
		itemFormCategoryId = item.categoryId;
		itemFormType = item.type;
		itemFormName = item.name;
		itemFormAmount = item.amount;
		itemFormFrequency = item.frequency;
		itemDialog?.showModal();
	}

	function openDeleteConfirm(type: 'category' | 'item', id: string, name: string) {
		deleteTarget = { type, id, name };
		deleteDialog?.showModal();
	}

	async function handleSaveCategory() {
		if (!catFormName.trim()) return;
		if (editingCategoryId) {
			await categories.update(editingCategoryId, { name: catFormName, color: catFormColor });
		} else {
			const newCat = await categories.add({ name: catFormName, color: catFormColor });
			if (newCat) expandedCategories = new Set([...expandedCategories, newCat.id]);
		}
		catDialog?.close();
	}

	async function handleSaveItem() {
		if (!itemFormName.trim()) return;
		if (editingItemId) {
			await recurringItems.update(editingItemId, {
				name: itemFormName,
				amount: itemFormAmount,
				type: itemFormType,
				frequency: itemFormFrequency
			});
		} else {
			await recurringItems.add({
				name: itemFormName,
				amount: itemFormAmount,
				categoryId: itemFormCategoryId,
				type: itemFormType,
				frequency: itemFormFrequency,
				startDate: new Date(),
				isActive: true
			});
		}
		itemDialog?.close();
	}

	async function handleDelete() {
		if (!deleteTarget) return;
		if (deleteTarget.type === 'category') {
			const itemsToDelete = $recurringItems.filter((i) => i.categoryId === deleteTarget!.id);
			for (const item of itemsToDelete) {
				await recurringItems.remove(item.id);
			}
			await categories.remove(deleteTarget.id);
		} else {
			await recurringItems.remove(deleteTarget.id);
		}
		deleteDialog?.close();
		deleteTarget = null;
	}

	function getItemsOfType(group: CategoryGroup, type: 'income' | 'expense'): RecurringItem[] {
		return group.items.filter((i) => i.type === type);
	}

	function sortCategories(groups: CategoryGroup[]): CategoryGroup[] {
		return [...groups].sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'da'));
	}
</script>

<svelte:head>
	<title>Budget Planner</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold">{$t.nav.dashboard}</h2>
		<select
			bind:value={selectedMonth}
			class="px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-sm"
		>
			{#each monthKeys as mk}
				<option value={mk}>
					{$t.months[parseInt(mk.split('-')[1]) - 1]} {mk.split('-')[0]}
				</option>
			{/each}
		</select>
	</div>

	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-semibold">{$t.nav.categories}</h3>
			<button
				onclick={openAddCategory}
				class="btn-pill"
			>
				+ {$t.budget.addCategory}
			</button>
		</div>

		{#if allCategoryGroups().length > 0}
			{@const sorted = sortCategories(allCategoryGroups())}
			{#each sorted as group (group.categoryId)}
				{@const isExpanded = expandedCategories.has(group.categoryId)}
				{@const incItems = getItemsOfType(group, 'income')}
				{@const expItems = getItemsOfType(group, 'expense')}
				<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
					<div class="flex items-center w-full">
						<button
							onclick={() => toggleCategory(group.categoryId)}
							class="flex-1 flex items-center justify-between p-4 text-left hover:bg-[var(--color-border)]/30 rounded-l-lg transition-colors"
						>
							<div class="flex items-center gap-3">
								<span class="text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
								<div class="w-3 h-3 rounded-full" style="background-color: {group.categoryColor}"></div>
								<span class="font-medium">{group.categoryName}</span>
								<span class="text-xs text-gray-500">({group.items.length})</span>
							</div>
							<div class="flex items-center gap-4 font-mono text-sm">
								<span style="color: var(--color-income)">+{formatDKK(group.incomeTotal)}</span>
								<span style="color: var(--color-expense)">-{formatDKK(group.expenseTotal)}</span>
								<span class="font-semibold" style="color: {group.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
									{formatDKK(group.balance)}
								</span>
							</div>
						</button>
					<button
						onclick={() => openEditCategory(group.categoryId, group.categoryName, group.categoryColor)}
						class="btn-icon"
						aria-label="Rediger kategori"
					>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
								<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
							</svg>
						</button>
					</div>

					{#if isExpanded}
						<div class="border-t border-[var(--color-border)]">
							{#if incItems.length > 0}
								<div class="px-4 pt-3 pb-1">
									<p class="text-xs font-semibold mb-2" style="color: var(--color-income)">{$t.budget.totalIncome}</p>
									<div class="divide-y divide-[var(--color-border)]">
										{#each incItems as item}
											<div class="flex items-center justify-between py-2">
												<span class="text-sm">{item.name}</span>
												<div class="flex items-center gap-2">
													<span class="font-mono text-sm" style="color: var(--color-income)">
														{formatDKK(item.amount)}{getFrequencyShort(item.frequency)}
													</span>
													<button
														onclick={() => openEditItem(item)}
														class="btn-icon p-1"
														aria-label="Rediger"
													>
														<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
															<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
														</svg>
													</button>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							{#if expItems.length > 0}
								<div class="px-4 pt-3 pb-1">
									<p class="text-xs font-semibold mb-2" style="color: var(--color-expense)">{$t.budget.totalExpenses}</p>
									<div class="divide-y divide-[var(--color-border)]">
										{#each expItems as item}
											<div class="flex items-center justify-between py-2">
												<span class="text-sm">{item.name}</span>
												<div class="flex items-center gap-2">
													<span class="font-mono text-sm" style="color: var(--color-expense)">
														-{formatDKK(item.amount)}{getFrequencyShort(item.frequency)}
													</span>
													<button
														onclick={() => openEditItem(item)}
														class="btn-icon p-1"
														aria-label="Rediger"
													>
														<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
															<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
														</svg>
													</button>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							<div class="flex gap-2 p-3 border-t border-[var(--color-border)]">
								<button
									onclick={() => openAddItem(group.categoryId, 'income')}
									class="flex-1 btn-pill text-[var(--color-income)] hover:bg-[var(--color-income)]/10"
								>
									+ {$t.budget.income}
								</button>
								<button
									onclick={() => openAddItem(group.categoryId, 'expense')}
									class="flex-1 btn-pill text-[var(--color-expense)] hover:bg-[var(--color-expense)]/10"
								>
									+ {$t.budget.expense}
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		{:else if allDataLoaded}
			<div class="text-center py-12 text-gray-500">
				<p class="mb-3">{$t.budget.noCategories}</p>
				<p>{$t.budget.createFirst}</p>
			</div>
		{/if}
	</div>

	{#if summary}
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="p-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
				<p class="text-sm text-gray-500 mb-1">{$t.budget.totalIncome}</p>
				<p class="text-2xl font-bold" style="color: var(--color-income)">
					{formatDKK(summary.totalIncome)}
				</p>
			</div>
			<div class="p-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
				<p class="text-sm text-gray-500 mb-1">{$t.budget.totalExpenses}</p>
				<p class="text-2xl font-bold" style="color: var(--color-expense)">
					{formatDKK(summary.totalExpenses)}
				</p>
			</div>
			<div class="p-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
				<p class="text-sm text-gray-500 mb-1">{$t.budget.balance}</p>
				<p
					class="text-2xl font-bold"
					style="color: {summary.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}"
				>
					{formatDKK(summary.balance)}
				</p>
			</div>
		</div>
	{/if}
</div>

<dialog bind:this={catDialog} class="rounded-lg p-0 max-w-sm w-full backdrop:bg-black/50 place-self-center">
	<div class="p-6">
		<h3 class="text-lg font-semibold mb-4">{editingCategoryId ? $t.budget.editCategory : $t.budget.addCategory}</h3>
		<form onsubmit={(e) => { e.preventDefault(); handleSaveCategory(); }} class="space-y-4">
			<div>
				<label for="bc-name" class="block text-sm font-medium mb-1">{$t.budget.name}</label>
				<input
					id="bc-name"
					type="text"
					bind:value={catFormName}
					class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
					placeholder="{$t.budget.newCategoryPlaceholder}"
					required
				/>
			</div>
			<div>
				<label for="bc-color" class="block text-sm font-medium mb-1">{$t.budget.color}</label>
				<div id="bc-color" class="flex gap-2 flex-wrap">
					{#each defaultColors as color}
						<button
							type="button"
							aria-label="Farve {color}"
							onclick={() => (catFormColor = color)}
							class="w-7 h-7 rounded-full border-2 transition-transform {catFormColor === color
								? 'border-[var(--color-text)] scale-110'
								: 'border-transparent'}"
							style="background-color: {color}"
						></button>
					{/each}
				</div>
			</div>
		<div class="flex justify-between pt-2">
			{#if editingCategoryId}
				<button type="button" onclick={() => { catDialog?.close(); openDeleteConfirm('category', editingCategoryId!, catFormName); }} class="btn-danger">{$t.budget.delete}</button>
			{:else}
				<div></div>
			{/if}
			<div class="flex gap-2">
				<button type="button" onclick={() => catDialog?.close()} class="btn-outline">{$t.budget.cancel}</button>
				<button type="submit" class="btn-primary">{$t.budget.save}</button>
			</div>
		</div>
		</form>
	</div>
</dialog>

<dialog bind:this={itemDialog} class="rounded-lg p-0 max-w-sm w-full backdrop:bg-black/50 place-self-center">
	<div class="p-6">
		<h3 class="text-lg font-semibold mb-4">
			{editingItemId
				? (itemFormType === 'income' ? $t.budget.editIncome : $t.budget.editExpense)
				: (itemFormType === 'income' ? $t.budget.addIncome : $t.budget.addExpense)
			}
		</h3>
		<form onsubmit={(e) => { e.preventDefault(); handleSaveItem(); }} class="space-y-4">
			<div class="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
				<button
					type="button"
					onclick={() => (itemFormType = 'income')}
					class="flex-1 py-2 text-sm font-medium transition-colors {itemFormType === 'income'
						? 'text-white'
						: 'hover:bg-[var(--color-border)]/30'}"
					style={itemFormType === 'income' ? 'background-color: var(--color-income)' : ''}
				>
					{$t.budget.income}
				</button>
				<button
					type="button"
					onclick={() => (itemFormType = 'expense')}
					class="flex-1 py-2 text-sm font-medium transition-colors {itemFormType === 'expense'
						? 'text-white'
						: 'hover:bg-[var(--color-border)]/30'}"
					style={itemFormType === 'expense' ? 'background-color: var(--color-expense)' : ''}
				>
					{$t.budget.expense}
				</button>
			</div>
			<div>
				<label for="bi-name" class="block text-sm font-medium mb-1">{$t.budget.name}</label>
				<input id="bi-name" type="text" bind:value={itemFormName} class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]" placeholder="f.eks. Netflix, Løn" required />
			</div>
			<div>
				<label for="bi-amount" class="block text-sm font-medium mb-1">{$t.budget.amount} (kr.)</label>
				<input id="bi-amount" type="number" bind:value={itemFormAmount} class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]" min="0" step="1" required />
			</div>
			<div>
				<label for="bi-freq" class="block text-sm font-medium mb-1">{$t.budget.frequency}</label>
				<select id="bi-freq" bind:value={itemFormFrequency} class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]">
					<option value="daily">{$t.frequency.daily}</option>
					<option value="weekly">{$t.frequency.weekly}</option>
					<option value="monthly">{$t.frequency.monthly}</option>
					<option value="yearly">{$t.frequency.yearly}</option>
				</select>
			</div>
		<div class="flex justify-between pt-2">
			{#if editingItemId}
				<button type="button" onclick={() => { itemDialog?.close(); openDeleteConfirm('item', editingItemId!, itemFormName); }} class="btn-danger">{$t.budget.delete}</button>
			{:else}
				<div></div>
			{/if}
			<div class="flex gap-2">
				<button type="button" onclick={() => itemDialog?.close()} class="btn-outline">{$t.budget.cancel}</button>
				<button type="submit" class="btn-primary">{$t.budget.save}</button>
			</div>
		</div>
		</form>
	</div>
</dialog>

<dialog bind:this={deleteDialog} class="rounded-lg p-0 max-w-sm w-full backdrop:bg-black/50 place-self-center">
	<div class="p-6">
		<h3 class="text-lg font-semibold mb-2">{$t.budget.confirmDelete}</h3>
		{#if deleteTarget?.type === 'category'}
			<p class="text-sm text-[var(--color-danger)] mb-2">{$t.budget.deleteCategoryWarning}</p>
		{/if}
		<p class="text-sm text-gray-500 mb-4">{deleteTarget?.name}</p>
		<div class="flex justify-end gap-2">
			<button onclick={() => deleteDialog?.close()} class="btn-outline">{$t.budget.cancel}</button>
			<button onclick={handleDelete} class="btn-danger">{$t.budget.delete}</button>
		</div>
	</div>
</dialog>
