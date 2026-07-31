<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { setLanguage, currentLanguage, t, type Language } from '$lib/i18n';
	import { budget, allBudgets } from '$lib/stores/budget';
	import { categories } from '$lib/stores/categories';
	import { recurringItems } from '$lib/stores/recurringItems';
	import { onMount } from 'svelte';
	import { db } from '$lib/db/schema';

	let { children } = $props();

	let currentPath = $derived(page.url.pathname);

	let budgetDialog: HTMLDialogElement;
	let deleteBudgetDialog: HTMLDialogElement;
	let exportDialog: HTMLDialogElement;
	let allBudgetsDialog: HTMLDialogElement;

	let newBudgetName = $state('');
	let deleteBudgetTarget = $state<{ id: string; name: string } | null>(null);

	function switchLanguage(lang: Language) {
		setLanguage(lang);
	}

	onMount(async () => {
		await budget.load();
		const b = $budget;
		if (b) {
			await categories.load();
			await recurringItems.load();
		}
	});

	function openCreateBudget() {
		newBudgetName = '';
		budgetDialog?.showModal();
	}

	async function handleCreateBudget() {
		if (!newBudgetName.trim()) return;
		const newBudget = await budget.create(newBudgetName.trim());
		await budget.switchTo(newBudget.id);
		await categories.load();
		await recurringItems.load();
		budgetDialog?.close();
	}

	function openDeleteBudget(id: string, name: string) {
		deleteBudgetTarget = { id, name };
		deleteBudgetDialog?.showModal();
	}

	async function handleDeleteBudget() {
		if (!deleteBudgetTarget) return;
		await budget.remove(deleteBudgetTarget.id);
		await categories.load();
		await recurringItems.load();
		deleteBudgetDialog?.close();
		deleteBudgetTarget = null;
	}

	async function switchBudget(id: string) {
		await budget.switchTo(id);
		await categories.load();
		await recurringItems.load();
		allBudgetsDialog?.close();
	}

	async function handleJSONExport() {
		const b = $budget;
		if (!b) return;

		const cats = await db.categories.where('budgetId').equals(b.id).toArray();
		const items = await db.recurringItems.where('budgetId').equals(b.id).toArray();

		const exportData = {
			budget: b,
			categories: cats,
			recurringItems: items
		};

		const json = JSON.stringify(exportData, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${b.name.replace(/\s+/g, '_')}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}
	
	async function handleCSVExport() {
		const b = $budget;
		if (!b) return;

		const cats = await db.categories.where('budgetId').equals(b.id).toArray();
		const items = await db.recurringItems.where('budgetId').equals(b.id).toArray();

		const catMap = new Map(cats.map((c) => [c.id, c]));

		const escapeCSV = (value: string) => {
			if (value.includes(',') || value.includes('"') || value.includes('\n')) {
				return `"${value.replace(/"/g, '""')}"`;
			}
			return value;
		};

		const header = 'Navn,Beløb,Type,Kategori,Frekvens,Startdato,Aktiv';
		const rows = items.map((item) => {
			const cat = catMap.get(item.categoryId);
			const catName = cat ? cat.name : '';
			const freqMap: Record<string, string> = {
				daily: 'Dagligt',
				weekly: 'Ugentligt',
				monthly: 'Månedligt',
				yearly: 'Årligt'
			};
			const typeMap: Record<string, string> = {
				income: 'Indtægt',
				expense: 'Udgift'
			};
			const startDate = item.startDate instanceof Date
				? item.startDate.toISOString().split('T')[0]
				: new Date(item.startDate).toISOString().split('T')[0];

			return [
				escapeCSV(item.name),
				String(item.amount),
				typeMap[item.type] || item.type,
				escapeCSV(catName),
				freqMap[item.frequency] || item.frequency,
				startDate,
				item.isActive ? 'Ja' : 'Nej'
			].join(',');
		});

		const csv = [header, ...rows].join('\n');
		const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${b.name.replace(/\s+/g, '_')}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleImport() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			try {
				const text = await file.text();
				const data = JSON.parse(text);

				if (!data.budget || !data.categories || !data.recurringItems) {
					alert($t.budget.importError);
					return;
				}

				const newBudget = await budget.create(data.budget.name);
				const catIdMap: Record<string, string> = {};

				for (const cat of data.categories) {
					const newCat = await categories.add({
						name: cat.name,
						color: cat.color
					});
					if (newCat) {
						catIdMap[cat.id] = newCat.id;
					}
				}

				for (const item of data.recurringItems) {
					const newCategoryId = catIdMap[item.categoryId] || '';
					await recurringItems.add({
						categoryId: newCategoryId,
						type: item.type,
						name: item.name,
						amount: item.amount,
						frequency: item.frequency,
						startDate: new Date(item.startDate),
						isActive: item.isActive
					});
				}

				await budget.switchTo(newBudget.id);
				await categories.load();
				await recurringItems.load();
				exportDialog?.close();
			} catch {
				alert($t.budget.importError);
			}
		};
		input.click();
	}
</script>

<div class="min-h-screen flex flex-col">
	<header class="bg-[var(--color-header)]">
		<div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
			<a href="/" class="text-xl font-semibold text-[var(--color-header-text)] hover:opacity-90 transition-opacity">
				Budget Planner
			</a>
			<div class="flex items-center gap-3">
				{#if $budget}
					<button
						onclick={() => allBudgetsDialog?.showModal()}
						class="btn-header"
					>
						{$budget.name}
					</button>
				{/if}
				<a
					href="/overview"
					class="btn-header
						{currentPath === '/overview'
							? '!bg-white !text-[var(--color-header)]'
							: ''}"
				>
					{$t.nav.overview}
				</a>
				<a
					href="/charts"
					class="btn-header
						{currentPath === '/charts'
							? '!bg-white !text-[var(--color-header)]'
							: ''}"
				>
					{$t.nav.charts}
				</a>
				<div class="flex rounded-lg overflow-hidden border border-white/25">
					<button
						onclick={() => switchLanguage('da')}
						class="px-2.5 py-1 text-xs font-medium transition-colors
							{$currentLanguage === 'da' ? 'bg-white text-[var(--color-header)]' : 'text-white hover:bg-white/15'}"
					>
						DK
					</button>
					<button
						onclick={() => switchLanguage('en')}
						class="px-2.5 py-1 text-xs font-medium transition-colors
							{$currentLanguage === 'en' ? 'bg-white text-[var(--color-header)]' : 'text-white hover:bg-white/15'}"
					>
						EN
					</button>
				</div>
			</div>
		</div>
	</header>

	<main class="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
		{@render children()}
	</main>

	<footer class="border-t border-[var(--color-border)] py-4 text-center text-sm text-gray-500">
		Budget Planner &copy; 2026
	</footer>
</div>

<dialog bind:this={budgetDialog} class="rounded-lg p-0 max-w-sm w-full backdrop:bg-black/50">
	<div class="p-6">
		<h3 class="text-lg font-semibold mb-4">{$t.budget.createBudget}</h3>
		<form onsubmit={(e) => { e.preventDefault(); handleCreateBudget(); }}>
			<div class="mb-4">
				<label for="budget-name" class="block text-sm font-medium mb-1">{$t.budget.name}</label>
				<input
					id="budget-name"
					type="text"
					bind:value={newBudgetName}
					class="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text)]"
					placeholder="{$t.budget.newBudgetPlaceholder}"
					required
				/>
			</div>
			<div class="flex justify-end gap-2">
				<button type="button" onclick={() => budgetDialog?.close()} class="btn-outline">{$t.budget.cancel}</button>
				<button type="submit" class="btn-primary">{$t.budget.save}</button>
			</div>
		</form>
	</div>
</dialog>

<dialog bind:this={allBudgetsDialog} class="rounded-lg p-0 max-w-md w-full backdrop:bg-black/50">
	<div class="p-6">
		<div class="flex items-center justify-between mb-4">
			<h3 class="text-lg font-semibold">{$t.budget.allBudgets}</h3>
			<button onclick={openCreateBudget} class="btn-ghost">+ {$t.budget.createBudget}</button>
		</div>
		<div class="space-y-2 max-h-64 overflow-y-auto">
			{#each $allBudgets as b}
				<div class="budget-row flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] transition-colors">
					<button onclick={() => switchBudget(b.id)} class="flex-1 text-left">
						<span class="font-medium">{$budget?.id === b.id ? '▸ ' : ''}{b.name}</span>
					</button>
					<button
						onclick={() => openDeleteBudget(b.id, b.name)}
						class="btn-icon btn-icon-danger ml-2"
						aria-label="Slet"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
						</svg>
					</button>
				</div>
			{/each}
		</div>
		<div class="flex justify-end gap-2 mt-4">
			<button onclick={() => exportDialog?.showModal()} class="btn-primary">{$t.budget.export}</button>
			<button onclick={handleImport} class="btn-outline">{$t.budget.import}</button>
			<button onclick={() => allBudgetsDialog?.close()} class="btn-outline">{$t.budget.cancel}</button>
		</div>
	</div>
</dialog>

<dialog bind:this={deleteBudgetDialog} class="rounded-lg p-0 max-w-sm w-full backdrop:bg-black/50">
	<div class="p-6">
		<h3 class="text-lg font-semibold mb-2">{$t.budget.confirmDelete}</h3>
		<p class="text-sm text-[var(--color-danger)] mb-2">{$t.budget.deleteBudgetWarning}</p>
		<p class="text-sm text-gray-500 mb-4">{deleteBudgetTarget?.name}</p>
		<div class="flex justify-end gap-2">
			<button onclick={() => deleteBudgetDialog?.close()} class="btn-outline">{$t.budget.cancel}</button>
			<button onclick={handleDeleteBudget} class="btn-danger">{$t.budget.delete}</button>
		</div>
	</div>
</dialog>

<dialog bind:this={exportDialog} class="rounded-lg p-0 max-w-sm w-full backdrop:bg-black/50">
	<div class="p-6">
		<h3 class="text-lg font-semibold mb-4">{$t.budget.export}</h3>
		<div class="space-y-3">
			<button onclick={() => { handleJSONExport(); exportDialog?.close(); }} class="btn-outline w-full text-left px-4 py-3">
				<span class="font-medium">{$t.budget.exportJson}</span>
				<p class="text-sm text-gray-500">{$t.budget.exportJsonDetail}</p>
			</button>
			<button onclick={() => { handleCSVExport(); exportDialog?.close(); }} class="btn-outline w-full text-left px-4 py-3">
				<span class="font-medium">{$t.budget.exportCSV}</span>
				<p class="text-sm text-gray-500">{$t.budget.exportCSVDetail}</p>
			</button>
		</div>
		<div class="flex justify-end mt-4">
			<button onclick={() => exportDialog?.close()} class="btn-outline">{$t.budget.cancel}</button>
		</div>
	</div>
</dialog>
