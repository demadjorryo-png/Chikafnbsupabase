'use client';

import * as React from 'react';
import { MainSidebar } from '@/components/dashboard/main-sidebar';
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
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { stores } from '@/lib/data';

function DashboardContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'overview';
  const storeId = searchParams.get('storeId') || stores[0].id;
  const activeStore = stores.find(s => s.id === storeId);

  const renderView = () => {
    switch (view) {
      case 'pos':
        return <POS />;
      case 'products':
        return <Products />;
      case 'customers':
        return <Customers />;
      case 'employees':
        return <Employees />;
      case 'transactions':
        return <Transactions />;
      case 'pending-orders':
        return <PendingOrders />;
      case 'settings':
        return <Settings />;
      case 'overview':
      default:
        return <Overview storeId={storeId} />;
    }
  };

  const getTitle = () => {
    switch (view) {
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
      case 'overview':
      default:
        return 'Dashboard Overview';
    }
  };

  return (
    <>
      <MainSidebar />
      <SidebarInset>
        <Header title={getTitle()} storeName={activeStore?.name} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {renderView()}
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
        <div className="flex min-h-screen w-full">
            <div className="hidden w-64 flex-col border-r bg-sidebar p-4 lg:flex">
                <Skeleton className="mb-6 h-8 w-32" />
                <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
            <div className="flex-1 p-6">
                <Skeleton className="mb-6 h-8 w-64" />
                <Skeleton className="h-[600px] w-full" />
            </div>
        </div>
    )
}
