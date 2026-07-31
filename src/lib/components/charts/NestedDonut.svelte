<script lang="ts">
	import type { CategoryGroup, Currency } from '$lib/types';
	import { formatCurrency } from '$lib/utils/currency';
	import { Doughnut } from 'svelte-chartjs';
	import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
	import { t } from '$lib/i18n';

	ChartJS.register(ArcElement, Tooltip);

	let { groups, currency = 'DKK' as Currency }: { groups: CategoryGroup[]; currency?: Currency } = $props();

	type OuterEntry = { value: number; color: string; label: string; type: 'incomes' | 'expenses' };

		const centerTextPlugin = {
		id: 'centerText',
		afterDraw(chart: any) {
			const { ctx, chartArea } = chart;
			if (!chartArea) return;
			const cx = (chartArea.left + chartArea.right) / 2;
			const cy = (chartArea.top + chartArea.bottom) / 2;
			const textColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim() || '#1f2937';
			const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text-muted').trim() || '#6b7280';

			ctx.save();
			ctx.textAlign = 'center';

			const opacity = chart.tooltip?.opacity ?? 0;
			const dp = opacity > 0 ? chart.tooltip?.dataPoints : null;
			if (dp?.length > 0) {
				const active = dp[0];
				if (active.datasetIndex === 0 || active.datasetIndex === 2) {
					const entry = active.datasetIndex === 0 ? innerEntries[active.dataIndex] : outerEntries[active.dataIndex];
					if (entry) {
						const val = formatCurrency(entry.value, currency);
						const pct = grandTotal > 0 ? ((entry.value / grandTotal) * 100).toFixed(1) : '0';
						let label = entry.label;
						if (active.datasetIndex === 2) {
							const typeLabel = $t.summary[(entry as OuterEntry).type];
							label = `${entry.label} (${typeLabel})`;
						}
						ctx.font = 'bold 14px system-ui, sans-serif';
						ctx.fillStyle = textColor;
						ctx.fillText(label, cx, cy - 8);
						ctx.font = '12px system-ui, sans-serif';
						ctx.fillStyle = mutedColor;
						ctx.fillText(`${val} (${pct}%)`, cx, cy + 12);
						ctx.restore();
						return;
					}
				}
			}

			const total = formatCurrency(grandTotal, currency);
			ctx.font = 'bold 18px system-ui, sans-serif';
			ctx.fillStyle = textColor;
			ctx.fillText(total, cx, cy + 4);

			ctx.restore();
		}
	};

	ChartJS.register(centerTextPlugin);

	const grandTotal = $derived(groups.reduce((s, g) => s + g.incomeTotal + g.expenseTotal, 0));

	// Inner ring: one entry per category (total = income + expense)
	const innerEntries = $derived(
		groups.map((g) => ({
			value: g.incomeTotal + g.expenseTotal,
			color: g.categoryColor,
			label: g.categoryName
		}))
	);

	// Outer ring: income then expense per category, same category order
	const outerEntries = $derived(
		groups.flatMap((g) => {
			const out: OuterEntry[] = [];
			if (g.incomeTotal > 0) out.push({ value: g.incomeTotal, color: g.categoryColor, label: g.categoryName, type: 'incomes' });
			if (g.expenseTotal > 0) out.push({ value: g.expenseTotal, color: g.categoryColor, label: g.categoryName, type: 'expenses' });
			return out;
		})
	);

	const chartData = $derived({
		datasets: [
			{
				data: innerEntries.map((e) => e.value),
				backgroundColor: innerEntries.map((e) => e.color),
				borderWidth: 0,
				spacing: 3,
				weight: 1
			},
			{
				data: [1],
				backgroundColor: 'transparent',
				borderWidth: 0,
				spacing: 3,
				weight: 0.15,
				hoverBackgroundColor: 'transparent'
			},
			{
				data: outerEntries.map((e) => e.value),
				backgroundColor: outerEntries.map((e) => e.color),
				borderWidth: 0,
				spacing: 3,
				weight: 1.2
			}
		]
	});

	const chartOptions = $derived({
		responsive: true,
		maintainAspectRatio: true,
		cutout: '55%',
		animation: { animateRotate: true },
		plugins: {
			legend: { display: false },
			tooltip: {
				callbacks: {
					title: () => '',
					label: (ctx: { datasetIndex: number; dataIndex: number }) => {
						if (ctx.datasetIndex === 0) {
							const e = innerEntries[ctx.dataIndex];
							if (!e) return '';
							const val = formatCurrency(e.value, currency);
							const pct = grandTotal > 0 ? ((e.value / grandTotal) * 100).toFixed(1) : '0';
							return `${e.label}: ${val} (${pct}%)`;
						}
						if (ctx.datasetIndex !== 2) return '';
						const e = outerEntries[ctx.dataIndex];
						if (!e) return '';
						const typeLabel = $t.summary[e.type];
						const val = formatCurrency(e.value, currency);
						const pct = grandTotal > 0 ? ((e.value / grandTotal) * 100).toFixed(1) : '0';
						return `${e.label} (${typeLabel}): ${val} (${pct}%)`;
					}
				}
			}
		}
	});
</script>

<div class="flex justify-center">
	<div class="w-[320px]">
		<Doughnut data={chartData} options={chartOptions} />
	</div>
</div>
