export type ValidationErrors = Record<string, string>;

export function validateName(value: string): string {
	if (!value || !value.trim()) return 'Navn er påkrævet';
	if (value.trim().length > 100) return 'Navn må højst være 100 tegn';
	return '';
}

export function validateAmount(value: number): string {
	if (isNaN(value) || value <= 0) return 'Beløb skal være større end 0';
	if (!Number.isInteger(value)) return 'Beløb skal være et heltal';
	return '';
}

export function validateRequired(value: string, label: string): string {
	if (!value || !value.trim()) return `${label} er påkrævet`;
	return '';
}

export function runValidators(rules: Record<string, () => string>): ValidationErrors {
	const errors: ValidationErrors = {};
	for (const [field, validate] of Object.entries(rules)) {
		const err = validate();
		if (err) errors[field] = err;
	}
	return errors;
}

export function hasErrors(errors: ValidationErrors): boolean {
	return Object.keys(errors).length > 0;
}
