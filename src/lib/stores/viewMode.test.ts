import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { viewMode } from './viewMode';

beforeEach(() => {
	viewMode.set('month');
});

describe('viewMode store', () => {
	it('defaults to month view', () => {
		expect(get(viewMode)).toBe('month');
	});

	it('can be switched to year view', () => {
		viewMode.set('year');
		expect(get(viewMode)).toBe('year');
	});

	it('can be switched back to month view', () => {
		viewMode.set('year');
		viewMode.set('month');
		expect(get(viewMode)).toBe('month');
	});
});
