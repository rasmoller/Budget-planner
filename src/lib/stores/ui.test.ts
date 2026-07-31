import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { ui } from './ui';

beforeEach(() => {
	ui.setLanguage('da');
	for (const id of get(ui).expandedCategories) ui.toggleCategory(id);
});

describe('ui store', () => {
	it('toggles language between da and en', () => {
		expect(get(ui).language).toBe('da');
		ui.toggleLanguage();
		expect(get(ui).language).toBe('en');
		ui.toggleLanguage();
		expect(get(ui).language).toBe('da');
	});

	it('sets the language explicitly', () => {
		ui.setLanguage('en');
		expect(get(ui).language).toBe('en');
		ui.setLanguage('da');
		expect(get(ui).language).toBe('da');
	});

	it('expands a category', () => {
		ui.toggleCategory('c1');
		expect(get(ui).expandedCategories.has('c1')).toBe(true);
	});

	it('collapses an expanded category', () => {
		ui.toggleCategory('c1');
		ui.toggleCategory('c1');
		expect(get(ui).expandedCategories.has('c1')).toBe(false);
	});

	it('toggling one category does not affect others', () => {
		ui.toggleCategory('c1');
		ui.toggleCategory('c2');
		ui.toggleCategory('c1');
		const expanded = get(ui).expandedCategories;
		expect(expanded.has('c1')).toBe(false);
		expect(expanded.has('c2')).toBe(true);
	});
});
