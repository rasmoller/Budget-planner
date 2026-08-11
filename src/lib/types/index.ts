export type Currency = 'DKK' | 'EUR' | 'USD' | 'SEK' | 'NOK';

export const CURRENCY_CONFIG: Record<Currency, { locale: string; code: string; symbol: string }> = {
	DKK: { locale: 'da-DK', code: 'DKK', symbol: 'kr.' },
	EUR: { locale: 'de-DE', code: 'EUR', symbol: '\u20ac' },
	USD: { locale: 'en-US', code: 'USD', symbol: '$' },
	SEK: { locale: 'sv-SE', code: 'SEK', symbol: 'kr' },
	NOK: { locale: 'nb-NO', code: 'NOK', symbol: 'kr' }
};

export interface Budget {
	id: string;
	name: string;
	description?: string;
	currency: Currency;
	isArchived: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface Category {
	id: string;
	budgetId: string;
	name: string;
	color: string;
	order: number;
	createdAt: Date;
	updatedAt: Date;
}

export const UNCATEGORIZED = 'uncategorized';

export function isUncategorized(id: string): boolean {
	return id === UNCATEGORIZED;
}

export interface ScheduledChange {
	id: string;
	effectiveDate: Date;
	amountInCents?: number;
	frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
	isActive?: boolean;
	notes?: string;
	createdAt: Date;
}

export interface RecurringItem {
	id: string;
	budgetId: string;
	categoryId: string;
	type: 'income' | 'expense';
	name: string;
	amountInCents: number;
	frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
	startDate: Date;
	isActive: boolean;
	isOneTime?: boolean;
	date?: Date;
	futureChanges?: ScheduledChange[];
	notes?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface CategoryGroup {
	categoryId: string;
	categoryName: string;
	categoryColor: string;
	incomeTotal: number;
	expenseTotal: number;
	balance: number;
	items: RecurringItem[];
}

export interface MonthSummary {
	month: string;
	year: number;
	monthNumber: number;
	totalIncome: number;
	totalExpenses: number;
	balance: number;
	categories: CategoryGroup[];
}
