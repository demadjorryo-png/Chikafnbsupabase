// Untuk menambah kategori produk baru, tambahkan nama kategori di dalam daftar di bawah ini.
// Pastikan untuk mengapitnya dengan tanda kutip tunggal (') dan menambahkan koma di akhir.
// Contoh: 'Liquid Freebase', 'Liquid Saltnic', 'Kategori Baru',
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
  'Lainnya',
] as const;

export type ProductCategory = (typeof productCategories)[number];

export type Store = {
  id: string;
  name: string;
  location: string;
};

export type UserRole = 'admin' | 'cashier';

export type User = {
  id: string;
  name: string;
  role: UserRole;
  storeId: string; // The primary store for a user
  userId?: string; // The login ID
  password?: string; // NOTE: Storing plain text password is not secure. For temporary use only.
  email?: string;
  status: 'active' | 'inactive';
};

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  stock: number; // Now a single number per product, as it's in a store-specific collection
  price: number;
  costPrice: number;
  supplierId: string;
  imageUrl: string;
  imageHint: string;
  attributes: {
    brand: string;
    barcode?: string;
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
  storeId: string;
  customerId: string;
  customerName: string;
  staffId: string;
  createdAt: string; // ISO 8601
  subtotal: number;
  discountAmount: number;
  totalAmount: number; // subtotal - discountAmount
  paymentMethod: 'Cash' | 'Card' | 'QRIS';
  pointsEarned: number;
  pointsRedeemed: number;
  items: CartItem[];
};

export type CartItem = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
};

export type PendingOrder = {
  id: string;
  storeId: string;
  customerId: string;
  customerName: string;
  customerAvatarUrl: string;
  productId: string;
  productName: string;
  quantity: number;
  createdAt: string; // ISO 8601
};

export type RedemptionOption = {
  id: string;
  description: string;
  pointsRequired: number;
  value: number;
  isActive: boolean;
};
