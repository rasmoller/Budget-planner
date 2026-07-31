<script lang="ts">
	import { viewMode } from '$lib/stores/viewMode';
	import { displayCurrency } from '$lib/stores/displayCurrency';
	import { budget } from '$lib/stores/budget';
	import { t } from '$lib/i18n';
	import type { Currency } from '$lib/types';

	let {
		currentYear,
		selectedMonth,
		prevYear,
		nextYear,
		prevMonth,
		nextMonth
	}: {
		currentYear: number;
		selectedMonth: string;
		prevYear: () => void;
		nextYear: () => void;
		prevMonth: () => void;
		nextMonth: () => void;
	} = $props();
</script>

<div class="flex justify-between gap-2 items-center -mt-4 mb-2">
	{#if $viewMode === 'year'}
		<div class="flex items-center gap-3">
			<button onclick={prevYear} class="btn-sm btn-outline">←</button>
			<span class="text-lg font-semibold">{currentYear}</span>
			<button onclick={nextYear} class="btn-sm btn-outline">→</button>
		</div>
	{:else}
		<div class="flex items-center gap-3">
			<button onclick={prevMonth} class="btn-sm btn-outline">←</button>
			<span class="text-lg font-semibold">
				{$t.months[parseInt(selectedMonth.split('-')[1]) - 1]} {selectedMonth.split('-')[0]}
			</span>
			<button onclick={nextMonth} class="btn-sm btn-outline">→</button>
		</div>
	{/if}
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
			onclick={() => viewMode.set('year')}
			class="btn-sm {$viewMode === 'year' ? 'btn-primary' : 'btn-outline'}"
		>
			{$t.overview.yearView}
		</button>
		<button
			onclick={() => viewMode.set('month')}
			class="btn-sm {$viewMode === 'month' ? 'btn-primary' : 'btn-outline'}"
		>
			{$t.overview.monthView}
		</button>
	</div>
</div>
