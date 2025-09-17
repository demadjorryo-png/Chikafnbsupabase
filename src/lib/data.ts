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


export const salesData = [
  { date: 'Mon', revenue: 2350000 },
  { date: 'Tue', revenue: 1980000 },
  { date: 'Wed', revenue: 2120000 },
  { date: 'Thu', revenue: 2870000 },
  { date: 'Fri', revenue: 3450000 },
  { date: 'Sat', revenue: 4580000 },
  { date: 'Sun', revenue: 4100000 },
];

export const redemptionOptions: RedemptionOption[] = [
  { id: 'redeem001', description: 'Potongan Rp 25.000', pointsRequired: 100, value: 25000, isActive: true },
  { id: 'redeem002', description: 'Potongan Rp 75.000', pointsRequired: 250, value: 75000, isActive: true },
  { id: 'redeem003', description: 'Liquid Gratis (senilai Rp 150.000)', pointsRequired: 500, value: 150000, isActive: true },
  { id: 'redeem004', description: 'Merchandise Eksklusif Topi', pointsRequired: 1000, value: 200000, isActive: true },
  { id: 'redeem005', description: 'Diskon 50% Semua Liquid (Maks. 1 botol)', pointsRequired: 750, value: 75000, isActive: false },
];
