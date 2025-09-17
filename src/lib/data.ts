import type { Product, Customer, Transaction, PendingOrder, Store, User, RedemptionOption } from './types';

// NOTE: This file now contains only the structure and default/fallback data.
// The primary data source is now Firebase Firestore.

export const stores: Store[] = [
    { id: 'store_tpg', name: 'Bekupon Tumpang', location: 'Tumpang, Malang', coinBalance: 50 },
    { id: 'store_swj', name: 'Bekupon Sawojajar', location: 'Sawojajar, Malang', coinBalance: 75 },
];

// Superadmin data is kept for login purposes. Other users are managed in Firebase.
export const users: User[] = [
    { id: 'admin001', name: 'Rio Pradana', role: 'admin', storeId: 'store_tpg', userId: 'Pradana01', password: 'Mangankabel1$', email: 'rioyulipradana@gmail.com', status: 'active' },
];


export const products: Product[] = [];
export const customers: Customer[] = [];
export const transactions: Transaction[] = [];
export const pendingOrders: PendingOrder[] = [];


export const salesData: { date: string, revenue: number }[] = [];

export const redemptionOptions: RedemptionOption[] = [];
