<script lang="ts">
	import { categories } from '$lib/stores/categories';
	import type { Category } from '$lib/types';

	let showModal = $state(false);
	let editingCategory = $state<Category | null>(null);
	let formName = $state('');
	let formColor = $state('#6366f1');

	const defaultColors = [
		'#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
		'#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
	];

	function openAddModal() {
		editingCategory = null;
		formName = '';
		formColor = '#6366f1';
		showModal = true;
	}

	function openEditModal(cat: Category) {
		editingCategory = cat;
		formName = cat.name;
		formColor = cat.color;
		showModal = true;
	}

	async function handleSubmit() {
		if (!formName.trim()) return;

		if (editingCategory) {
			await categories.update(editingCategory.id, {
				name: formName,
				color: formColor
			});
		} else {
			await categories.add({
				name: formName,
				color: formColor
			});
		}
		showModal = false;
	}

	async function handleDelete(id: string) {
		if (confirm('Er du sikker på at du vil slette denne kategori?')) {
			await categories.remove(id);
		}
	}
</script>

<svelte:head>
	<title>Budget Planner - Kategorier</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold">Kategorier</h2>
		<button
			onclick={openAddModal}
			class="btn-primary"
		>
			Tilføj kategori
		</button>
	</div>

	{#if $categories.length === 0}
		<div class="text-center py-12 text-gray-500">
			<p>Ingen kategorier endnu.</p>
			<p class="mt-2">Opret din første kategori for at komme i gang.</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each $categories as cat}
				<div
					class="flex items-center justify-between p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
				>
					<div class="flex items-center gap-3">
						<div class="w-4 h-4 rounded-full" style="background-color: {cat.color}"></div>
						<span class="font-medium">{cat.name}</span>
					</div>
					<div class="flex gap-2">
						<button
							onclick={() => openEditModal(cat)}
							class="btn-sm btn-outline"
						>
							Rediger
						</button>
						<button
							onclick={() => handleDelete(cat.id)}
							class="btn-sm btn-outline-danger"
						>
							Slet
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="bg-[var(--color-surface)] rounded-lg p-6 w-full max-w-md mx-4">
			<h3 class="text-lg font-semibold mb-4">
				{editingCategory ? 'Rediger kategori' : 'Tilføj kategori'}
			</h3>
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
				<div>
					<label for="cat-name" class="block text-sm font-medium mb-1">Navn</label>
					<input
						id="cat-name"
						type="text"
						bind:value={formName}
						class="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)]"
						placeholder="f.eks. Husleje, Mad, Transport"
						required
					/>
				</div>
				<div>
					<label class="block text-sm font-medium mb-1">Farve</label>
					<div class="flex gap-2 flex-wrap">
						{#each defaultColors as color}
							<button
								type="button"
								onclick={() => (formColor = color)}
								class="w-8 h-8 rounded-full border-2 transition-transform {formColor === color
									? 'border-[var(--color-text)] scale-110'
									: 'border-transparent'}"
								style="background-color: {color}"
							></button>
						{/each}
					</div>
				</div>
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
						{editingCategory ? 'Gem' : 'Tilføj'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
