
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
import type { User, Transaction } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useDashboard } from '@/contexts/dashboard-context';
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
  const { currentUser, pradanaTokenBalance } = useAuth();
  const { dashboardData, isLoading, refreshData } = useDashboard();
  const searchParams = useSearchParams();
  const [transactionToPrint, setTransactionToPrint] = React.useState<Transaction | null>(null);

  const isAdmin = currentUser?.role === 'admin';
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const view = searchParams.get('view') || (isSuperAdmin ? 'platform-control' : (isAdmin ? 'overview' : 'pos'));
  
  if (isLoading || !dashboardData) {
    return <DashboardSkeleton />;
  }

  const { products, customers, tables, feeSettings, users, transactions } = dashboardData;

  const renderView = () => {
    const unauthorizedCashierViews = ['employees', 'challenges', 'receipt-settings', 'customer-analytics', 'platform-control'];
    if (currentUser?.role === 'cashier' && unauthorizedCashierViews.includes(view)) {
        return <Tables tables={tables} onDataChange={refreshData} isLoading={isLoading} onPrintRequest={setTransactionToPrint} />;
    }

    switch (view) {
      case 'platform-control':
        return <PlatformControl />;
      case 'overview':
        if (isSuperAdmin) {
            return <SuperAdminOverview />;
        }
        if (isAdmin) {
          return <AdminOverview />;
        }
        return <Overview />;
      case 'pos':
        const tableId = searchParams.get('tableId');
        if (tableId) {
             return <POS 
                products={products}
                customers={customers}
                tables={tables}
                onDataChange={refreshData}
                isLoading={isLoading}
                feeSettings={feeSettings}
                pradanaTokenBalance={pradanaTokenBalance}
                onPrintRequest={setTransactionToPrint}
             />;
        }
        return <Tables tables={tables} onDataChange={refreshData} isLoading={isLoading} onPrintRequest={setTransactionToPrint} />;
      case 'products':
        return <Products />;
      case 'customers':
        return <Customers />;
      case 'customer-analytics':
        return <CustomerAnalytics />;
      case 'employees':
        return <Employees />;
      case 'transactions':
        return <Transactions onPrintRequest={setTransactionToPrint} />;
      case 'settings':
        return <Settings />;
      case 'challenges':
        return <Challenges />;
      case 'promotions':
        return <Promotions />;
      case 'receipt-settings':
        return <ReceiptSettings />;
      default:
        if (isSuperAdmin) return <PlatformControl />;
        return <Tables tables={tables} onDataChange={refreshData} isLoading={isLoading} onPrintRequest={setTransactionToPrint} />;
    }
  };

  const getTitle = () => {
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
