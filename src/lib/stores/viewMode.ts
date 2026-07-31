import { writable } from 'svelte/store';

export type ViewMode = 'month' | 'year';

export const viewMode = writable<ViewMode>('month');
