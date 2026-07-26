<script lang="ts">
	import { categories } from '$lib/stores/categories';
	import { recurringItems } from '$lib/stores/recurringItems';
	import { formatDKK } from '$lib/utils/currency';
	import { getMonthlyAmount } from '$lib/utils/budget';
	import { UNCATEGORIZED, isUncategorized } from '$lib/types';
	import type { RecurringItem } from '$lib/types';

	let showModal = $state(false);
	let editingItem = $state<RecurringItem | null>(null);
	let formName = $state('');
	let formAmount = $state(0);
	let formCategoryId = $state(UNCATEGORIZED);
	let formFrequency = $state<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
	let formStartDate = $state(new Date().toISOString().split('T')[0]);
	let formIsActive = $state(true);
	let showMoreOptions = $state(false);

	const expenseItems = $derived($recurringItems.filter((i) => i.type === 'expense'));

	function openAddModal() {
		editingItem = null;
		formName = '';
		formAmount = 0;
		formCategoryId = UNCATEGORIZED;
		formFrequency = 'monthly';
		formStartDate = new Date().toISOString().split('T')[0];
		formIsActive = true;
		showMoreOptions = false;
		showModal = true;
	}

	function openEditModal(item: RecurringItem) {
		editingItem = item;
		formName = item.name;
		formAmount = item.amount;
		formCategoryId = item.categoryId;
		formFrequency = item.frequency;
		formStartDate = new Date(item.startDate).toISOString().split('T')[0];
		formIsActive = item.isActive;
		showMoreOptions = false;
		showModal = true;
	}

	async function handleSubmit() {
		if (!formName.trim()) return;

		const data = {
			name: formName,
			amount: formAmount,
			categoryId: formCategoryId,
			type: 'expense' as const,
			frequency: formFrequency,
			startDate: new Date(formStartDate),
			isActive: formIsActive
		};

		if (editingItem) {
			await recurringItems.update(editingItem.id, data);
		} else {
			await recurringItems.add(data);
		}
		showModal = false;
	}

	async function handleDelete(id: string) {
		if (confirm('Er du sikker på at du vil slette denne udgift?')) {
			await recurringItems.remove(id);
		}
	}

	function getFrequencyLabel(freq: string): string {
		const labels: Record<string, string> = {
			daily: '/dag',
			weekly: '/uge',
			monthly: '/md',
			yearly: '/år'
		};
		return labels[freq] || '';
	}

	function resolveCategory(item: RecurringItem) {
		if (isUncategorized(item.categoryId)) {
			return { name: 'Ingen kategori', color: '#9ca3af' };
		}
		const cat = $categories.find((c) => c.id === item.categoryId);
		return { name: cat?.name || 'Ukendt', color: cat?.color || '#9ca3af' };
	}
</script>

<svelte:head>
	<title>Budget Planner - Udgifter</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold">Udgifter</h2>
		<button
			onclick={openAddModal}
			class="btn-primary"
		>
			Tilføj udgift
		</button>
	</div>

	{#if expenseItems.length === 0}
		<div class="text-center py-12 text-gray-500">
			<p>Ingen udgifter endnu.</p>
			<p class="mt-2">Tilføj din første udgift for at komme i gang.</p>
		</div>
	{:else}
		{@const grouped = Object.entries(
			expenseItems.reduce((acc, item) => {
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
						({items.length} {items.length === 1 ? 'element' : 'elementer'})
					</span>
				</div>
				<div class="divide-y divide-[var(--color-border)]">
					{#each items as item}
						<div class="flex items-center justify-between p-4">
							<div>
								<span class="font-medium">{item.name}</span>
								{#if !item.isActive}
									<span class="ml-2 text-xs text-gray-400">(Inaktiv)</span>
								{/if}
							</div>
							<div class="flex items-center gap-4">
								<span class="font-mono text-[var(--color-expense)]">
									{formatDKK(item.amount)}{getFrequencyLabel(item.frequency)}
								</span>
								<button
									onclick={() => openEditModal(item)}
									class="btn-sm btn-outline"
								>
									Rediger
								</button>
								<button
									onclick={() => handleDelete(item.id)}
									class="btn-sm btn-outline-danger"
								>
									Slet
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
				{editingItem ? 'Rediger udgift' : 'Tilføj udgift'}
			</h3>
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
				<div>
					<label for="exp-name" class="block text-sm font-medium mb-1">Navn</label>
					<input
						id="exp-name"
						type="text"
						bind:value={formName}
						class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]"
						placeholder="f.eks. Netflix, Husleje"
						required
					/>
				</div>
				<div>
					<label for="exp-amount" class="block text-sm font-medium mb-1">Beløb (kr.)</label>
					<input
						id="exp-amount"
						type="number"
						bind:value={formAmount}
						class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]"
						min="0"
						step="1"
						required
					/>
				</div>
				<div>
					<label for="exp-category" class="block text-sm font-medium mb-1">Kategori</label>
					<select
						id="exp-category"
						bind:value={formCategoryId}
						class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]"
					>
						<option value={UNCATEGORIZED}>Ingen kategori</option>
						{#each $categories as cat}
							<option value={cat.id}>{cat.name}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="exp-frequency" class="block text-sm font-medium mb-1">Frekvens</label>
					<select
						id="exp-frequency"
						bind:value={formFrequency}
						class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]"
					>
						<option value="daily">Dagligt</option>
						<option value="weekly">Ugentligt</option>
						<option value="monthly">Månedligt</option>
						<option value="yearly">Årligt</option>
					</select>
				</div>

				<button
					type="button"
					onclick={() => (showMoreOptions = !showMoreOptions)}
					class="text-sm text-[var(--color-primary)] hover:underline"
				>
					{showMoreOptions ? '▲ Færre indstillinger' : '▼ Flere indstillinger'}
				</button>

				{#if showMoreOptions}
					<div class="space-y-4 pt-2 border-t border-[var(--color-border)]">
						<div>
							<label for="exp-startdate" class="block text-sm font-medium mb-1">Startdato</label>
							<input
								id="exp-startdate"
								type="date"
								bind:value={formStartDate}
								class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]"
							/>
						</div>
						<div class="flex items-center gap-2">
							<input
								type="checkbox"
								bind:checked={formIsActive}
								id="exp-isActive"
								class="w-4 h-4"
							/>
							<label for="exp-isActive" class="text-sm">Aktiv</label>
						</div>
					</div>
				{/if}

				<div class="flex justify-end gap-2 pt-4">
					<button
						type="button"
						onclick={() => (showModal = false)}
						class="btn-outline"
					>
						Annuller
					</button>
					<button
						type="submit"
						class="btn-primary"
					>
						{editingItem ? 'Gem' : 'Tilføj'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
