export interface Budget {
	id: string;
	name: string;
	description?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface Category {
	id: string;
	budgetId: string;
	name: string;
	color: string;
	createdAt: Date;
	updatedAt: Date;
}

export const UNCATEGORIZED = 'uncategorized';

export function isUncategorized(id: string): boolean {
	return id === UNCATEGORIZED;
}

export interface RecurringItem {
	id: string;
	budgetId: string;
	categoryId: string;
	type: 'income' | 'expense';
	name: string;
	amount: number;
	frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
	startDate: Date;
	isActive: boolean;
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
