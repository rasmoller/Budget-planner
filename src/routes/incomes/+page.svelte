<script lang="ts">
	import { budget } from '$lib/stores/budget';
	import { categories } from '$lib/stores/categories';
	import { recurringItems } from '$lib/stores/recurringItems';
	import { formatCurrency } from '$lib/utils/currency';
	import { getMonthlyAmount } from '$lib/utils/budget';
	import { UNCATEGORIZED, isUncategorized } from '$lib/types';
	import type { RecurringItem, Currency } from '$lib/types';
	import { validateName, validateAmount, type ValidationErrors } from '$lib/utils/validation';
	import { displayCurrency, exchangeRates, formatDisplay } from '$lib/stores/displayCurrency';
	import { t } from '$lib/i18n';

	let showModal = $state(false);
	let editingItem = $state<RecurringItem | null>(null);
	let formName = $state('');
	let formAmount = $state(0);
	let formCategoryId = $state(UNCATEGORIZED);
	let formFrequency = $state<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
	let formIsOneTime = $state(false);
	let formDate = $state(new Date().toISOString().split('T')[0]);
	let formStartDate = $state(new Date().toISOString().split('T')[0]);
	let formIsActive = $state(true);
	let formNotes = $state('');
	let showMoreOptions = $state(false);
	let formErrors = $state<ValidationErrors>({});

	const incomeItems = $derived($recurringItems.filter((i) => i.type === 'income'));

	function openAddModal() {
		editingItem = null;
		formName = '';
		formAmount = 0;
		formCategoryId = UNCATEGORIZED;
		formFrequency = 'monthly';
		formIsOneTime = false;
		formDate = new Date().toISOString().split('T')[0];
		formStartDate = new Date().toISOString().split('T')[0];
		formIsActive = true;
		formNotes = '';
		formErrors = {};
		showMoreOptions = false;
		showModal = true;
	}

	function openEditModal(item: RecurringItem) {
		editingItem = item;
		formName = item.name;
		formAmount = item.amountInCents / 100;
		formCategoryId = item.categoryId;
		formFrequency = item.frequency;
		formIsOneTime = item.isOneTime ?? false;
		formDate = item.date
			? new Date(item.date).toISOString().split('T')[0]
			: new Date(item.startDate).toISOString().split('T')[0];
		formStartDate = new Date(item.startDate).toISOString().split('T')[0];
		formIsActive = item.isActive;
		formNotes = item.notes ?? '';
		formErrors = {};
		showMoreOptions = false;
		showModal = true;
	}

	async function handleSubmit() {
		const nameErr = validateName(formName, $t);
		const amountErr = validateAmount(formAmount, $t);
		formErrors = {};
		if (nameErr) formErrors.name = nameErr;
		if (amountErr) formErrors.amount = amountErr;
		if (nameErr || amountErr) return;

		const data = {
			name: formName,
			amountInCents: Math.round(formAmount * 100),
			categoryId: formCategoryId,
			type: 'income' as const,
			frequency: formFrequency,
			startDate: new Date(formStartDate),
			isActive: formIsActive,
			isOneTime: formIsOneTime,
			date: formIsOneTime ? new Date(formDate) : undefined,
			notes: formNotes || undefined
		};

		if (editingItem) {
			await recurringItems.update(editingItem.id, data);
		} else {
			await recurringItems.add(data);
		}
		showModal = false;
	}

	async function handleDelete(id: string) {
		if (confirm($t.entry.deleteConfirmIncome)) {
			await recurringItems.remove(id);
		}
	}

	async function handleDuplicate(id: string) {
		await recurringItems.duplicate(id);
	}

	function getFrequencyLabel(freq: string): string {
		const labels: Record<string, string> = {
			daily: $t.common.perDay,
			weekly: $t.common.perWeek,
			monthly: $t.common.perMonth,
			yearly: $t.common.perYear
		};
		return labels[freq] || '';
	}

	function resolveCategory(item: RecurringItem) {
		if (isUncategorized(item.categoryId)) {
			return { name: $t.common.uncategorized, color: '#9ca3af' };
		}
		const cat = $categories.find((c) => c.id === item.categoryId);
		return { name: cat?.name || $t.common.unknown, color: cat?.color || '#9ca3af' };
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
	<title>{$t.nav.incomes} - Budget Planner</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<button onclick={() => history.back()} class="btn-ghost p-0.5" aria-label="Back">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clip-rule="evenodd"/></svg>
			</button>
			<h2 class="text-2xl font-bold">{$t.nav.incomes}</h2>
		</div>
		<div class="flex items-center gap-2">
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
				onclick={openAddModal}
				class="btn-primary"
			>
				{$t.entry.addIncome}
			</button>
		</div>
	</div>

	{#if incomeItems.length === 0}
		<div class="text-center py-12 text-gray-500">
			<p>{$t.entry.noItems}</p>
			<p class="mt-2">{$t.entry.createFirstIncome}</p>
		</div>
	{:else}
		{@const grouped = Object.entries(
			incomeItems.reduce((acc, item) => {
				const resolved = resolveCategory(item);
				if (!acc[resolved.name]) acc[resolved.name] = { color: resolved.color, items: [] };
				acc[resolved.name].items.push(item);
				return acc;
			}, {} as Record<string, { color: string; items: RecurringItem[] }>)
		)}

		{#each grouped as [catName, { color, items }]}
			<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
				<div class="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
					<div class="w-3 h-3 rounded-full" style="background-color: {color}"></div>
					<span class="font-semibold">{catName}</span>
					<span class="text-sm text-gray-500">
						({items.length} {items.length === 1 ? $t.common.item : $t.common.items})
					</span>
				</div>
				<div class="divide-y divide-[var(--color-border)]">
					{#each items as item}
						<div class="flex items-center justify-between p-4">
							<div>
								<span class="font-medium">{item.name}</span>
								{#if !item.isActive}
									<span class="ml-2 text-xs text-gray-400">({$t.common.inactive})</span>
								{/if}
							</div>
							<div class="flex items-center gap-4">
								<span class="font-mono text-[var(--color-income)]">
									{fmt(item.amountInCents)}{item.isOneTime ? '' : getFrequencyLabel(item.frequency)}
								</span>
								<button
									onclick={() => handleDuplicate(item.id)}
									class="btn-icon"
									aria-label="{$t.entry.duplicateItem}"
									title="{$t.entry.duplicateItem}"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
										<path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
										<path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
									</svg>
								</button>
								<button
									onclick={() => openEditModal(item)}
									class="btn-sm btn-outline"
								>
									{$t.common.edit}
								</button>
								<button
									onclick={() => handleDelete(item.id)}
									class="btn-sm btn-outline-danger"
								>
									{$t.common.delete}
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>

{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="bg-[var(--color-surface)] rounded-lg p-6 w-full max-w-md mx-4">
			<h3 class="text-lg font-semibold mb-4">
				{editingItem ? $t.entry.editIncome : $t.entry.addIncome}
			</h3>
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
				<div>
					<label for="inc-name" class="block text-sm font-medium mb-1">{$t.field.name}</label>
				<input
					id="inc-name"
					type="text"
					bind:value={formName}
					class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]"
					placeholder="{$t.field.notesPlaceholder}"
					required
				/>
				{#if formErrors.name}
					<p class="text-xs text-[var(--color-danger)] mt-1">{formErrors.name}</p>
				{/if}
			</div>
			<div>
				<label for="inc-amount" class="block text-sm font-medium mb-1">{$t.field.amount}</label>
				<input
					id="inc-amount"
					type="number"
					bind:value={formAmount}
					class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]"
					min="0"
					step="0.01"
					required
				/>
				{#if formErrors.amount}
					<p class="text-xs text-[var(--color-danger)] mt-1">{formErrors.amount}</p>
				{/if}
			</div>
				<div>
					<label for="inc-category" class="block text-sm font-medium mb-1">{$t.field.category}</label>
					<select
						id="inc-category"
						bind:value={formCategoryId}
						class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]"
					>
						<option value={UNCATEGORIZED}>{$t.common.uncategorized}</option>
						{#each $categories as cat}
							<option value={cat.id}>{cat.name}</option>
						{/each}
					</select>
				</div>
				<div class="flex items-center gap-2">
					<input
						id="inc-onetime"
						type="checkbox"
						bind:checked={formIsOneTime}
						class="w-4 h-4"
					/>
					<label for="inc-onetime" class="text-sm font-medium">{$t.entry.oneTime}</label>
					<span class="text-xs text-gray-500">{$t.entry.oneTimeHint}</span>
				</div>
				{#if formIsOneTime}
					<div>
						<label for="inc-date" class="block text-sm font-medium mb-1">{$t.field.date}</label>
						<input
							id="inc-date"
							type="date"
							bind:value={formDate}
							class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]"
							required
						/>
					</div>
				{:else}
					<div>
						<label for="inc-frequency" class="block text-sm font-medium mb-1">{$t.field.frequency}</label>
						<select
							id="inc-frequency"
							bind:value={formFrequency}
							class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]"
						>
							<option value="daily">{$t.frequency.daily}</option>
							<option value="weekly">{$t.frequency.weekly}</option>
							<option value="monthly">{$t.frequency.monthly}</option>
							<option value="yearly">{$t.frequency.yearly}</option>
						</select>
					</div>
				{/if}

				<button
					type="button"
					onclick={() => (showMoreOptions = !showMoreOptions)}
					class="text-sm text-[var(--color-primary)] hover:underline"
				>
					{showMoreOptions ? '▲ ' + $t.common.fewerOptions : '▼ ' + $t.common.moreOptions}
				</button>

				{#if showMoreOptions}
					<div class="space-y-4 pt-2 border-t border-[var(--color-border)]">
						<div>
							<label for="inc-startdate" class="block text-sm font-medium mb-1">{$t.field.startDate}</label>
							<input
								id="inc-startdate"
								type="date"
								bind:value={formStartDate}
								class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]"
							/>
						</div>
						<div>
							<label for="inc-notes" class="block text-sm font-medium mb-1">{$t.field.notes}</label>
							<textarea
								id="inc-notes"
								bind:value={formNotes}
								class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] text-sm"
								placeholder="{$t.field.notesPlaceholder}"
								rows="2"
							></textarea>
						</div>
						<div class="flex items-center gap-2">
							<input
								type="checkbox"
								bind:checked={formIsActive}
								id="inc-isActive"
								class="w-4 h-4"
							/>
							<label for="inc-isActive" class="text-sm">{$t.common.active}</label>
						</div>
					</div>
				{/if}

				<div class="flex justify-end gap-2 pt-4">
					<button
						type="button"
						onclick={() => (showModal = false)}
						class="btn-outline"
					>
						{$t.common.cancel}
					</button>
					<button
						type="submit"
						class="btn-primary"
					>
						{editingItem ? $t.common.save : $t.entry.addIncome}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
