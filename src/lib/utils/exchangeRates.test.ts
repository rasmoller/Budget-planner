import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	fetchExchangeRates,
	convertAmount,
	getRate,
	type ExchangeRates
} from './exchangeRates';

const mockRates: ExchangeRates = {
	base: 'EUR',
	date: '2026-07-28',
	rates: { DKK: 7.4752, USD: 1.1367, SEK: 11.0625, NOK: 11.0055 }
};

describe('fetchExchangeRates', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('fetches latest rates for all supported currencies from the Frankfurter API', async () => {
		const payload: ExchangeRates = mockRates;
		const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve(payload) });
		vi.stubGlobal('fetch', fetchMock);

		const result = await fetchExchangeRates();

		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=DKK,USD,SEK,NOK'
		);
		expect(result).toEqual(payload);
	});
});

describe('convertAmount', () => {
	it('returns the same amount when currencies match', () => {
		expect(convertAmount(12345, 'DKK', 'DKK', mockRates)).toBe(12345);
	});

	it('converts EUR to DKK', () => {
		// 100 EUR → 100 × 7.4752 = 747.52 DKK
		expect(convertAmount(10000, 'EUR', 'DKK', mockRates)).toBe(74752);
	});

	it('converts DKK to EUR', () => {
		// 747.52 DKK → 747.52 / 7.4752 = 100 EUR
		expect(convertAmount(74752, 'DKK', 'EUR', mockRates)).toBe(10000);
	});

	it('converts USD to DKK', () => {
		// 113.67 USD → 113.67 / 1.1367 = 100 EUR → × 7.4752 = 747.52 DKK
		expect(convertAmount(11367, 'USD', 'DKK', mockRates)).toBe(74752);
	});

	it('rounds converted amounts to whole cents', () => {
		// 1 EUR → 11.0625 SEK → 1106.25 cents → rounds to 1106
		expect(convertAmount(100, 'EUR', 'SEK', mockRates)).toBe(1106);
	});
});

describe('getRate', () => {
	it('returns 1 for the same currency', () => {
		expect(getRate('DKK', 'DKK', mockRates)).toBe(1);
	});

	it('returns the direct rate when base is EUR', () => {
		expect(getRate('EUR', 'DKK', mockRates)).toBe(7.4752);
	});

	it('returns the inverse rate when target is EUR', () => {
		expect(getRate('DKK', 'EUR', mockRates)).toBeCloseTo(1 / 7.4752, 5);
	});

	it('computes a cross rate between two non-EUR currencies', () => {
		expect(getRate('DKK', 'USD', mockRates)).toBeCloseTo(1.1367 / 7.4752, 5);
		expect(getRate('USD', 'DKK', mockRates)).toBeCloseTo(7.4752 / 1.1367, 5);
	});
});
