import { writable } from 'svelte/store';
import type { Language } from '$lib/i18n';

function createUIStore() {
	const { subscribe, update } = writable({
		language: 'da' as Language,
		expandedCategories: new Set<string>()
	});

	return {
		subscribe,
		toggleLanguage() {
			update((s) => ({
				...s,
				language: s.language === 'da' ? 'en' : 'da'
			}));
		},
		setLanguage(lang: Language) {
			update((s) => ({ ...s, language: lang }));
		},
		toggleCategory(categoryId: string) {
			update((s) => {
				const expanded = new Set(s.expandedCategories);
				if (expanded.has(categoryId)) {
					expanded.delete(categoryId);
				} else {
					expanded.add(categoryId);
				}
				return { ...s, expandedCategories: expanded };
			});
		}
	};
}

export const ui = createUIStore();
