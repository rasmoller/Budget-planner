<script lang="ts">
	import type { CategoryGroup, Currency } from '$lib/types';
	import { formatCurrency } from '$lib/utils/currency';

	let { groups, currency = 'DKK' as Currency }: { groups: CategoryGroup[]; currency?: Currency } = $props();

	const size = 320;
	const cx = size / 2;
	const cy = size / 2;
	const outerR = 145;
	const outerInnerR = 108;
	const innerR = 108;
	const innerInnerR = 22;
	const gapAngle = 0.025;

	interface Slice {
		id: string;
		label: string;
		color: string;
		income: number;
		expense: number;
		startAngle: number;
		endAngle: number;
	}

	interface RenderSlice {
		path: string;
		color: string;
		label: string;
		type: 'income' | 'expense';
		amount: number;
		percent: number;
		ring: 'inner' | 'outer';
	}

	const grandTotal = $derived(groups.reduce((s, g) => s + g.incomeTotal + g.expenseTotal, 0));

	const slices = $derived.by<Slice[]>(() => {
		if (grandTotal === 0) return [];
		const sorted = [...groups].sort(
			(a, b) => b.incomeTotal + b.expenseTotal - (a.incomeTotal + a.expenseTotal)
		);
		let angle = -Math.PI / 2;
		return sorted.map((g) => {
			const total = g.incomeTotal + g.expenseTotal;
			const sweep = (total / grandTotal) * Math.PI * 2;
			const s: Slice = {
				id: g.categoryId,
				label: g.categoryName,
				color: g.categoryColor,
				income: g.incomeTotal,
				expense: g.expenseTotal,
				startAngle: angle,
				endAngle: angle + sweep
			};
			angle += sweep;
			return s;
		});
	});

	function describeRing(
		cx: number,
		cy: number,
		outerR: number,
		innerR: number,
		startAngle: number,
		endAngle: number
	): string {
		const a1 = startAngle + gapAngle / 2;
		const a2 = endAngle - gapAngle / 2;
		if (a2 - a1 < 0.005) return '';
		const largeArc = a2 - a1 > Math.PI ? 1 : 0;
		const ox1 = cx + outerR * Math.cos(a1);
		const oy1 = cy + outerR * Math.sin(a1);
		const ox2 = cx + outerR * Math.cos(a2);
		const oy2 = cy + outerR * Math.sin(a2);
		const ix1 = cx + innerR * Math.cos(a2);
		const iy1 = cy + innerR * Math.sin(a2);
		const ix2 = cx + innerR * Math.cos(a1);
		const iy2 = cy + innerR * Math.sin(a1);
		return [
			`M ${ox1} ${oy1}`,
			`A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2}`,
			`L ${ix1} ${iy1}`,
			`A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
			'Z'
		].join(' ');
	}

	const renderSlices = $derived.by<RenderSlice[]>(() => {
		const result: RenderSlice[] = [];
		for (const s of slices) {
			const catTotal = s.income + s.expense;

			// Inner ring: category arc (full span)
			if (catTotal > 0) {
				const path = describeRing(cx, cy, innerR, innerInnerR, s.startAngle, s.endAngle);
				if (path) {
					result.push({
						path,
						color: s.color,
						label: s.label,
						type: 'income',
						amount: catTotal,
						percent: grandTotal > 0 ? (catTotal / grandTotal) * 100 : 0,
						ring: 'inner'
					});
				}
			}

			// Outer ring: income and expense sub-arcs fill the category's full span
			if (s.income > 0 && catTotal > 0) {
				const incomeFraction = s.income / catTotal;
				const incomeEnd = s.startAngle + (s.endAngle - s.startAngle) * incomeFraction;
				const path = describeRing(cx, cy, outerR, outerInnerR, s.startAngle, incomeEnd);
				if (path) {
					result.push({
						path,
						color: s.color,
						label: s.label,
						type: 'income',
						amount: s.income,
						percent: grandTotal > 0 ? (s.income / grandTotal) * 100 : 0,
						ring: 'outer'
					});
				}
			}
			if (s.expense > 0 && catTotal > 0) {
				const incomeFraction = catTotal > 0 ? s.income / catTotal : 0;
				const expenseStart = s.startAngle + (s.endAngle - s.startAngle) * incomeFraction;
				const path = describeRing(cx, cy, outerR, outerInnerR, expenseStart, s.endAngle);
				if (path) {
					result.push({
						path,
						color: s.color,
						label: s.label,
						type: 'expense',
						amount: s.expense,
						percent: grandTotal > 0 ? (s.expense / grandTotal) * 100 : 0,
						ring: 'outer'
					});
				}
			}
		}
		return result;
	});

	let hovered = $state<RenderSlice | null>(null);

	function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result
			? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
			: null;
	}

	function dimColor(hex: string, factor: number): string {
		const rgb = hexToRgb(hex);
		if (!rgb) return hex;
		return `rgb(${Math.round(rgb.r * factor)}, ${Math.round(rgb.g * factor)}, ${Math.round(rgb.b * factor)})`;
	}

	function sliceFill(slice: RenderSlice): string {
		if (!hovered) return slice.color;
		if (hovered.label === slice.label) return slice.color;
		return dimColor(slice.color, 0.35);
	}
</script>

<div class="flex flex-col items-center gap-4">
	<div class="relative">
		<svg viewBox="0 0 {size} {size}" width={size} height={size}>
			{#each renderSlices as slice}
				<path
					d={slice.path}
					fill={sliceFill(slice)}
					class="transition-all duration-150 cursor-pointer"
					role="presentation"
					onmouseenter={() => (hovered = slice)}
					onmouseleave={() => (hovered = null)}
				/>
			{/each}
			{#if hovered}
				<text x={cx} y={cy - 10} text-anchor="middle" class="fill-[var(--color-text)] text-sm font-semibold">
					{hovered.label}
				</text>
				<text x={cx} y={cy + 4} text-anchor="middle" class="fill-gray-400 text-[10px]">
					{hovered.ring === 'inner' ? 'Kategori' : hovered.type === 'income' ? 'Indtægt' : 'Udgift'}
				</text>
				<text x={cx} y={cy + 20} text-anchor="middle" class="fill-[var(--color-text)] text-sm font-bold">
					{formatCurrency(hovered.amount, currency)}
				</text>
				<text x={cx} y={cy + 34} text-anchor="middle" class="fill-gray-400 text-[10px]">
					{hovered.percent.toFixed(1)}%
				</text>
			{:else}
		<text x={cx} y={cy - 4} text-anchor="middle" class="fill-[var(--color-text)] text-lg font-bold">
				{formatCurrency(grandTotal, currency)}
				</text>
				<text x={cx} y={cy + 14} text-anchor="middle" class="fill-gray-400 text-[10px]">
					total / md
				</text>
			{/if}
		</svg>

		<div class="absolute top-0 right-0 flex flex-col gap-1 text-[10px]">
			<div class="flex items-center gap-1.5">
				<div class="w-2 h-2 rounded-sm bg-gray-400"></div>
				<span class="text-gray-500">Indre: Kategori</span>
			</div>
			<div class="flex items-center gap-1.5">
				<div class="w-2 h-2 rounded-sm bg-gray-600"></div>
				<span class="text-gray-500">Ydre: Indtægt / Udgift</span>
			</div>
		</div>
	</div>

	<div class="flex flex-wrap justify-center gap-x-4 gap-y-1">
		{#each slices as s}
			<div class="flex items-center gap-1.5 text-xs">
				<div class="w-2.5 h-2.5 rounded-full" style="background-color: {s.color}"></div>
				<span class="text-gray-600">{s.label}</span>
			</div>
		{/each}
	</div>
</div>
