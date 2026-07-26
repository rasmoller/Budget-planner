import { writable, derived, get } from 'svelte/store';
import { da, type Translations } from './da';
import { en } from './en';

export type Language = 'da' | 'en';

const translations: Record<Language, Translations> = {
	da,
	en
};

export const currentLanguage = writable<Language>('da');

export const t = derived(currentLanguage, ($lang) => translations[$lang]);

export function setLanguage(lang: Language) {
	currentLanguage.set(lang);
}

export function getLanguage(): Language {
	return get(currentLanguage);
}

export function formatMonth(monthNumber: number): string {
	return get(t).months[monthNumber];
}
