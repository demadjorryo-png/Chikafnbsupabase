
'use client';

import * as React from 'react';
import { MainSidebar } from '@/app/dashboard/main-sidebar';
import { Header } from '@/components/dashboard/header';
import { SidebarInset } from '@/components/ui/sidebar';
import Overview from '@/app/dashboard/views/overview';
import POS from '@/app/dashboard/views/pos';
import Products from '@/app/dashboard/views/products';
import Customers from '@/app/dashboard/views/customers';
import Transactions from '@/app/dashboard/views/transactions';
import PendingOrders from '@/app/dashboard/views/pending-orders';
import Employees from '@/app/dashboard/views/employees';
import Settings from '@/app/dashboard/views/settings';
import Challenges from '@/app/dashboard/views/challenges';
import Promotions from '@/app/dashboard/views/promotions';
import ReceiptSettings from '@/app/dashboard/views/receipt-settings';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { User, RedemptionOption, Product, Store, Customer, Transaction, PendingOrder } from '@/lib/types';
import AdminOverview from '@/app/dashboard/views/admin-overview';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getTransactionFeeSettings, defaultFeeSettings, getPradanaTokenBalance } from '@/lib/app-settings';
import type { TransactionFeeSettings } from '@/lib/app-settings';
import { useAuth } from '@/contexts/auth-context';

function VapeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 20v-6h12v6H6z" />
      <path d="M18 14V6" />
      <path d="M6 14V9" />
      <path d="M14 6h-4" />
      <path d="M12 6V4" />
    </svg>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'overview';
  
  const { currentUser, activeStore } = useAuth();
  
  const [stores, setStores] = React.useState<Store[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [pendingOrders, setPendingOrders] = React.useState<PendingOrder[]>([]);
  const [redemptionOptions, setRedemptionOptions] = React.useState<RedemptionOption[]>([]);
  const [feeSettings, setFeeSettings] = React.useState<TransactionFeeSettings>(defaultFeeSettings);
  const [pradanaTokenBalance, setPradanaTokenBalance] = React.useState(0);
  
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  const fetchAllData = React.useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    
    try {
        const [
            storesSnapshot,
            customersSnapshot,
            usersSnapshot,
            redemptionOptionsSnapshot,
            feeSettingsData,
            tokenBalanceData,
            transactionsSnapshot,
            pendingOrdersSnapshot,
        ] = await Promise.all([
            getDocs(collection(db, 'stores')),
            getDocs(query(collection(db, 'customers'), orderBy('name'))),
            getDocs(query(collection(db, 'users'))),
            getDocs(collection(db, 'redemptionOptions')),
            getTransactionFeeSettings(),
            getPradanaTokenBalance(),
            getDocs(collection(db, 'transactions')),
            getDocs(collection(db, 'pendingOrders')),
        ]);

        const allStores = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
        setStores(allStores);

        const firestoreUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(firestoreUsers);
        
        const isAdmin = currentUser?.role === 'admin';
        
        let allProducts: Product[] = [];
        if (!isAdmin && activeStore?.id) {
            // Cashier: fetch products from their active store.
            // Admin products are now fetched directly in the Products view component.
            const productCollectionName = `products_${activeStore.id.replace('store_', '')}`;
            const productsSnapshot = await getDocs(query(collection(db, productCollectionName), orderBy('name')));
            allProducts = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        }

        setProducts(allProducts);
        setCustomers(customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
        
        const unsortedTransactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        const sortedTransactions = unsortedTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTransactions(sortedTransactions);
        
        const unsortedPendingOrders = pendingOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PendingOrder));
        const sortedPendingOrders = unsortedPendingOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPendingOrders(sortedPendingOrders);
        
        setRedemptionOptions(redemptionOptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RedemptionOption)));
        setFeeSettings(feeSettingsData);
        setPradanaTokenBalance(tokenBalanceData);

    } catch (error) {
        console.error("Error fetching dashboard data: ", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Memuat Data',
            description: 'Terjadi kesalahan saat mengambil data. Coba muat ulang halaman.'
        });
    } finally {
        setIsLoading(false);
    }
  }, [currentUser, activeStore, toast]);
  
  React.useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const isAdmin = currentUser?.role === 'admin';
  
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const renderView = () => {
    const unauthorizedCashierViews = ['employees', 'challenges', 'receipt-settings'];
    
    if (!isAdmin && unauthorizedCashierViews.includes(view)) {
        return <Overview 
          transactions={transactions} 
          users={users} 
          customers={customers} 
          pendingOrders={pendingOrders} 
          onDataChange={fetchAllData} 
        />;
    }

    switch (view) {
      case 'overview':
        return isAdmin 
          ? <AdminOverview pendingOrders={pendingOrders} stores={stores} /> 
          : <Overview 
              transactions={transactions} 
              users={users} 
              customers={customers} 
              pendingOrders={pendingOrders} 
              onDataChange={fetchAllData} 
            />;
      case 'pos':
        return <POS 
                    products={products} 
                    customers={customers}
                    onDataChange={fetchAllData} 
                    isLoading={isLoading} 
                    feeSettings={feeSettings} 
                />;
      case 'products':
        // For admin, `stores` is passed, but products will be fetched inside.
        // For cashier, `products` is passed, which is already filtered for their store.
        return <Products 
                  products={products}
                  stores={stores}
                  onDataChange={fetchAllData}
                />;
      case 'customers':
        return <Customers customers={customers} onDataChange={fetchAllData} isLoading={isLoading} />;
      case 'employees':
        return <Employees />;
      case 'transactions':
        return <Transactions transactions={transactions} stores={stores} users={users} isLoading={isLoading} />;
      case 'pending-orders':
        return <PendingOrders products={products} customers={customers} onDataChange={fetchAllData} isLoading={isLoading} />;
      case 'settings':
        return <Settings />;
      case 'challenges':
        return <Challenges />;
      case 'promotions':
        return <Promotions 
                    redemptionOptions={redemptionOptions} 
                    setRedemptionOptions={setRedemptionOptions} 
                    transactions={transactions} 
                />;
      case 'receipt-settings':
        return <ReceiptSettings redemptionOptions={redemptionOptions} />;
      default:
        return isAdmin 
          ? <AdminOverview pendingOrders={pendingOrders} stores={stores} /> 
          : <Overview 
              transactions={transactions} 
              users={users} 
              customers={customers} 
              pendingOrders={pendingOrders} 
              onDataChange={fetchAllData} 
            />;
    }
  };

  const getTitle = () => {
    if (!isAdmin && ['employees', 'challenges', 'receipt-settings'].includes(view)) {
      return 'Dashboard Overview';
    }
    
    switch (view) {
      case 'overview':
        return isAdmin ? 'Admin Dashboard' : 'Dashboard Overview';
      case 'pos':
        return 'Point of Sale';
      case 'products':
        return 'Product Inventory';
      case 'customers':
        return 'Customer Management';
      case 'employees':
        return 'Employee Management';
      case 'transactions':
        return 'Transaction History';
       case 'pending-orders':
        return 'Pending Orders';
        case 'settings':
        return 'Settings';
      case 'challenges':
        return 'Employee Challenges';
      case 'promotions':
        return 'Promotions';
      case 'receipt-settings':
        return 'Receipt Settings';
      default:
        return 'Dashboard Overview';
    }
  };

  return (
    <>
      <MainSidebar pradanaTokenBalance={pradanaTokenBalance} />
      <SidebarInset>
        <Header title={getTitle()} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {currentUser ? renderView() : <DashboardSkeleton />}
        </main>
      </SidebarInset>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardSkeleton() {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <VapeIcon className="h-16 w-16 animate-pulse-slow text-primary/50" />
                <p className="font-headline text-xl tracking-wider text-muted-foreground">
                    Loading Dashboard...
                </p>
            </div>
        </div>
    )
}
