import type { CollectionConfig, TransformArg } from './config.example'

const toISO = (v: any) => (v ? new Date(v).toISOString() : null)

const mapUsers = ({ id, data }: TransformArg) => ({
  id,
  email: data.email ?? null,
  name: data.name ?? null,
  role: data.role ?? null,
  whatsapp: data.whatsapp ?? null,
  status: data.status ?? 'active',
  store_id: data.storeId ?? null,
})

const mapStores = ({ id, data }: TransformArg) => ({
  id,
  name: data.name,
  location: data.location,
  business_description: data.businessDescription ?? null,
  receipt_settings: data.receiptSettings ?? {},
  point_earning_settings: data.pointEarningSettings ?? {},
  notification_settings: data.notificationSettings ?? {},
  pradana_token_balance: data.pradanaTokenBalance ?? 0,
  admin_uids: data.adminUids ?? [],
  created_at: toISO(data.createdAt) ?? new Date().toISOString(),
  first_transaction_date: toISO(data.firstTransactionDate),
  transaction_counter: data.transactionCounter ?? 0,
})

const mapProducts = ({ id, data }: TransformArg) => ({
  id,
  name: data.name,
  category: data.category,
  stock: data.stock ?? 0,
  price: Number(data.price ?? 0),
  cost_price: Number(data.costPrice ?? 0),
  supplier_id: data.supplierId ?? null,
  image_url: data.imageUrl ?? null,
  image_hint: data.imageHint ?? null,
  attributes: data.attributes ?? {},
  created_at: toISO(data.createdAt) ?? new Date().toISOString(),
})

const mapCustomers = ({ id, data }: TransformArg) => ({
  id,
  name: data.name,
  phone: data.phone,
  birth_date: data.birthDate ?? null,
  join_date: toISO(data.joinDate),
  loyalty_points: data.loyaltyPoints ?? 0,
  member_tier: data.memberTier ?? null,
  avatar_url: data.avatarUrl ?? null,
})

const mapTables = ({ id, data }: TransformArg) => ({
  id,
  name: data.name,
  status: data.status ?? 'Tersedia',
  capacity: data.capacity ?? 0,
  current_order: data.currentOrder ?? null,
})

const mapTransactions = ({ id, data }: TransformArg) => ({
  id,
  receipt_number: data.receiptNumber ?? 0,
  customer_id: data.customerId ?? null,
  customer_name: data.customerName ?? null,
  staff_id: data.staffId ?? null,
  created_at: toISO(data.createdAt) ?? new Date().toISOString(),
  subtotal: Number(data.subtotal ?? 0),
  discount_amount: Number(data.discountAmount ?? 0),
  total_amount: Number(data.totalAmount ?? 0),
  payment_method: data.paymentMethod ?? null,
  points_earned: data.pointsEarned ?? 0,
  points_redeemed: data.pointsRedeemed ?? 0,
  items: data.items ?? [],
  table_id: data.tableId ?? null,
  status: data.status ?? null,
})

const mapRedemptionOptions = ({ id, data }: TransformArg) => ({
  id,
  description: data.description,
  points_required: data.pointsRequired,
  value: Number(data.value ?? 0),
  is_active: Boolean(data.isActive ?? true),
})

const mapChallengePeriods = ({ id, data }: TransformArg) => ({
  id,
  start_date: data.startDate,
  end_date: data.endDate,
  period: data.period,
  challenges: data.challenges ?? [],
  is_active: Boolean(data.isActive ?? false),
  created_at: toISO(data.createdAt) ?? new Date().toISOString(),
})

const mapTopUpRequests = ({ id, data }: TransformArg) => ({
  id,
  store_name: data.storeName ?? null,
  user_id: data.userId ?? null,
  user_name: data.userName ?? null,
  amount: Number(data.amount ?? 0),
  unique_code: Number(data.uniqueCode ?? 0),
  total_amount: Number(data.totalAmount ?? 0),
  proof_url: data.proofUrl ?? null,
  status: data.status ?? 'pending',
  requested_at: toISO(data.requestedAt) ?? new Date().toISOString(),
  processed_at: toISO(data.processedAt) ?? null,
})

const mapAppliedStrategies = ({ id, data }: TransformArg) => ({
  id,
  type: data.type,
  recommendation: data.recommendation,
  applied_date: data.appliedDate,
  status: data.status,
})

export const collections: CollectionConfig[] = [
  { source: 'users', target: 'profiles', idField: 'id', upsertOn: ['id'], transform: mapUsers },
  { source: 'stores', target: 'stores', idField: 'id', upsertOn: ['id'], transform: mapStores },

  // Nested under stores/{storeId}
  { source: 'products', target: 'products', upsertOn: ['id'], collectionGroup: true, withStoreId: true, transform: mapProducts },
  { source: 'customers', target: 'customers', upsertOn: ['id'], collectionGroup: true, withStoreId: true, transform: mapCustomers },
  { source: 'tables', target: 'tables', upsertOn: ['id'], collectionGroup: true, withStoreId: true, transform: mapTables },
  { source: 'transactions', target: 'transactions', upsertOn: ['id'], collectionGroup: true, withStoreId: true, transform: mapTransactions },
  { source: 'redemptionOptions', target: 'redemption_options', upsertOn: ['id'], collectionGroup: true, withStoreId: true, transform: mapRedemptionOptions },
  { source: 'challengePeriods', target: 'challenge_periods', upsertOn: ['id'], collectionGroup: true, withStoreId: true, transform: mapChallengePeriods },
  { source: 'topUpRequests', target: 'top_up_requests', upsertOn: ['id'], collectionGroup: true, withStoreId: true, transform: mapTopUpRequests },
  { source: 'appliedStrategies', target: 'applied_strategies', upsertOn: ['id'], collectionGroup: true, withStoreId: true, transform: mapAppliedStrategies },

  // Global app settings
  { source: 'appSettings', target: 'app_settings', idField: 'id', upsertOn: ['id'], transform: ({ id, data }) => ({ id, data }) },
]

export default collections

