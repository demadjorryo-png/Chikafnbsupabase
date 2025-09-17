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
import Challenges from '@/app/dashboard/views/challenges';
import Promotions from '@/app/dashboard/views/promotions';
import ReceiptSettings from '@/app/dashboard/views/receipt-settings';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { stores, users, redemptionOptions as initialRedemptionOptions } from '@/lib/data';
import type { User, RedemptionOption } from '@/lib/types';
import AdminOverview from '@/app/dashboard/views/admin-overview';

function VapeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
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
  const storeId = searchParams.get('storeId') || stores[0].id;
  const userId = searchParams.get('userId');
  const activeStore = stores.find(s => s.id === storeId);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [redemptionOptions, setRedemptionOptions] = React.useState(initialRedemptionOptions);
  
  React.useEffect(() => {
    // TEMPORARY: Set a default user to bypass auth checks
    if (userId) {
        const user = users.find(u => u.id === userId);
        setCurrentUser(user || null);
    } else {
        // Fallback to a default admin if no userId is in URL
        setCurrentUser(users.find(u => u.role === 'admin') || null);
    }
  }, [userId]);

  if (!currentUser) {
    return <DashboardSkeleton />;
  }

  const renderView = () => {
    // If admin is on overview, show the special admin overview
    if (view === 'overview' && currentUser?.role === 'admin') {
      return <AdminOverview />;
    }

    // If a cashier tries to access a view they shouldn't, redirect to overview
    const unauthorizedCashierViews = ['employees', 'challenges', 'receipt-settings'];
    const isUnauthorized = unauthorizedCashierViews.includes(view) && currentUser?.role !== 'admin';
    
    if (isUnauthorized) {
      return <Overview storeId={storeId} />;
    }

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
      case 'challenges':
        return <Challenges />;
      case 'promotions':
        return <Promotions redemptionOptions={redemptionOptions} setRedemptionOptions={setRedemptionOptions} />;
      case 'receipt-settings':
        return <ReceiptSettings redemptionOptions={redemptionOptions} />;
      case 'overview':
      default:
        return <Overview storeId={storeId} />;
    }
  };

  const getTitle = () => {
    // Adjust title for admin overview
    if (view === 'overview' && currentUser?.role === 'admin') {
        return 'Admin Dashboard';
    }
    
    const unauthorizedCashierViews = ['employees', 'challenges', 'receipt-settings'];
    const isUnauthorized = unauthorizedCashierViews.includes(view) && currentUser?.role !== 'admin';
    if (isUnauthorized) {
      return 'Dashboard Overview';
    }
    
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
      case 'challenges':
        return 'Employee Challenges';
      case 'promotions':
        return 'Promotions';
      case 'receipt-settings':
        return 'Receipt Settings';
      case 'overview':
      default:
        return 'Dashboard Overview';
    }
  };

  return (
    <>
      <MainSidebar />
      <SidebarInset>
        <Header title={getTitle()} storeName={currentUser?.role !== 'admin' ? activeStore?.name : undefined} />
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
