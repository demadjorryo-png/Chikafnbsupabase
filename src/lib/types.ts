
'use client';

// Untuk menambah kategori produk baru, tambahkan nama kategori di dalam daftar di bawah ini.
// Pastikan untuk mengapitnya dengan tanda kutip tunggal (') dan menambahkan koma di akhir.
export const productCategories = [
  'Kopi',
  'Non-Kopi',
  'Makanan Utama',
  'Makanan Ringan',
  'Dessert',
  'Lainnya',
] as const;

export type ProductCategory = (typeof productCategories)[number];

export type ReceiptSettings = {
    headerText: string;
    footerText: string;
    promoText: string;
    voiceGender: 'male' | 'female';
    notificationStyle: 'fakta' | 'pantun';
};

export type Store = {
  id: string;
  name: string;
  location: string;
  receiptSettings?: ReceiptSettings;
  pradanaTokenBalance: number;
  adminUids: string[];
  createdAt: string;
  firstTransactionDate?: string | null; // Can be null if no transactions yet
  transactionCounter?: number;
};

export type UserRole = 'admin' | 'cashier';

export type User = {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  whatsapp?: string;
  status: 'active' | 'inactive';
  storeId?: string; // Optional: Cashiers are tied to one store
};

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  stock: number;
  price: number;
  costPrice: number;
  supplierId: string;
  imageUrl: string;
  imageHint: string;
  attributes: {
    brand: string;
    barcode?: string;
    [key: string]: any; // Allow other generic attributes
  };
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  birthDate: string; // YYYY-MM-DD
  joinDate: string; // ISO 8601
  loyaltyPoints: number;
  memberTier: 'Bronze' | 'Silver' | 'Gold';
  avatarUrl: string;
};

export type TransactionStatus = 'Diproses' | 'Selesai' | 'Selesai Dibayar';

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
  tableId?: string; // Optional table reference
  status: TransactionStatus;
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

export type Challenge = {
  id: string;
  tier: string;
  description: string;
  target: number;
  reward: string;
};

export type ChallengePeriod = {
  id?: string;
  startDate: string;
  endDate: string;
  period: string;
  challenges: Challenge[];
  isActive: boolean;
};

export type TableStatus = 'Tersedia' | 'Terisi' | 'Dipesan' | 'Menunggu Dibersihkan';

export type TableOrder = {
  items: CartItem[];
  totalAmount: number;
  orderTime: string; // ISO 8601
};

export type Table = {
  id: string;
  name: string;
  status: TableStatus;
  capacity: number;
  currentOrder?: TableOrder | null;
};

export type TopUpRequest = {
  id: string;
  storeId: string;
  storeName: string;
  userId: string;
  userName: string;
  amount: number;
  uniqueCode: number;
  totalAmount: number;
  proofUrl: string;
  status: 'pending' | 'completed' | 'rejected';
  requestedAt: string; // ISO 8601 string
  processedAt?: string; // ISO 8601 string
};

export type TransactionFeeSettings = {
  tokenValueRp: number;
  feePercentage: number;
  minFeeRp: number;
  maxFeeRp: number;
  aiUsageFee: number;
  newStoreBonusTokens: number;
  aiBusinessPlanFee: number | string; // Can be string or number
  aiSessionFee: number;
  aiSessionDurationMinutes: number;
};

export type AppliedStrategy = {
  id: string;
  type: 'weekly' | 'monthly';
  recommendation: string;
  appliedDate: string;
  status: 'active' | 'completed';
};

export type AdminRecommendationOutput = {
  weeklyRecommendation: string;
  monthlyRecommendation: string;
};
