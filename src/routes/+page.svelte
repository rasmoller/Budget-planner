<script lang="ts">
	import { budget } from '$lib/stores/budget';
	import { categories } from '$lib/stores/categories';
	import { recurringItems } from '$lib/stores/recurringItems';
	import { formatCurrency } from '$lib/utils/currency';
	import { displayCurrency, exchangeRates, formatDisplay } from '$lib/stores/displayCurrency';
	import {
		calculateMonthSummary,
		getMonthKey,
		generateMonthKeys,
		getMonthlyAmount,
		getItemAmountRange,
		isVariableItem,
		isItemActiveInMonth
	} from '$lib/utils/budget';
	import { t } from '$lib/i18n';
	import SummaryCards from '$lib/components/SummaryCards.svelte';
	import { UNCATEGORIZED } from '$lib/types';
	import type { RecurringItem, CategoryGroup, Currency, ScheduledChange } from '$lib/types';
	import { openAllBudgets } from '$lib/stores/dialogs';
	import { validateName, validateAmount, type ValidationErrors } from '$lib/utils/validation';

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
	let catFormErrors = $state<ValidationErrors>({});

	let itemFormCategoryId = $state('');
	let itemFormType = $state<'income' | 'expense'>('expense');
	let itemFormName = $state('');
	let itemFormAmount = $state(0);
	let itemFormFrequency = $state<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
	let itemFormPostKind = $state<'standard' | 'oneTime' | 'variable'>('standard');
	let itemFormDate = $state('');
	let itemFormMin = $state('');
	let itemFormMax = $state('');
	let itemFormNotes = $state('');
	let itemFormErrors = $state<ValidationErrors>({});

	type ChangeForm = { id: string; effectiveDate: string; amount: string; status: 'keep' | 'active' | 'inactive' };
	let itemFormFutureChanges = $state<ChangeForm[]>([]);

	function addFutureChange() {
		itemFormFutureChanges = [
			...itemFormFutureChanges,
			{ id: crypto.randomUUID(), effectiveDate: new Date().toISOString().split('T')[0], amount: '', status: 'keep' }
		];
	}

	function removeFutureChange(id: string) {
		itemFormFutureChanges = itemFormFutureChanges.filter((c) => c.id !== id);
	}

	let expandedCategories = $state(new Set<string>());
	let draggedCategoryId = $state<string | null>(null);
	let displayOrder = $state<string[]>([]);
	let originalOrder = $state<string[]>([]);
	let isDragging = $state(false);

	if (typeof localStorage !== 'undefined') {
		const saved = localStorage.getItem('displayCurrency');
		if (saved && saved !== 'none') displayCurrency.set(saved as Currency);
	}

	const defaultColors = [
		'#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
		'#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
	];

	let summary = $derived(
		calculateMonthSummary($recurringItems, $categories, selectedMonth)
	);

	let allCategoryGroups = $derived.by(() => {
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
		return { daily: $t.common.perDay, weekly: $t.common.perWeek, monthly: $t.common.perMonth, yearly: $t.common.perYear }[freq] || '';
	}

	function openAddCategory() {
		editingCategoryId = null;
		catFormName = '';
		catFormColor = '#6366f1';
		catFormErrors = {};
		catDialog?.showModal();
	}

	function openEditCategory(id: string, name: string, color: string) {
		editingCategoryId = id;
		catFormName = name;
		catFormColor = color;
		catFormErrors = {};
		catDialog?.showModal();
	}

	function openAddItem(categoryId: string, type: 'income' | 'expense') {
		editingItemId = null;
		itemFormCategoryId = categoryId;
		itemFormType = type;
		itemFormName = '';
		itemFormAmount = 0;
		itemFormFrequency = 'monthly';
		itemFormPostKind = 'standard';
		itemFormDate = new Date().toISOString().split('T')[0];
		itemFormMin = '';
		itemFormMax = '';
		itemFormNotes = '';
		itemFormFutureChanges = [];
		itemFormErrors = {};
		itemDialog?.showModal();
	}

	function openEditItem(item: RecurringItem) {
		editingItemId = item.id;
		itemFormCategoryId = item.categoryId;
		itemFormType = item.type;
		itemFormName = item.name;
		itemFormAmount = item.amountInCents / 100;
		itemFormFrequency = item.frequency;
		itemFormPostKind = item.isOneTime ? 'oneTime' : item.isVariable ? 'variable' : 'standard';
		itemFormDate = item.date
			? new Date(item.date).toISOString().split('T')[0]
			: new Date(item.startDate).toISOString().split('T')[0];
		itemFormMin = item.minAmountInCents !== undefined ? String(item.minAmountInCents / 100) : '';
		itemFormMax = item.maxAmountInCents !== undefined ? String(item.maxAmountInCents / 100) : '';
		itemFormNotes = item.notes ?? '';
		itemFormFutureChanges = (item.futureChanges ?? []).map((c) => ({
			id: c.id,
			effectiveDate: new Date(c.effectiveDate).toISOString().split('T')[0],
			amount: c.amountInCents !== undefined ? String(c.amountInCents / 100) : '',
			status: c.isActive === undefined ? 'keep' : c.isActive ? 'active' : 'inactive'
		}));
		itemFormErrors = {};
		itemDialog?.showModal();
	}

	function openDeleteConfirm(type: 'category' | 'item', id: string, name: string) {
		deleteTarget = { type, id, name };
		deleteDialog?.showModal();
	}

	async function handleSaveCategory() {
		const nameErr = validateName(catFormName, $t);
		catFormErrors = {};
		if (nameErr) {
			catFormErrors = { name: nameErr };
			return;
		}
		if (editingCategoryId) {
			await categories.update(editingCategoryId, { name: catFormName, color: catFormColor });
		} else {
			const newCat = await categories.add({ name: catFormName, color: catFormColor });
			if (newCat) expandedCategories = new Set([...expandedCategories, newCat.id]);
		}
		catDialog?.close();
	}

	async function handleSaveItem() {
		const nameErr = validateName(itemFormName, $t);
		const amountErr = validateAmount(itemFormAmount, $t);
		itemFormErrors = {};
		if (nameErr) itemFormErrors.name = nameErr;
		if (amountErr) itemFormErrors.amount = amountErr;
		if (nameErr || amountErr) return;
		const amountInOre = Math.round(itemFormAmount * 100);
		const futureChanges: ScheduledChange[] = itemFormFutureChanges
			.filter((c) => c.effectiveDate)
			.map((c) => ({
				id: c.id,
				effectiveDate: new Date(c.effectiveDate),
				...(c.amount !== '' ? { amountInCents: Math.round(parseFloat(c.amount) * 100) } : {}),
				...(c.status !== 'keep' ? { isActive: c.status === 'active' } : {}),
				createdAt: new Date()
			}));
		if (editingItemId) {
			await recurringItems.update(editingItemId, {
				name: itemFormName,
				amountInCents: amountInOre,
				type: itemFormType,
				frequency: itemFormFrequency,
				isOneTime: itemFormPostKind === 'oneTime',
				date: itemFormPostKind === 'oneTime' ? new Date(itemFormDate) : undefined,
				isVariable: itemFormPostKind === 'variable',
				minAmountInCents: itemFormPostKind === 'variable' && itemFormMin !== '' ? Math.round(parseFloat(itemFormMin) * 100) : undefined,
				maxAmountInCents: itemFormPostKind === 'variable' && itemFormMax !== '' ? Math.round(parseFloat(itemFormMax) * 100) : undefined,
				futureChanges,
				notes: itemFormNotes || undefined
			});
		} else {
			await recurringItems.add({
				name: itemFormName,
				amountInCents: amountInOre,
				categoryId: itemFormCategoryId,
				type: itemFormType,
				frequency: itemFormFrequency,
				startDate: new Date(),
				isActive: true,
				isOneTime: itemFormPostKind === 'oneTime',
				date: itemFormPostKind === 'oneTime' ? new Date(itemFormDate) : undefined,
				isVariable: itemFormPostKind === 'variable',
				minAmountInCents: itemFormPostKind === 'variable' && itemFormMin !== '' ? Math.round(parseFloat(itemFormMin) * 100) : undefined,
				maxAmountInCents: itemFormPostKind === 'variable' && itemFormMax !== '' ? Math.round(parseFloat(itemFormMax) * 100) : undefined,
				futureChanges,
				notes: itemFormNotes || undefined
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

	async function handleDuplicateCategory(categoryId: string) {
		await categories.duplicate(categoryId);
	}

	async function handleDuplicateItem(itemId: string) {
		await recurringItems.duplicate(itemId);
	}

	function getItemsOfType(group: CategoryGroup, type: 'income' | 'expense'): RecurringItem[] {
		return group.items.filter((i) => i.type === type);
	}

	function sortCategories(groups: CategoryGroup[]): CategoryGroup[] {
		if (isDragging && displayOrder.length > 0) {
			const groupMap = new Map(groups.map((g) => [g.categoryId, g]));
			return displayOrder
				.filter((id) => groupMap.has(id))
				.map((id) => groupMap.get(id)!);
		}
		const catOrder = new Map($categories.map((c) => [c.id, c.order]));
		return [...groups].sort((a, b) => {
			const orderA = catOrder.get(a.categoryId) ?? 0;
			const orderB = catOrder.get(b.categoryId) ?? 0;
			return orderA - orderB;
		});
	}

	function handleDragStart(e: DragEvent, categoryId: string) {
		draggedCategoryId = categoryId;
		isDragging = true;
		const currentGroups = sortCategories(allCategoryGroups);
		const ids = currentGroups.map((g) => g.categoryId);
		displayOrder = [...ids];
		originalOrder = [...ids];
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', categoryId);
		}
	}

	function handleDragOver(e: DragEvent, categoryId: string) {
		e.preventDefault();
		if (!draggedCategoryId || draggedCategoryId === categoryId || !isDragging) return;
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		const fromIndex = displayOrder.indexOf(draggedCategoryId);
		const toIndex = displayOrder.indexOf(categoryId);
		if (fromIndex === -1 || toIndex === -1) return;
		const newOrder = [...displayOrder];
		newOrder.splice(fromIndex, 1);
		newOrder.splice(toIndex, 0, draggedCategoryId);
		displayOrder = newOrder;
	}

	function handleDragLeave(_e: DragEvent, categoryId: string) {
		if (draggedCategoryId === categoryId) {
			return;
		}
	}

	async function handleDrop(e: DragEvent, _targetCategoryId: string) {
		e.preventDefault();
		if (!draggedCategoryId) return;
		await categories.reorder(displayOrder);
		draggedCategoryId = null;
		isDragging = false;
		displayOrder = [];
		originalOrder = [];
	}

	function handleDragEnd() {
		if (isDragging && draggedCategoryId) {
			displayOrder = [...originalOrder];
		}
		draggedCategoryId = null;
		isDragging = false;
		displayOrder = [];
		originalOrder = [];
	}

	function fmt(amount: number): string {
		return formatDisplay(amount, $budget?.currency ?? 'DKK', $displayCurrency, $exchangeRates);
	}

	function formatItemAmount(item: RecurringItem): string {
		const freq = item.isOneTime ? '' : getFrequencyShort(item.frequency);
		if (isVariableItem(item)) {
			const { min, max } = getItemAmountRange(item);
			const text = min === max ? `~${fmt(min)}` : `${fmt(min)}\u2013${fmt(max)}`;
			return text + freq;
		}
		return fmt(item.amountInCents) + freq;
	}

	function changeDisplayCurrency(e: Event) {
		const val = (e.target as HTMLSelectElement).value as Currency | 'none';
		displayCurrency.set(val === 'none' ? null : val);
		localStorage.setItem('displayCurrency', val);
	}
</script>

<svelte:head>
	<title>Budget Planner</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-end gap-2 -mt-4 mb-2">
		{#if $budget}
			<button
				onclick={() => openAllBudgets.update((n) => n + 1)}
				class="flex items-center gap-1 px-3 py-1.5 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] hover:bg-[var(--color-border)]/30 transition-colors text-sm"
			>
				{$budget.name}
				<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
			</button>
		{/if}
		<select
			value={$displayCurrency ?? 'none'}
			onchange={changeDisplayCurrency}
			class="px-2 py-1.5 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-sm"
		>
			<option value="none">Auto ({$budget?.currency ?? 'DKK'})</option>
			<option value="DKK">DKK</option>
			<option value="EUR">EUR</option>
			<option value="USD">USD</option>
			<option value="SEK">SEK</option>
			<option value="NOK">NOK</option>
		</select>
		<select
			bind:value={selectedMonth}
			class="px-3 py-1.5 border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-sm"
		>
			{#each monthKeys as mk}
				<option value={mk}>
					{$t.months[parseInt(mk.split('-')[1]) - 1]} {mk.split('-')[0]}
				</option>
			{/each}
		</select>
	</div>

	<div class="space-y-3">
		{#if allCategoryGroups.length > 0}
			{@const sorted = sortCategories(allCategoryGroups)}
			{#each sorted as group (group.categoryId)}
				{@const isExpanded = expandedCategories.has(group.categoryId)}
				{@const incItems = getItemsOfType(group, 'income')}
				{@const expItems = getItemsOfType(group, 'expense')}
				<div
					class="category-row rounded-lg border bg-[var(--color-surface)] transition-opacity {draggedCategoryId === group.categoryId ? 'opacity-40' : 'border-[var(--color-border)]'}"
					role="listitem"
					ondragover={(e) => handleDragOver(e, group.categoryId)}
					ondragleave={(e) => handleDragLeave(e, group.categoryId)}
					ondrop={(e) => handleDrop(e, group.categoryId)}
				>
					<div class="flex items-center w-full">
					<div
						class="cursor-grab active:cursor-grabbing px-2 text-gray-400 hover:text-gray-600 transition-colors"
						role="button"
						tabindex="-1"
						draggable="true"
						ondragstart={(e) => handleDragStart(e, group.categoryId)}
						ondragend={handleDragEnd}
					>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
								<path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
							</svg>
						</div>
					<button
						onclick={() => toggleCategory(group.categoryId)}
						class="flex-1 flex items-center justify-between gap-2 p-4 text-left rounded-l-lg transition-colors min-w-0"
					>
						<div class="flex items-center gap-3 flex-1 min-w-0">
							<span class="text-gray-400 text-xs shrink-0">{isExpanded ? '▼' : '▶'}</span>
							<div class="w-3 h-3 rounded-full shrink-0" style="background-color: {group.categoryColor}"></div>
							<span class="font-medium truncate">{group.categoryName}</span>
							<span class="text-xs text-gray-500 shrink-0">({group.items.length})</span>
						</div>
						<div class="flex items-center gap-2 sm:gap-4 font-mono text-sm shrink-0">
								<span style="color: var(--color-income)">+{fmt(group.incomeTotal)}</span>
								<span style="color: var(--color-expense)">-{fmt(group.expenseTotal)}</span>
								<span class="font-semibold" style="color: {group.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}">
									{fmt(group.balance)}
								</span>
							</div>
						</button>
					<div class="flex items-center gap-1 mr-2">
						<button
							onclick={() => handleDuplicateCategory(group.categoryId)}
							class="btn-icon"
							aria-label="{$t.category.duplicateCategory}"
							title="{$t.category.duplicateCategory}"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
								<path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
								<path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
							</svg>
						</button>
						<button
							onclick={() => openEditCategory(group.categoryId, group.categoryName, group.categoryColor)}
							class="btn-icon"
							aria-label={$t.category.editCategory}
						>
								<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
									<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
								</svg>
							</button>
					</div>
					</div>

					{#if isExpanded}
						<div class="border-t border-[var(--color-border)]">
							{#if incItems.length > 0}
								<div class="px-4 pt-3 pb-1">
									<p class="text-xs font-semibold mb-2" style="color: var(--color-income)">{$t.summary.totalIncome}</p>
									<div class="divide-y divide-[var(--color-border)]">
										{#each incItems as item}
											<div class="flex items-center justify-between gap-2 py-2">
												<span class="text-sm min-w-0 truncate">{item.name}</span>
												<div class="flex items-center gap-1 sm:gap-2 shrink-0">
													<span class="font-mono text-sm shrink-0" style="color: var(--color-income)">
														{formatItemAmount(item)}
													</span>
													<button
														onclick={() => handleDuplicateItem(item.id)}
														class="btn-icon p-1"
														aria-label="{$t.entry.duplicateItem}"
														title="{$t.entry.duplicateItem}"
													>
														<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
															<path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
															<path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
														</svg>
													</button>
													<button
														onclick={() => openEditItem(item)}
														class="btn-icon p-1"
														aria-label="{$t.common.edit} {item.name}"
													>
														<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
															<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
														</svg>
													</button>
													<button
														onclick={() => openDeleteConfirm('item', item.id, item.name)}
														class="btn-icon p-1 btn-icon-danger"
														aria-label="{$t.common.delete} {item.name}"
													>
														<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
															<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
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
									<p class="text-xs font-semibold mb-2" style="color: var(--color-expense)">{$t.summary.totalExpenses}</p>
									<div class="divide-y divide-[var(--color-border)]">
										{#each expItems as item}
											<div class="flex items-center justify-between gap-2 py-2">
												<span class="text-sm min-w-0 truncate">{item.name}</span>
												<div class="flex items-center gap-1 sm:gap-2 shrink-0">
													<span class="font-mono text-sm shrink-0" style="color: var(--color-expense)">
														-{formatItemAmount(item)}
													</span>
													<button
														onclick={() => handleDuplicateItem(item.id)}
														class="btn-icon p-1"
														aria-label="{$t.entry.duplicateItem}"
														title="{$t.entry.duplicateItem}"
													>
														<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
															<path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
															<path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
														</svg>
													</button>
													<button
														onclick={() => openEditItem(item)}
														class="btn-icon p-1"
														aria-label="{$t.common.edit} {item.name}"
													>
														<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
															<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
														</svg>
													</button>
													<button
														onclick={() => openDeleteConfirm('item', item.id, item.name)}
														class="btn-icon p-1 btn-icon-danger"
														aria-label="{$t.common.delete} {item.name}"
													>
														<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
															<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
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
									+ {$t.summary.income}
								</button>
								<button
									onclick={() => openAddItem(group.categoryId, 'expense')}
									class="flex-1 btn-pill text-[var(--color-expense)] hover:bg-[var(--color-expense)]/10"
								>
									+ {$t.summary.expense}
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		{:else if allDataLoaded}
			<div class="text-center py-12 text-gray-500">
				<p class="mb-3">{$t.category.noCategories}</p>
				<p>{$t.category.createFirst}</p>
			</div>
		{/if}

		<div class="flex justify-center">
			<button
				onclick={openAddCategory}
				class="btn-pill"
			>
				+ {$t.category.addCategory}
			</button>
		</div>
	</div>

	{#if summary}
		<SummaryCards income={summary.totalIncome} expense={summary.totalExpenses} {fmt} />
	{/if}
</div>

<dialog bind:this={catDialog} class="rounded-lg p-0 max-w-sm w-full backdrop:bg-black/50 place-self-center">
	<div class="p-6">
		<h3 class="text-lg font-semibold mb-4">{editingCategoryId ? $t.category.editCategory : $t.category.addCategory}</h3>
		<form onsubmit={(e) => { e.preventDefault(); handleSaveCategory(); }} class="space-y-4">
			<div>
				<label for="bc-name" class="block text-sm font-medium mb-1">{$t.field.name}</label>
				<input
					id="bc-name"
					type="text"
					bind:value={catFormName}
					class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] text-[var(--color-text)]"
					placeholder="{$t.field.newCategoryPlaceholder}"
					required
				/>
				{#if catFormErrors.name}
					<p class="text-xs text-[var(--color-danger)] mt-1">{catFormErrors.name}</p>
				{/if}
			</div>
			<div>
				<label for="bc-color" class="block text-sm font-medium mb-1">{$t.field.color}</label>
				<div id="bc-color" class="flex gap-2 flex-wrap items-center">
					{#each defaultColors as color}
						<button
							type="button"
							aria-label={$t.common.customColor + ' ' + color}
							onclick={() => (catFormColor = color)}
							class="w-7 h-7 rounded-full border-2 transition-transform {catFormColor === color
								? 'border-[var(--color-text)] scale-110'
								: 'border-transparent'}"
							style="background-color: {color}"
						></button>
					{/each}
					<label
						for="bc-custom-color"
						class="w-7 h-7 rounded-full border-2 border-dashed border-[var(--color-border)] cursor-pointer flex items-center justify-center text-[10px] text-gray-400 hover:border-[var(--color-text)] transition-colors"
						title={$t.common.customColor}
					>
						+
					</label>
					<input
						id="bc-custom-color"
						type="color"
						bind:value={catFormColor}
						class="w-7 h-7 rounded-full cursor-pointer border-0 p-0"
					/>
				</div>
			</div>
		<div class="flex justify-between pt-2">
			{#if editingCategoryId}
				<button type="button" onclick={() => { catDialog?.close(); openDeleteConfirm('category', editingCategoryId!, catFormName); }} class="btn-danger">{$t.common.delete}</button>
			{:else}
				<div></div>
			{/if}
			<div class="flex gap-2">
				<button type="button" onclick={() => catDialog?.close()} class="btn-outline">{$t.common.cancel}</button>
				<button type="submit" class="btn-primary">{$t.common.save}</button>
			</div>
		</div>
		</form>
	</div>
</dialog>

<dialog bind:this={itemDialog} class="rounded-lg p-0 max-w-sm w-full backdrop:bg-black/50 place-self-center">
	<div class="p-6">
		<h3 class="text-lg font-semibold mb-4">
			{editingItemId
				? (itemFormType === 'income' ? $t.entry.editIncome : $t.entry.editExpense)
				: (itemFormType === 'income' ? $t.entry.addIncome : $t.entry.addExpense)
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
					{$t.summary.income}
				</button>
				<button
					type="button"
					onclick={() => (itemFormType = 'expense')}
					class="flex-1 py-2 text-sm font-medium transition-colors {itemFormType === 'expense'
						? 'text-white'
						: 'hover:bg-[var(--color-border)]/30'}"
					style={itemFormType === 'expense' ? 'background-color: var(--color-expense)' : ''}
				>
					{$t.summary.expense}
				</button>
			</div>
			<div>
				<label for="bi-name" class="block text-sm font-medium mb-1">{$t.field.name}</label>
				<input id="bi-name" type="text" bind:value={itemFormName} class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]" placeholder={$t.field.notesPlaceholder} required />
				{#if itemFormErrors.name}
					<p class="text-xs text-[var(--color-danger)] mt-1">{itemFormErrors.name}</p>
				{/if}
			</div>
			<div>
				<label for="bi-amount" class="block text-sm font-medium mb-1">{itemFormPostKind === 'variable' ? $t.field.estimate : $t.field.amount}</label>
				<input id="bi-amount" type="number" bind:value={itemFormAmount} class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]" min="0" step="0.01" required />
				{#if itemFormErrors.amount}
					<p class="text-xs text-[var(--color-danger)] mt-1">{itemFormErrors.amount}</p>
				{/if}
			</div>
			<div>
				<div class="segmented">
					<button
						type="button"
						onclick={() => (itemFormPostKind = 'standard')}
						class="segmented-btn {itemFormPostKind === 'standard' ? 'segmented-btn-active' : ''}"
					>
						{$t.entry.standard}
					</button>
					<button
						type="button"
						onclick={() => (itemFormPostKind = 'oneTime')}
						class="segmented-btn {itemFormPostKind === 'oneTime' ? 'segmented-btn-active' : ''}"
					>
						{$t.entry.oneTime}
					</button>
					<button
						type="button"
						onclick={() => (itemFormPostKind = 'variable')}
						class="segmented-btn {itemFormPostKind === 'variable' ? 'segmented-btn-active' : ''}"
					>
						{$t.entry.variable}
					</button>
				</div>
				<p class="text-xs text-gray-500 mt-1">
					{itemFormPostKind === 'oneTime'
						? $t.entry.oneTimeHint
						: itemFormPostKind === 'variable'
							? $t.entry.variableHint
							: $t.entry.standardHint}
				</p>
			</div>
			{#if itemFormPostKind === 'variable'}
				<div class="grid grid-cols-2 gap-2">
					<div>
						<label for="bi-min" class="block text-xs font-medium mb-1">{$t.field.min}</label>
						<input
							id="bi-min"
							type="number"
							min="0"
							step="0.01"
							bind:value={itemFormMin}
							class="w-full px-2 py-1.5 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] text-sm"
							placeholder="{$t.field.min}"
						/>
					</div>
					<div>
						<label for="bi-max" class="block text-xs font-medium mb-1">{$t.field.max}</label>
						<input
							id="bi-max"
							type="number"
							min="0"
							step="0.01"
							bind:value={itemFormMax}
							class="w-full px-2 py-1.5 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] text-sm"
							placeholder="{$t.field.max}"
						/>
					</div>
				</div>
				<p class="text-xs text-gray-500">{$t.field.rangeHint}</p>
			{/if}
			{#if itemFormPostKind === 'oneTime'}
				<div>
					<label for="bi-date" class="block text-sm font-medium mb-1">{$t.field.date}</label>
					<input
						id="bi-date"
						type="date"
						bind:value={itemFormDate}
						class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]"
						required
					/>
				</div>
			{:else}
				<div>
					<label for="bi-freq" class="block text-sm font-medium mb-1">{$t.field.frequency}</label>
					<select id="bi-freq" bind:value={itemFormFrequency} class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]">
						<option value="daily">{$t.frequency.daily}</option>
						<option value="weekly">{$t.frequency.weekly}</option>
						<option value="monthly">{$t.frequency.monthly}</option>
						<option value="yearly">{$t.frequency.yearly}</option>
					</select>
				</div>
			{/if}
			<div class="pt-2 border-t border-[var(--color-border)]">
				<div class="flex items-start justify-between mb-2 gap-2">
					<div>
						<p class="text-sm font-medium">{$t.futureChanges.title}</p>
						<p class="text-xs text-gray-500">{$t.futureChanges.hint}</p>
					</div>
					<button
						type="button"
						onclick={addFutureChange}
						class="btn-pill shrink-0 text-xs"
					>
						+ {$t.futureChanges.add}
					</button>
				</div>
				{#if itemFormFutureChanges.length > 0}
					<div class="space-y-2">
						{#each itemFormFutureChanges as change}
							<div class="p-3 border border-[var(--color-border)] rounded-md space-y-2">
								<div class="grid grid-cols-2 gap-2">
									<div>
										<label for={change.id + '-date'} class="block text-xs font-medium mb-1">{$t.futureChanges.effectiveDate}</label>
										<input
											id={change.id + '-date'}
											type="date"
											bind:value={change.effectiveDate}
											class="w-full px-2 py-1.5 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] text-sm"
										/>
									</div>
									<div>
										<label for={change.id + '-amount'} class="block text-xs font-medium mb-1">{$t.futureChanges.newAmount}</label>
										<input
											id={change.id + '-amount'}
											type="number"
											min="0"
											step="0.01"
											bind:value={change.amount}
											class="w-full px-2 py-1.5 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] text-sm"
											placeholder="{$t.field.amount}"
										/>
									</div>
								</div>
								<div class="flex items-center justify-between">
									<select
										bind:value={change.status}
										class="px-2 py-1.5 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] text-sm"
									>
										<option value="keep">{$t.futureChanges.keep}</option>
										<option value="active">{$t.common.active}</option>
										<option value="inactive">{$t.common.inactive}</option>
									</select>
									<button
										type="button"
										onclick={() => removeFutureChange(change.id)}
										class="btn-icon btn-icon-danger"
										aria-label="{$t.futureChanges.remove}"
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
										</svg>
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
			<div>
				<label for="bi-notes" class="block text-sm font-medium mb-1">{$t.field.notes}</label>
				<textarea
					id="bi-notes"
					bind:value={itemFormNotes}
					class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] text-sm"
					placeholder="{$t.field.notesPlaceholder}"
					rows="2"
				></textarea>
			</div>
		<div class="flex justify-between pt-2">
			{#if editingItemId}
				<button type="button" onclick={() => { itemDialog?.close(); openDeleteConfirm('item', editingItemId!, itemFormName); }} class="btn-danger">{$t.common.delete}</button>
			{:else}
				<div></div>
			{/if}
			<div class="flex gap-2">
				<button type="button" onclick={() => itemDialog?.close()} class="btn-outline">{$t.common.cancel}</button>
				<button type="submit" class="btn-primary">{$t.common.save}</button>
			</div>
		</div>
		</form>
	</div>
</dialog>

<dialog bind:this={deleteDialog} class="rounded-lg p-0 max-w-sm w-full backdrop:bg-black/50 place-self-center">
	<div class="p-6">
		<h3 class="text-lg font-semibold mb-2">{$t.common.confirmDelete}</h3>
		{#if deleteTarget?.type === 'category'}
			<p class="text-sm text-[var(--color-danger)] mb-2">{$t.category.deleteCategoryWarning}</p>
		{/if}
		<p class="text-sm text-gray-500 mb-4">{deleteTarget?.name}</p>
		<div class="flex justify-end gap-2">
			<button onclick={() => deleteDialog?.close()} class="btn-outline">{$t.common.cancel}</button>
			<button onclick={handleDelete} class="btn-danger">{$t.common.delete}</button>
		</div>
	</div>
</dialog>


