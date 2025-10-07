
'use client'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import type { User, RedemptionOption, Product, Store, Customer, Transaction, PendingOrder, Table, TransactionFeeSettings, ChallengePeriod } from '@/lib/types'
import { getTransactionFeeSettings, defaultFeeSettings } from '@/lib/app-settings'
import { supabase } from '@/lib/supabaseClient'

interface DashboardContextType {
  dashboardData: {
    stores: Store[];
    products: Product[];
    customers: Customer[];
    transactions: Transaction[];
    pendingOrders: PendingOrder[];
    users: User[];
    redemptionOptions: RedemptionOption[];
    tables: Table[];
    challengePeriods: ChallengePeriod[];
    feeSettings: TransactionFeeSettings;
  };
  isLoading: boolean;
  refreshData: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { currentUser, activeStore, isLoading: isAuthLoading, refreshPradanaTokenBalance } = useAuth();
  const { toast } = useToast();

  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [redemptionOptions, setRedemptionOptions] = useState<RedemptionOption[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [challengePeriods, setChallengePeriods] = useState<ChallengePeriod[]>([]);
  const [feeSettings, setFeeSettings] = useState<TransactionFeeSettings>(defaultFeeSettings);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    if (!currentUser) return
    if (currentUser.role !== 'superadmin' && !activeStore) return

    setIsLoading(true)
    try {
      const storeId = activeStore?.id

      const [storesRes, productsRes, customersRes, usersRes, redemptionsRes, feeSettingsData, tablesRes, challengePeriodsRes] = await Promise.all([
        supabase.from('stores').select('id, name, location, business_description, receipt_settings, point_earning_settings, notification_settings, pradana_token_balance, admin_uids, created_at, first_transaction_date, transaction_counter'),
        storeId ? supabase.from('products').select('*').eq('store_id', storeId).order('name') : Promise.resolve({ data: [] as any, error: null } as any),
        storeId ? supabase.from('customers').select('*').eq('store_id', storeId).order('name') : Promise.resolve({ data: [] as any, error: null } as any),
        supabase.from('profiles').select('id, name, role, email, status, store_id'),
        storeId ? supabase.from('redemption_options').select('*').eq('store_id', storeId) : Promise.resolve({ data: [] as any, error: null } as any),
        getTransactionFeeSettings(),
        storeId ? supabase.from('tables').select('*').eq('store_id', storeId).order('name') : Promise.resolve({ data: [] as any, error: null } as any),
        storeId ? supabase.from('challenge_periods').select('*').eq('store_id', storeId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] as any, error: null } as any),
      ])

      const mapStore = (s: any): Store => ({
        id: s.id,
        name: s.name,
        location: s.location,
        businessDescription: s.business_description ?? undefined,
        receiptSettings: s.receipt_settings ?? undefined,
        pointEarningSettings: s.point_earning_settings ?? undefined,
        notificationSettings: s.notification_settings ?? undefined,
        pradanaTokenBalance: s.pradana_token_balance ?? 0,
        adminUids: s.admin_uids ?? [],
        createdAt: new Date(s.created_at).toISOString(),
        firstTransactionDate: s.first_transaction_date ? new Date(s.first_transaction_date).toISOString() : null,
        transactionCounter: s.transaction_counter ?? 0,
      })

      setStores((storesRes.data || []).map(mapStore))
      setProducts((productsRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        stock: p.stock ?? 0,
        price: Number(p.price ?? 0),
        costPrice: Number(p.cost_price ?? 0),
        supplierId: p.supplier_id ?? '',
        imageUrl: p.image_url ?? '',
        imageHint: p.image_hint ?? '',
        attributes: p.attributes ?? {},
      })) as Product[])
      setCustomers((customersRes.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        birthDate: c.birth_date ?? '',
        joinDate: c.join_date ? new Date(c.join_date).toISOString() : new Date().toISOString(),
        loyaltyPoints: c.loyalty_points ?? 0,
        memberTier: c.member_tier ?? 'Bronze',
        avatarUrl: c.avatar_url ?? '',
      })) as Customer[])
      setUsers((usersRes.data || []).map((u: any) => ({
        id: u.id,
        name: u.name ?? (u.email ?? 'User'),
        role: u.role,
        email: u.email ?? undefined,
        status: u.status,
        storeId: u.store_id ?? undefined,
      })) as User[])
      setRedemptionOptions((redemptionsRes.data || []).map((r: any) => ({
        id: r.id,
        description: r.description,
        pointsRequired: r.points_required,
        value: Number(r.value ?? 0),
        isActive: !!r.is_active,
      })) as RedemptionOption[])
      setTables((tablesRes.data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        capacity: t.capacity ?? 0,
        currentOrder: t.current_order ?? null,
      })) as Table[])
      setChallengePeriods((challengePeriodsRes.data || []) as ChallengePeriod[])
      setFeeSettings(feeSettingsData as TransactionFeeSettings)

      if (activeStore) {
        await refreshPradanaTokenBalance()
      }
    } catch (error) {
      console.error('Error fetching dashboard data: ', error)
      toast({ variant: 'destructive', title: 'Gagal Memuat Data', description: 'Terjadi kesalahan saat mengambil data dasar.' })
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, activeStore, toast, refreshPradanaTokenBalance])

  useEffect(() => {
    if (isAuthLoading || !currentUser) {
      setIsLoading(false)
      return
    }

    refreshData()

    // Simple polling for transactions and pending orders as interim replacement for Firestore onSnapshot
    let interval: any
    if (currentUser.role !== 'superadmin' && activeStore?.id) {
      const storeId = activeStore.id
      const fetchRealtime = async () => {
        const [txRes, poRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('store_id', storeId).order('created_at', { ascending: false }),
          supabase.from('pending_orders').select('*').eq('store_id', storeId),
        ])
        setTransactions((txRes.data || []).map((t: any) => ({
          id: t.id,
          receiptNumber: t.receipt_number,
          storeId: t.store_id,
          customerId: t.customer_id,
          customerName: t.customer_name,
          staffId: t.staff_id,
          createdAt: new Date(t.created_at).toISOString(),
          subtotal: Number(t.subtotal ?? 0),
          discountAmount: Number(t.discount_amount ?? 0),
          totalAmount: Number(t.total_amount ?? 0),
          paymentMethod: t.payment_method,
          pointsEarned: t.points_earned ?? 0,
          pointsRedeemed: t.points_redeemed ?? 0,
          items: t.items ?? [],
          tableId: t.table_id ?? undefined,
          status: t.status,
        })) as Transaction[])
        setPendingOrders((poRes.data || []).map((p: any) => ({
          id: p.id,
          storeId: p.store_id,
          customerId: p.customer_id,
          customerName: p.customer_name,
          customerAvatarUrl: p.customer_avatar_url,
          productId: p.product_id,
          productName: p.product_name,
          quantity: p.quantity,
          createdAt: new Date(p.created_at).toISOString(),
        })) as PendingOrder[])
      }
      fetchRealtime()
      interval = setInterval(fetchRealtime, 5000)
    } else if (currentUser.role === 'superadmin') {
      setTransactions([])
      setPendingOrders([])
    }

    return () => { if (interval) clearInterval(interval) }
  }, [isAuthLoading, currentUser, activeStore, refreshData, toast])

  const value = {
    dashboardData: {
        stores,
        products,
        customers,
        transactions,
        pendingOrders,
        users,
        redemptionOptions,
        tables,
        challengePeriods,
        feeSettings,
    },
    isLoading,
    refreshData,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
