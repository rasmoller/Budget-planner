import type { Translations } from '$lib/i18n/da';

export type ValidationErrors = Record<string, string>;

export function validateName(value: string, t: Translations): string {
	if (!value || !value.trim()) return t.validation.nameRequired;
	if (value.trim().length > 100) return t.validation.nameTooLong;
	return '';
}

export function validateAmount(value: number, t: Translations): string {
	if (isNaN(value) || value < 0) return t.validation.amountInvalid;
	return '';
}
