'use client';

import * as React from 'react';
import { MainSidebar } from '@/app/dashboard/main-sidebar';
import { Header } from '@/components/dashboard/header';
import { SidebarInset } from '@/components/ui/sidebar';
import Overview from '@/app/dashboard/views/overview';
import AdminOverview from '@/app/dashboard/views/admin-overview';
import SuperAdminOverview from '@/app/dashboard/views/superadmin-overview';
import POS from '@/app/dashboard/views/pos';
import Products from '@/app/dashboard/views/products';
import Customers from '@/app/dashboard/views/customers';
import CustomerAnalytics from '@/app/dashboard/views/customer-analytics';
import Transactions from '@/app/dashboard/views/transactions';
import Employees from '@/app/dashboard/views/employees';
import Settings from '@/app/dashboard/views/settings';
import Challenges from '@/app/dashboard/views/challenges';
import Promotions from '@/app/dashboard/views/promotions';
import ReceiptSettings from '@/app/dashboard/views/receipt-settings';
import Tables from '@/app/dashboard/views/tables';
import PlatformControl from '@/app/dashboard/views/platform-control';
import { Suspense } from 'react';
import type { User, RedemptionOption, Product, Store, Customer, Transaction, PendingOrder, Table } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getTransactionFeeSettings, defaultFeeSettings } from '@/lib/app-settings';
import type { TransactionFeeSettings } from '@/lib/app-settings';
import { useAuth } from '@/contexts/auth-context';
import { UtensilsCrossed, Printer } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Receipt } from '@/components/dashboard/receipt';
import { Button } from '@/components/ui/button';


function CheckoutReceiptDialog({ transaction, users, open, onOpenChange }: { transaction: Transaction | null; users: User[]; open: boolean; onOpenChange: (open: boolean) => void }) {
    if (!transaction) return null;
    
    const handlePrint = () => {
        const printableArea = document.querySelector('.printable-area');
        if(printableArea) {
            printableArea.innerHTML = ''; // Clear previous receipt
            const receiptNode = document.createElement('div');
            // This is a way to render React component to a node, not ideal but works for this case.
            // A better way would be to use ReactDOM.createPortal if we can get a stable node.
            const receiptString = document.getElementById(`receipt-for-${transaction.id}`)?.innerHTML;
            if (receiptString) {
                printableArea.innerHTML = receiptString;
                window.print();
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="font-headline tracking-wider text-center">Pratinjau Struk</DialogTitle>
                </DialogHeader>
                <div className="py-4" id={`receipt-for-${transaction.id}`}>
                    <Receipt transaction={transaction} users={users} />
                </div>
                <DialogFooter className="sm:justify-center">
                    <Button type="button" className="w-full gap-2" onClick={handlePrint}>
                        <Printer className="h-4 w-4" />
                        Cetak Struk
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DashboardContent() {
  const { currentUser, activeStore, isLoading: isAuthLoading, pradanaTokenBalance, refreshPradanaTokenBalance } = useAuth();
  const searchParams = useSearchParams();
  
  const [stores, setStores] = React.useState<Store[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [pendingOrders, setPendingOrders] = React.useState<PendingOrder[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [redemptionOptions, setRedemptionOptions] = React.useState<RedemptionOption[]>([]);
  const [tables, setTables] = React.useState<Table[]>([]);
  const [feeSettings, setFeeSettings] = React.useState<TransactionFeeSettings>(defaultFeeSettings);
  const [transactionToPrint, setTransactionToPrint] = React.useState<Transaction | null>(null);
  
  const [isDataLoading, setIsDataLoading] = React.useState(true);
  const { toast } = useToast();

  const fetchAllData = React.useCallback(async () => {
    // Superadmin doesn't need an activeStore but currentUser is required.
    if (!currentUser) return;
    // Other roles require an activeStore.
    if (currentUser.role !== 'superadmin' && !activeStore) return;

    setIsDataLoading(true);
    
    try {
        const storeId = activeStore?.id;
        
        let productCollectionRef, customerCollectionRef, transactionCollectionRef, tableCollectionRef;

        if (storeId) {
             productCollectionRef = collection(db, 'stores', storeId, 'products');
             customerCollectionRef = collection(db, 'stores', storeId, 'customers');
             transactionCollectionRef = collection(db, 'stores', storeId, 'transactions');
             tableCollectionRef = collection(db, 'stores', storeId, 'tables');
        }

        const [
            storesSnapshot,
            productsSnapshot,
            customersSnapshot,
            usersSnapshot,
            redemptionOptionsSnapshot,
            feeSettingsData,
            transactionsSnapshot,
            pendingOrdersSnapshot,
            tablesSnapshot,
        ] = await Promise.all([
            getDocs(collection(db, 'stores')),
            storeId ? getDocs(query(productCollectionRef, orderBy('name'))) : Promise.resolve({ docs: [] }),
            storeId ? getDocs(query(customerCollectionRef, orderBy('name'))) : Promise.resolve({ docs: [] }),
            getDocs(query(collection(db, 'users'))),
            getDocs(collection(db, 'redemptionOptions')),
            getTransactionFeeSettings(),
            storeId ? getDocs(query(transactionCollectionRef, orderBy('createdAt', 'desc'))) : Promise.resolve({ docs: [] }),
            getDocs(query(collection(db, 'pendingOrders'))),
            storeId ? getDocs(query(tableCollectionRef, orderBy('name'))) : Promise.resolve({ docs: [] }),
        ]);

        const allStores = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
        setStores(allStores);
        
        const allProducts = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(allProducts);

        setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
        setCustomers(customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
        
        setTransactions(transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
        setPendingOrders(pendingOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PendingOrder)));
        setTables(tablesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table)));
        
        setRedemptionOptions(redemptionOptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RedemptionOption)));
        setFeeSettings(feeSettingsData);
        
        if (activeStore) {
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
    if (isAuthLoading) return;
    if (!currentUser) {
        setIsDataLoading(false);
        return;
    }
    
    // Superadmin can fetch data without an active store.
    if (currentUser.role === 'superadmin') {
        fetchAllData();
    } 
    // Other roles need an active store to fetch data.
    else if (activeStore) {
        fetchAllData();
    }
    // If other roles don't have an active store yet, we don't fetch.
    else {
        setIsDataLoading(false);
    }
  }, [isAuthLoading, currentUser, activeStore, fetchAllData]);

  const isAdmin = currentUser?.role === 'admin';
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const view = searchParams.get('view') || (isSuperAdmin ? 'platform-control' : (isAdmin ? 'overview' : 'pos'));
  
  if (isAuthLoading || (isDataLoading && !isSuperAdmin)) {
    return <DashboardSkeleton />;
  }

  const renderView = () => {
    const unauthorizedCashierViews = ['employees', 'challenges', 'receipt-settings', 'customer-analytics', 'platform-control'];
    if (currentUser?.role === 'cashier' && unauthorizedCashierViews.includes(view)) {
        return <Tables 
                  tables={tables}
                  onDataChange={fetchAllData}
                  isLoading={isDataLoading}
                  onPrintRequest={setTransactionToPrint}
                />;
    }

    switch (view) {
      case 'platform-control':
        return <PlatformControl allStores={stores} allUsers={users} isLoading={isDataLoading} />;
      case 'overview':
        if (isSuperAdmin) {
            return <SuperAdminOverview allStores={stores} allUsers={users} isLoading={isDataLoading} />;
        }
        if (isAdmin) {
          return <AdminOverview
                    transactions={transactions} 
                    products={products}
                    customers={customers}
                    onDataChange={fetchAllData}
                    feeSettings={feeSettings}
                 />;
        }
        return <Overview 
              transactions={transactions} 
              users={users} 
              customers={customers}
              pendingOrders={pendingOrders}
              onDataChange={fetchAllData}
              feeSettings={feeSettings}
            />;
      case 'pos':
        const tableId = searchParams.get('tableId');
        if (tableId) {
             return <POS 
                    products={products} 
                    customers={customers}
                    tables={tables}
                    onDataChange={fetchAllData} 
                    isLoading={isDataLoading}
                    feeSettings={feeSettings}
                    pradanaTokenBalance={pradanaTokenBalance}
                    onPrintRequest={setTransactionToPrint}
                />;
        }
        return <Tables 
                  tables={tables}
                  onDataChange={fetchAllData}
                  isLoading={isDataLoading}
                  onPrintRequest={setTransactionToPrint}
                />;
      case 'products':
        return <Products 
                  products={products}
                  onDataChange={fetchAllData}
                  isLoading={isDataLoading}
                />;
      case 'customers':
        return <Customers customers={customers} onDataChange={fetchAllData} isLoading={isDataLoading} />;
      case 'customer-analytics':
        return <CustomerAnalytics customers={customers} transactions={transactions} isLoading={isDataLoading} />;
      case 'employees':
        return <Employees />;
      case 'transactions':
        return <Transactions transactions={transactions} users={users} customers={customers} onDataChange={fetchAllData} isLoading={isDataLoading} onPrintRequest={setTransactionToPrint} />;
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
        if (isSuperAdmin) return <PlatformControl allStores={stores} allUsers={users} isLoading={isDataLoading} />;
        return <Tables 
              tables={tables}
              onDataChange={fetchAllData}
              isLoading={isDataLoading}
              onPrintRequest={setTransactionToPrint}
            />;
    }
  };

  const getTitle = () => {
    // If we are in 'pos' view and have a tableId, it means we are in the actual POS screen.
    const tableId = searchParams.get('tableId');
    const tableName = searchParams.get('tableName');
    if (view === 'pos' && tableId) {
        return `Pesanan: ${tableName || ''}`;
    }

    const baseTitle = {
      'overview': 'Dashboard Overview',
      'pos': 'Manajemen Meja',
      'products': 'Inventaris Produk',
      'customers': 'Manajemen Pelanggan',
      'customer-analytics': 'Analisis Pelanggan',
      'employees': 'Manajemen Karyawan',
      'transactions': 'Riwayat Transaksi',
      'settings': 'Pengaturan',
      'challenges': 'Tantangan Karyawan',
      'promotions': 'Promosi',
      'receipt-settings': 'Pengaturan Struk',
      'platform-control': 'Kontrol Platform',
    }[view] || 'Manajemen Meja';
    
    if (isAdmin && !isSuperAdmin && view === 'overview') {
        return `Admin Overview`;
    }
    
    if (isSuperAdmin && view === 'overview') {
        return `Overview Platform`;
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
      <div className="printable-area" aria-hidden="true"></div>
       <CheckoutReceiptDialog
            transaction={transactionToPrint}
            users={users}
            open={!!transactionToPrint}
            onOpenChange={() => setTransactionToPrint(null)}
        />
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
                <UtensilsCrossed className="h-16 w-16 animate-pulse-slow text-primary/50" />
                <p className="font-headline text-xl tracking-wider text-muted-foreground">
                    Loading Dashboard...
                </p>
            </div>
        </div>
    )
}
