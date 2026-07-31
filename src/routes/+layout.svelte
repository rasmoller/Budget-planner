<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { setLanguage, currentLanguage, t, type Language } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { budget, allBudgets } from '$lib/stores/budget';
	import { categories } from '$lib/stores/categories';
	import { recurringItems } from '$lib/stores/recurringItems';
	import { onMount } from 'svelte';
	import { db } from '$lib/db/schema';
	import type { Currency } from '$lib/types';
	import { validateName, type ValidationErrors } from '$lib/utils/validation';
	import { fetchExchangeRates, getRate, convertAmount, type ExchangeRates } from '$lib/utils/exchangeRates';
	import { openAllBudgets } from '$lib/stores/dialogs';
	import { exchangeRates as exchangeRatesStore } from '$lib/stores/displayCurrency';

	let { children } = $props();

	let isDarkMode = $state(false);

	let currentPath = $derived(page.url.pathname);

	let budgetDialog: HTMLDialogElement;
	let deleteBudgetDialog: HTMLDialogElement;
	let exportDialog: HTMLDialogElement;
	let allBudgetsDialog: HTMLDialogElement;
	let renameBudgetDialog: HTMLDialogElement;

	let newBudgetName = $state('');
	let newBudgetCurrency = $state<Currency>('DKK');
	let newBudgetErrors = $state<ValidationErrors>({});
	let deleteBudgetTarget = $state<{ id: string; name: string } | null>(null);
	let renameBudgetTarget = $state<{ id: string; name: string } | null>(null);
	let renameBudgetName = $state('');
	let renameBudgetErrors = $state<ValidationErrors>({});

	let exportTargetCurrency = $state<Currency>('DKK');

	const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
	if (savedTheme === 'dark') {
		document.documentElement.classList.add('dark');
		isDarkMode = true;
	} else if (savedTheme !== 'light' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
		document.documentElement.classList.add('dark');
		isDarkMode = true;
	}

	const activeBudgets = $derived($allBudgets.filter((b) => !b.isArchived));
	const archivedBudgets = $derived($allBudgets.filter((b) => b.isArchived));

	function toggleDarkMode() {
		isDarkMode = !isDarkMode;
		if (isDarkMode) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}

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
		fetchExchangeRates().then((data) => exchangeRatesStore.set(data));
	});

	function openCreateBudget() {
		newBudgetName = '';
		newBudgetCurrency = 'DKK';
		newBudgetErrors = {};
		budgetDialog?.showModal();
	}

	async function handleCreateBudget() {
		const nameErr = validateName(newBudgetName);
		newBudgetErrors = {};
		if (nameErr) {
			newBudgetErrors = { name: nameErr };
			return;
		}
		const newBudget = await budget.create(newBudgetName.trim(), newBudgetCurrency);
		await budget.switchTo(newBudget.id);
		await categories.load();
		await recurringItems.load();
		budgetDialog?.close();
	}

	function openDeleteBudget(id: string, name: string) {
		deleteBudgetTarget = { id, name };
		deleteBudgetDialog?.showModal();
	}

	function openRenameBudget(id: string, name: string) {
		renameBudgetTarget = { id, name };
		renameBudgetName = name;
		renameBudgetErrors = {};
		renameBudgetDialog?.showModal();
	}

	async function handleRenameBudget() {
		const target = renameBudgetTarget;
		if (!target) return;
		const nameErr = validateName(renameBudgetName);
		renameBudgetErrors = {};
		if (nameErr) {
			renameBudgetErrors = { name: nameErr };
			return;
		}
		await budget.updateName(renameBudgetName.trim(), target.id);
		renameBudgetDialog?.close();
		renameBudgetTarget = null;
	}

	async function handleDeleteBudget() {
		if (!deleteBudgetTarget) return;
		await budget.remove(deleteBudgetTarget.id);
		await categories.load();
		await recurringItems.load();
		deleteBudgetDialog?.close();
		deleteBudgetTarget = null;
	}

	async function handleDuplicateBudget(id: string) {
		const newBudget = await budget.duplicate(id);
		if (newBudget) {
			await budget.switchTo(newBudget.id);
			await categories.load();
			await recurringItems.load();
		}
	}

	async function handleArchiveBudget(id: string) {
		await budget.archive(id);
		await categories.load();
		await recurringItems.load();
	}

	async function handleUnarchiveBudget(id: string) {
		await budget.unarchive(id);
		await budget.switchTo(id);
		await categories.load();
		await recurringItems.load();
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
			recurringItems: items,
			exportCurrency: exportTargetCurrency,
			exportRate: get(exchangeRatesStore)
				? getRate(b.currency, exportTargetCurrency, get(exchangeRatesStore)!)
				: 1
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

		const formatAmount = (cents: number) => {
			const converted = get(exchangeRatesStore)
				? convertAmount(cents, b.currency, exportTargetCurrency, get(exchangeRatesStore)!)
				: cents;
			return (converted / 100).toFixed(2).replace('.', ',');
		};

		const header = `Navn;Beløb;Valuta;Type;Kategori;Frekvens;Startdato;Aktiv`;
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
				formatAmount(item.amountInCents),
				exportTargetCurrency,
				typeMap[item.type] || item.type,
				escapeCSV(catName),
				freqMap[item.frequency] || item.frequency,
				startDate,
				item.isActive ? 'Ja' : 'Nej'
			].join(';');
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

	$effect(() => {
		if ($openAllBudgets > 0) allBudgetsDialog?.showModal();
	});

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

				const newBudget = await budget.create(data.budget.name, data.budget.currency || 'DKK');
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
						amountInCents: item.amountInCents,
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
					<a
						href="/"
						class="btn-header
							{currentPath === '/' ? '!bg-white !text-[var(--color-header)]' : ''}"
					>
						Budget
					</a>
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
				<button
					onclick={toggleDarkMode}
					class="btn-header px-2.5 py-1"
					aria-label="{isDarkMode ? $t.budget.lightMode : $t.budget.darkMode}"
					title="{isDarkMode ? $t.budget.lightMode : $t.budget.darkMode}"
				>
					{#if isDarkMode}
						<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
						</svg>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
							<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
						</svg>
					{/if}
				</button>
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
				<label class="block text-sm font-medium mb-1">{$t.budget.name}</label>
				<input
					type="text"
					bind:value={newBudgetName}
					class="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text)]"
					placeholder="{$t.budget.newBudgetPlaceholder}"
					required
				/>
				{#if newBudgetErrors.name}
					<p class="text-xs text-[var(--color-danger)] mt-1">{newBudgetErrors.name}</p>
				{/if}
			</div>
			<div class="mb-4">
				<label class="block text-sm font-medium mb-1">{$t.budget.currency}</label>
				<select
					bind:value={newBudgetCurrency}
					class="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
				>
					<option value="DKK">DKK - Danske kroner</option>
					<option value="EUR">EUR - Euro</option>
					<option value="USD">USD - US Dollar</option>
					<option value="SEK">SEK - Svenske kronor</option>
					<option value="NOK">NOK - Norske kroner</option>
				</select>
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
		<div class="space-y-2 max-h-80 overflow-y-auto">
			{#if activeBudgets.length > 0}
				{#each activeBudgets as b}
					<div class="budget-row flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] transition-colors">
						<button onclick={() => switchBudget(b.id)} class="flex-1 text-left">
							<span class="font-medium">{$budget?.id === b.id ? '▸ ' : ''}{b.name}</span>
							{#if $exchangeRatesStore && $budget && b.currency !== $budget.currency}
								{@const rate = getRate(b.currency, $budget.currency, $exchangeRatesStore)}
								<span class="text-xs text-gray-500 ml-2">
									1 {b.currency} ≈ {rate.toFixed(2)} {$budget.currency}
								</span>
							{/if}
						</button>
						<div class="flex items-center gap-1">
							<button
								onclick={() => openRenameBudget(b.id, b.name)}
								class="btn-icon"
								aria-label="{$t.budget.renameBudget}"
								title="{$t.budget.renameBudget}"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
									<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
								</svg>
							</button>
							<button
								onclick={() => handleDuplicateBudget(b.id)}
								class="btn-icon"
								aria-label="{$t.budget.duplicate}"
								title="{$t.budget.duplicate}"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
									<path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
									<path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
								</svg>
							</button>
							<button
								onclick={() => handleArchiveBudget(b.id)}
								class="btn-icon"
								aria-label="{$t.budget.archive}"
								title="{$t.budget.archive}"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
									<path d="M4 3h12a1 1 0 011 1v1H3V4a1 1 0 011-1zm1 4h10l-.5 9.5a1 1 0 01-1 1h-7a1 1 0 01-1-1L5 7z" />
								</svg>
							</button>
							<button
								onclick={() => openDeleteBudget(b.id, b.name)}
								class="btn-icon btn-icon-danger ml-1"
								aria-label="Slet"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
								</svg>
							</button>
						</div>
					</div>
				{/each}
			{/if}
			{#if archivedBudgets.length > 0}
				{#if activeBudgets.length > 0}
					<div class="text-xs font-medium text-gray-400 uppercase tracking-wide pt-2">{$t.budget.archived}</div>
				{/if}
				{#each archivedBudgets as b}
					<div class="budget-row flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] transition-colors opacity-60">
						<button onclick={() => switchBudget(b.id)} class="flex-1 text-left">
							<span class="font-medium">{$budget?.id === b.id ? '▸ ' : ''}{b.name}</span>
						</button>
						<div class="flex items-center gap-1">
							<button
								onclick={() => openRenameBudget(b.id, b.name)}
								class="btn-icon"
								aria-label="{$t.budget.renameBudget}"
								title="{$t.budget.renameBudget}"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
									<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
								</svg>
							</button>
							<button
								onclick={() => handleUnarchiveBudget(b.id)}
								class="btn-icon"
								aria-label="{$t.budget.unarchive}"
								title="{$t.budget.unarchive}"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
									<path d="M5 8a1 1 0 011-1h8a1 1 0 011 1v1H5V8z" />
									<path fill-rule="evenodd" d="M3 4h14a1 1 0 011 1v1a1 1 0 01-1 1h-.5v9.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 014 15.5V6H3.5A1 1 0 013 5V4zm4 8a1 1 0 00-2 0v2a1 1 0 002 0v-2zm6 0a1 1 0 00-2 0v2a1 1 0 002 0v-2z" clip-rule="evenodd" />
								</svg>
							</button>
							<button
								onclick={() => openDeleteBudget(b.id, b.name)}
								class="btn-icon btn-icon-danger ml-1"
								aria-label="Slet"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
								</svg>
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>
		<div class="flex justify-end gap-2 mt-4">
			<button onclick={() => { exportTargetCurrency = $budget?.currency ?? 'DKK'; exportDialog?.showModal(); }} class="btn-primary">{$t.budget.export}</button>
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

<dialog bind:this={renameBudgetDialog} class="rounded-lg p-0 max-w-sm w-full backdrop:bg-black/50">
	<div class="p-6">
		<h3 class="text-lg font-semibold mb-4">{$t.budget.renameBudget}</h3>
		<form onsubmit={(e) => { e.preventDefault(); handleRenameBudget(); }}>
			<div class="mb-4">
				<label for="rename-budget-name" class="block text-sm font-medium mb-1">{$t.budget.name}</label>
				<input
					id="rename-budget-name"
					type="text"
					bind:value={renameBudgetName}
					class="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text)]"
					placeholder="{$t.budget.newBudgetPlaceholder}"
					required
				/>
				{#if renameBudgetErrors.name}
					<p class="text-xs text-[var(--color-danger)] mt-1">{renameBudgetErrors.name}</p>
				{/if}
			</div>
			<div class="flex justify-end gap-2">
				<button type="button" onclick={() => renameBudgetDialog?.close()} class="btn-outline">{$t.budget.cancel}</button>
				<button type="submit" class="btn-primary">{$t.budget.save}</button>
			</div>
		</form>
	</div>
</dialog>

<dialog bind:this={exportDialog} class="rounded-lg p-0 max-w-sm w-full backdrop:bg-black/50">
	<div class="p-6">
		<h3 class="text-lg font-semibold mb-4">{$t.budget.export}</h3>
		<div class="mb-4">
			<label class="block text-sm font-medium mb-1">{$t.budget.currency}</label>
			<select bind:value={exportTargetCurrency} class="px-3 py-2 w-full border border-[var(--color-border)] rounded-md bg-[var(--color-surface)] text-sm">
				<option value="DKK">DKK</option>
				<option value="EUR">EUR</option>
				<option value="USD">USD</option>
				<option value="SEK">SEK</option>
				<option value="NOK">NOK</option>
			</select>
		</div>
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
