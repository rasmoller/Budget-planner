import { describe, it, expect } from 'vitest';
import { validateName, validateAmount } from './validation';
import { en } from '../i18n/en';

const t = en;

describe('validateName', () => {
	it('rejects empty string', () => {
		expect(validateName('', t)).toBe(t.validation.nameRequired);
	});

	it('rejects whitespace-only string', () => {
		expect(validateName('   ', t)).toBe(t.validation.nameRequired);
	});

	it('rejects names over 100 characters', () => {
		expect(validateName('a'.repeat(101), t)).toBe(t.validation.nameTooLong);
	});

	it('accepts a valid name', () => {
		expect(validateName('Rent', t)).toBe('');
	});
});

describe('validateAmount', () => {
	it('rejects NaN', () => {
		expect(validateAmount(NaN, t)).toBe(t.validation.amountInvalid);
	});

	it('rejects negative values', () => {
		expect(validateAmount(-1, t)).toBe(t.validation.amountInvalid);
	});

	it('accepts zero (free item)', () => {
		expect(validateAmount(0, t)).toBe('');
	});

	it('accepts decimal values', () => {
		expect(validateAmount(12.34, t)).toBe('');
	});

	it('accepts whole numbers', () => {
		expect(validateAmount(100, t)).toBe('');
	});
});
