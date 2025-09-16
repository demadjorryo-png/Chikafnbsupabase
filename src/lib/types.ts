export const productCategories = [
  'Liquid Freebase',
  'Liquid Saltnic',
  'Pod',
  'Mod',
  'AIO',
  'RDA',
  'RTA',
  'RDTA',
  'Coil',
  'Battery',
  'Cotton',
  'Drip Tip',
] as const;

export type ProductCategory = (typeof productCategories)[number];

export type Product = {
  id: string;
  name: string;
  barcode: string;
  category: ProductCategory;
  stock: number;
  price: number;
  costPrice: number;
  supplierId: string;
  imageUrl: string;
  imageHint: string;
  attributes: {
    brand: string;
    flavorProfile?: string;
    nicotine?: string;
    size?: string;
    pg_vg_ratio?: string;
    type?: string;
    powerOutput?: string;
    resistance?: string;
  };
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  birthDate: string; // YYYY-MM-DD
  joinDate: string; // ISO 8601
  loyaltyPoints: number;
  memberTier: 'Squab' | 'Flyer' | 'Homer';
  avatarUrl: string;
};

export type Transaction = {
  id: string;
  customerId: string;
  customerName: string;
  staffId: string;
  createdAt: string; // ISO 8601
  totalAmount: number;
  paymentMethod: 'Cash' | 'Card' | 'QRIS';
  pointsEarned: number;
  items: CartItem[];
};

export type CartItem = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
};
