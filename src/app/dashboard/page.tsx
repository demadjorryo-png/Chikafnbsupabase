'use client';

import * as React from 'react';
import { MainSidebar } from '@/components/dashboard/main-sidebar';
import { Header } from '@/components/dashboard/header';
import { SidebarInset } from '@/components/ui/sidebar';
import Overview from '@/components/dashboard/views/overview';
import POS from '@/components/dashboard/views/pos';
import Products from '@/components/dashboard/views/products';
import Customers from '@/components/dashboard/views/customers';
import Transactions from '@/components/dashboard/views/transactions';
import PendingOrders from '@/components/dashboard/views/pending-orders';
import Employees from '@/app/dashboard/views/employees';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'overview';

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
      case 'overview':
      default:
        return <Overview />;
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
      case 'overview':
      default:
        return 'Dashboard Overview';
    }
  };

  return (
    <>
      <MainSidebar />
      <SidebarInset>
        <Header title={getTitle()} />
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
