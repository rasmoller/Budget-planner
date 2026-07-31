<script lang="ts">
	import { mockChartCalls } from './mock-chart-state';

	let { data, options }: { data: any; options: any } = $props();

	mockChartCalls.update((calls) => [...calls, { data, options }]);
</script>
