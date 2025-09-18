import type { Product, Customer, Transaction, PendingOrder, Store, User, RedemptionOption } from './types';

// NOTE: This file now contains only the structure and default/fallback data.
// The primary data source is now Firebase Firestore.

export const stores: Store[] = [
    { 
        id: 'store_tpg', 
        name: 'Bekupon Tumpang', 
        location: 'Tumpang, Malang',
        receiptSettings: {
            headerText: "Bekupon Vape Store Tumpang\nJl. Raya Tumpang No. 123, Malang\nTelp: 0812-3456-7890",
            footerText: "Terima kasih, selamat nge-vape!",
            promoText: "Dapatkan Liquid Gratis setiap pembelian 500rb!",
        }
    },
    { 
        id: 'store_swj', 
        name: 'Bekupon Sawojajar', 
        location: 'Sawojajar, Malang',
        receiptSettings: {
            headerText: "Bekupon Vape Store Sawojajar\nJl. Danau Toba No. 1, Malang\nTelp: 0898-7654-3210",
            footerText: "Follow IG @bekuponvape untuk info terbaru!",
            promoText: "Tukar 100 poin & dapatkan diskon Rp 25.000!",
        }
    },
];

// Superadmin data is kept for login purposes. Other users are managed in Firebase.
export const users: User[] = [
];


export const products: Product[] = [
  {
    id: 'prod_001',
    name: 'Dark Luna Strawberry Cheesecake',
    category: 'Liquid Freebase',
    stock: 25,
    price: 150000,
    costPrice: 110000,
    supplierId: 'sup_emkay',
    imageUrl: 'https://picsum.photos/seed/vape1/400/400',
    imageHint: 'vape liquid',
    attributes: {
      brand: 'Emkay',
      barcode: '899000000001',
      flavorProfile: 'Strawberry, Cheesecake, Creamy',
      nicotine: '3mg',
      size: '100ml',
      pg_vg_ratio: '30/70',
    },
  },
  {
    id: 'prod_002',
    name: 'Ursa Nano Pro Pod Kit',
    category: 'Pod',
    stock: 15,
    price: 350000,
    costPrice: 280000,
    supplierId: 'sup_lostvape',
    imageUrl: 'https://picsum.photos/seed/vape2/400/400',
    imageHint: 'vape device',
    attributes: {
      brand: 'Lost Vape',
      barcode: '899000000002',
      powerOutput: '9-25W',
      type: 'Pod System',
    },
  },
  {
    id: 'prod_003',
    name: 'Dead Rabbit V3 RDA',
    category: 'RDA',
    stock: 10,
    price: 380000,
    costPrice: 310000,
    supplierId: 'sup_hellvape',
    imageUrl: 'https://picsum.photos/seed/vape7/400/400',
    imageHint: 'vape atomizer',
    attributes: {
      brand: 'Hellvape',
      barcode: '899000000003',
      resistance: 'Dual Coil',
    },
  },
  {
    id: 'prod_004',
    name: 'Grappy Saltnic',
    category: 'Liquid Saltnic',
    stock: 30,
    price: 120000,
    costPrice: 85000,
    supplierId: 'sup_emkay',
    imageUrl: 'https://picsum.photos/seed/vape4/400/400',
    imageHint: 'vape liquid',
    attributes: {
      brand: 'Emkay',
      barcode: '899000000004',
      flavorProfile: 'Grape, Mint',
      nicotine: '25mg',
      size: '30ml',
      pg_vg_ratio: '50/50',
    },
  },
  {
    id: 'prod_005',
    name: 'Centaurus M200 Mod',
    category: 'Mod',
    stock: 8,
    price: 750000,
    costPrice: 650000,
    supplierId: 'sup_lostvape',
    imageUrl: 'https://picsum.photos/seed/vape6/400/400',
    imageHint: 'vape device',
    attributes: {
      brand: 'Lost Vape',
      barcode: '899000000005',
      powerOutput: '5-200W',
      type: 'Box Mod',
    },
  },
   {
    id: 'prod_006',
    name: 'Kapas Kendo Gold Edition',
    category: 'Cotton',
    stock: 50,
    price: 80000,
    costPrice: 60000,
    supplierId: 'sup_generic',
    imageUrl: 'https://picsum.photos/seed/vape8/400/400',
    imageHint: 'vape cotton',
    attributes: {
      brand: 'Kendo',
      barcode: '899000000006',
    },
  },
  {
    id: 'prod_007',
    name: 'VTC 6 Battery',
    category: 'Battery',
    stock: 40,
    price: 90000,
    costPrice: 65000,
    supplierId: 'sup_generic',
    imageUrl: 'https://picsum.photos/seed/vape9/400/400',
    imageHint: 'vape battery',
    attributes: {
      brand: 'Sony',
      barcode: '899000000007',
      type: '18650',
    },
  },
    {
    id: 'prod_008',
    name: 'Coil Master Fused Clapton',
    category: 'Coil',
    stock: 20,
    price: 50000,
    costPrice: 35000,
    supplierId: 'sup_generic',
    imageUrl: 'https://picsum.photos/seed/vape3/400/400',
    imageHint: 'vape coil',
    attributes: {
      brand: 'Coil Master',
      barcode: '899000000008',
      resistance: '0.45ohm',
    },
  },
  {
    id: 'prod_009',
    name: 'Blondies Banana Saltnic',
    category: 'Liquid Saltnic',
    stock: 18,
    price: 110000,
    costPrice: 80000,
    supplierId: 'sup_emkay',
    imageUrl: 'https://picsum.photos/seed/vape10/400/400',
    imageHint: 'vape liquid',
    attributes: {
      brand: 'Emkay',
      barcode: '899000000009',
      flavorProfile: 'Banana, Creamy',
      nicotine: '30mg',
      size: '30ml',
      pg_vg_ratio: '50/50',
    },
  },
  {
    id: 'prod_010',
    name: 'Oxva Xlim Pro',
    category: 'Pod',
    stock: 22,
    price: 400000,
    costPrice: 320000,
    supplierId: 'sup_oxva',
    imageUrl: 'https://picsum.photos/seed/vape11/400/400',
    imageHint: 'vape device',
    attributes: {
      brand: 'Oxva',
      barcode: '899000000010',
      powerOutput: '5-30W',
      type: 'Pod System',
    },
  },
];
export const customers: Customer[] = [];
export const transactions: Transaction[] = [];
export const pendingOrders: PendingOrder[] = [];


export const salesData: { date: string, revenue: number }[] = [];

export const redemptionOptions: RedemptionOption[] = [];
