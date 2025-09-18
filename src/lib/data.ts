import type { Product, Customer, Transaction, PendingOrder, Store, User, RedemptionOption } from './types';

// NOTE: This file now contains only the structure and default/fallback data.
// The primary data source is now Firebase Firestore.

export const stores: Store[] = [
    { 
        id: 'store_001', 
        name: 'Toko Utama', 
        location: 'Jakarta, Indonesia',
        receiptSettings: {
            headerText: "Toko Kelontong Chika\nJl. Merdeka No. 17, Jakarta\nTelp: 0812-3456-7890",
            footerText: "Terima kasih telah berbelanja!",
            promoText: "Follow kami @tokochika untuk info terbaru!",
        }
    },
];

export const users: User[] = [];

export const products: Product[] = [
  {
    id: 'prod_001',
    name: 'Kopi Susu Gula Aren',
    category: 'Minuman',
    stock: 25,
    price: 18000,
    costPrice: 10000,
    supplierId: 'sup_coffee',
    imageUrl: 'https://picsum.photos/seed/coffee1/400/400',
    imageHint: 'iced coffee',
    attributes: {
      brand: 'Chika Coffee',
      barcode: '899000000001',
    },
  },
  {
    id: 'prod_002',
    name: 'T-Shirt Polos Hitam',
    category: 'Pakaian',
    stock: 15,
    price: 99000,
    costPrice: 65000,
    supplierId: 'sup_clothing',
    imageUrl: 'https://picsum.photos/seed/shirt1/400/400',
    imageHint: 'black t-shirt',
    attributes: {
      brand: 'Chika Apparel',
      barcode: '899000000002',
    },
  },
  {
    id: 'prod_003',
    name: 'Mouse Wireless',
    category: 'Elektronik',
    stock: 10,
    price: 150000,
    costPrice: 110000,
    supplierId: 'sup_elec',
    imageUrl: 'https://picsum.photos/seed/mouse1/400/400',
    imageHint: 'computer mouse',
    attributes: {
      brand: 'TechPro',
      barcode: '899000000003',
    },
  },
  {
    id: 'prod_004',
    name: 'Roti Bakar Coklat Keju',
    category: 'Makanan',
    stock: 30,
    price: 15000,
    costPrice: 8000,
    supplierId: 'sup_bakery',
    imageUrl: 'https://picsum.photos/seed/toast1/400/400',
    imageHint: 'chocolate toast',
    attributes: {
      brand: 'Chika Bakery',
      barcode: '899000000004',
    },
  },
];
export const customers: Customer[] = [];
export const transactions: Transaction[] = [];
export const pendingOrders: PendingOrder[] = [];
export const salesData: { date: string, revenue: number }[] = [];
export const redemptionOptions: RedemptionOption[] = [];
