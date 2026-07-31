import { writable } from 'svelte/store';

export type MockChartCall = { data: unknown; options: unknown };

export const mockChartCalls = writable<MockChartCall[]>([]);

export function resetMockChartCalls() {
	mockChartCalls.set([]);
}
