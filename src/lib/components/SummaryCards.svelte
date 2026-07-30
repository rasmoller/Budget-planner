<script lang="ts">
import { t } from '$lib/i18n';

let {
	income,
	expense,
	fmt
}: {
	income: number;
	expense: number;
	fmt: (n: number) => string;
} = $props();

let balance = $derived(income - expense);
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
	<a href="/incomes"
		class="block p-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:brightness-110 transition-all"
	>
		<p class="text-sm text-gray-500 mb-1 flex items-center gap-1">
			{$t.summary.totalIncome}
			<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
			</svg>
		</p>
		<p class="text-2xl font-bold" style="color: var(--color-income)">
			{fmt(income)}
		</p>
	</a>
	<a href="/expenses"
		class="block p-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:brightness-110 transition-all"
	>
		<p class="text-sm text-gray-500 mb-1 flex items-center gap-1">
			{$t.summary.totalExpenses}
			<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
			</svg>
		</p>
		<p class="text-2xl font-bold" style="color: var(--color-expense)">
			{fmt(expense)}
		</p>
	</a>
	<div class="p-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
		<p class="text-sm text-gray-500 mb-1">{$t.summary.balance}</p>
		<p
			class="text-2xl font-bold"
			style="color: {balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}"
		>
			{fmt(balance)}
		</p>
	</div>
</div>
