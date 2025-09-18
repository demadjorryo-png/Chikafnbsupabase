

'use client';

import * as React from 'react';
import { MainSidebar } from '@/app/dashboard/main-sidebar';
import { Header } from '@/components/dashboard/header';
import { SidebarInset } from '@/components/ui/sidebar';
import Overview from '@/app/dashboard/views/overview';
import AdminOverview from '@/app/dashboard/views/admin-overview';
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
import { Suspense } from 'react';
import type { User, RedemptionOption, Product, Store, Customer, Transaction, PendingOrder } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getTransactionFeeSettings, defaultFeeSettings } from '@/lib/app-settings';
import type { TransactionFeeSettings } from '@/lib/app-settings';
import { useAuth } from '@/contexts/auth-context';
import { ShoppingCart } from 'lucide-react';

function DashboardContent() {
  const { currentUser, activeStore, isLoading: isAuthLoading, pradanaTokenBalance, refreshPradanaTokenBalance } = useAuth();
  
  const [stores, setStores] = React.useState<Store[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [pendingOrders, setPendingOrders] = React.useState<PendingOrder[]>([]);
  const [redemptionOptions, setRedemptionOptions] = React.useState<RedemptionOption[]>([]);
  const [feeSettings, setFeeSettings] = React.useState<TransactionFeeSettings>(defaultFeeSettings);
  
  const [isDataLoading, setIsDataLoading] = React.useState(true);
  const { toast } = useToast();

  const fetchAllData = React.useCallback(async () => {
    if (!currentUser || !activeStore) return;
    setIsDataLoading(true);
    
    try {
        const productCollectionName = `products_${activeStore.id.replace('store_', '')}`;

        const [
            storesSnapshot,
            productsSnapshot,
            customersSnapshot,
            usersSnapshot,
            redemptionOptionsSnapshot,
            feeSettingsData,
            transactionsSnapshot,
            pendingOrdersSnapshot,
        ] = await Promise.all([
            getDocs(collection(db, 'stores')),
            getDocs(query(collection(db, productCollectionName), orderBy('name'))),
            getDocs(query(collection(db, 'customers'), orderBy('name'))),
            getDocs(query(collection(db, 'users'))),
            getDocs(collection(db, 'redemptionOptions')),
            getTransactionFeeSettings(),
            getDocs(collection(db, 'transactions')),
            getDocs(collection(db, 'pendingOrders')),
        ]);

        const allStores = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
        setStores(allStores);
        
        const allProducts = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(allProducts);

        setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
        setCustomers(customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
        
        const unsortedTransactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        const sortedTransactions = unsortedTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTransactions(sortedTransactions);
        
        const unsortedPendingOrders = pendingOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PendingOrder));
        const sortedPendingOrders = unsortedPendingOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPendingOrders(sortedPendingOrders);
        
        setRedemptionOptions(redemptionOptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RedemptionOption)));
        setFeeSettings(feeSettingsData);
        
        // Refresh token balance as part of data fetch
        if (currentUser.role === 'admin') {
            refreshPradanaTokenBalance();
        }

    } catch (error) {
        console.error("Error fetching dashboard data: ", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Memuat Data',
            description: 'Terjadi kesalahan saat mengambil data. Coba muat ulang halaman.'
        });
    } finally {
        setIsDataLoading(false);
    }
  }, [currentUser, activeStore, toast, refreshPradanaTokenBalance]);
  
  React.useEffect(() => {
    if (!isAuthLoading && currentUser && activeStore) {
        fetchAllData();
    } else if (!isAuthLoading && (!currentUser || !activeStore)) {
        setIsDataLoading(false);
    }
  }, [isAuthLoading, currentUser, activeStore, fetchAllData]);

  const isAdmin = currentUser?.role === 'admin';
  const view = new URLSearchParams(window.location.search).get('view') || 'overview';
  
  if (isAuthLoading || (isDataLoading && view !== 'employees' && view !== 'challenges' && view !== 'settings')) {
    return <DashboardSkeleton />;
  }

  const renderView = () => {
    const storeTransactions = transactions.filter(t => t.storeId === activeStore?.id);
    const storePendingOrders = pendingOrders.filter(po => po.storeId === activeStore?.id);

    const unauthorizedCashierViews = ['employees', 'challenges', 'receipt-settings'];
    if (!isAdmin && unauthorizedCashierViews.includes(view)) {
        return <Overview 
          transactions={storeTransactions} 
          users={users} 
          customers={customers} 
          pendingOrders={storePendingOrders} 
          onDataChange={fetchAllData}
          feeSettings={feeSettings} 
        />;
    }

    switch (view) {
      case 'overview':
        if (isAdmin) {
          return <AdminOverview
                    transactions={storeTransactions} 
                    products={products}
                    customers={customers}
                    pendingOrders={storePendingOrders}
                    onDataChange={fetchAllData}
                    feeSettings={feeSettings}
                 />;
        }
        return <Overview 
              transactions={storeTransactions} 
              users={users} 
              customers={customers} 
              pendingOrders={storePendingOrders} 
              onDataChange={fetchAllData}
              feeSettings={feeSettings}
            />;
      case 'pos':
        return <POS 
                    products={products} 
                    customers={customers}
                    onDataChange={fetchAllData} 
                    isLoading={isDataLoading}
                    feeSettings={feeSettings}
                    pradanaTokenBalance={pradanaTokenBalance}
                />;
      case 'products':
        return <Products 
                  products={products}
                  stores={stores}
                  onDataChange={fetchAllData}
                  isLoading={isDataLoading}
                />;
      case 'customers':
        return <Customers customers={customers} onDataChange={fetchAllData} isLoading={isDataLoading} />;
      case 'employees':
        return <Employees />;
      case 'transactions':
        return <Transactions transactions={storeTransactions} stores={stores} users={users} isLoading={isDataLoading} />;
      case 'pending-orders':
        return <PendingOrders products={products} customers={customers} onDataChange={fetchAllData} isLoading={isDataLoading} />;
      case 'settings':
        return <Settings />;
      case 'challenges':
        return <Challenges feeSettings={feeSettings} />;
      case 'promotions':
        return <Promotions 
                    redemptionOptions={redemptionOptions} 
                    setRedemptionOptions={setRedemptionOptions} 
                    transactions={transactions}
                    feeSettings={feeSettings}
                />;
      case 'receipt-settings':
        return <ReceiptSettings redemptionOptions={redemptionOptions} feeSettings={feeSettings} />;
      default:
        return <Overview 
              transactions={storeTransactions} 
              users={users} 
              customers={customers} 
              pendingOrders={storePendingOrders} 
              onDataChange={fetchAllData} 
              feeSettings={feeSettings}
            />;
    }
  };

  const getTitle = () => {
    const baseTitle = {
      'overview': 'Dashboard Overview',
      'pos': 'Point of Sale',
      'products': 'Product Inventory',
      'customers': 'Customer Management',
      'employees': 'Employee Management',
      'transactions': 'Transaction History',
      'pending-orders': 'Pending Orders',
      'settings': 'Settings',
      'challenges': 'Employee Challenges',
      'promotions': 'Promotions',
      'receipt-settings': 'Receipt Settings',
    }[view] || 'Dashboard';
    
    if (isAdmin && view === 'overview') {
        return `Admin Overview`;
    }

    return baseTitle;
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
                <ShoppingCart className="h-16 w-16 animate-pulse-slow text-primary/50" />
                <p className="font-headline text-xl tracking-wider text-muted-foreground">
                    Loading Dashboard...
                </p>
            </div>
        </div>
    )
}
