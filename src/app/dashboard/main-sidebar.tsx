'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Logo } from './logo';
import {
  LayoutGrid,
  ShoppingCart,
  Package,
  Users,
  LogOut,
  Settings,
  ClipboardList,
  History,
  UsersRound,
  Trophy,
  TicketPercent,
  CircleDollarSign,
  Receipt,
} from 'lucide-react';
import * as React from 'react';
import { stores, users } from '@/lib/data';
import type { User, Store } from '@/lib/types';
import { Separator } from '../ui/separator';
import { TopUpDialog } from './top-up-dialog';
import { Dialog, DialogTrigger } from '../ui/dialog';

export function MainSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'overview';
  const storeId = searchParams.get('storeId');
  const userId = searchParams.get('userId'); 
  
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [activeStore, setActiveStore] = React.useState<Store | null>(null);
  const [isTopUpOpen, setIsTopUpOpen] = React.useState(false);


  React.useEffect(() => {
    // TEMPORARY: Set a default user to bypass auth checks
    if (userId) {
        const user = users.find(u => u.id === userId);
        setCurrentUser(user || null);
    } else {
        // Fallback to a default admin if no userId is in URL
        setCurrentUser(users.find(u => u.role === 'admin') || null);
    }

    if (storeId) {
        const store = stores.find(s => s.id === storeId);
        setActiveStore(store || null);
    }
  }, [userId, storeId]);


  const navigate = (view: string) => {
    // For admin, overview should point to the admin overview.
    if (currentUser?.role === 'admin' && view === 'overview') {
        router.push(`/dashboard?view=overview&storeId=${storeId}&userId=${userId}`);
        return;
    }
    router.push(`/dashboard?view=${view}&storeId=${storeId}&userId=${userId}`);
  };

  const handleLogout = async () => {
    // Since login is disabled, this will just simulate a logout
    alert("Logout clicked. In a real scenario, you'd be redirected to the login page.");
  };

  const allMenuItems = [
    {
      view: 'overview',
      label: 'Overview',
      icon: <LayoutGrid />,
      roles: ['admin', 'cashier'],
    },
    {
      view: 'pos',
      label: 'Point of Sale',
      icon: <ShoppingCart />,
      roles: ['admin', 'cashier'],
    },
    {
      view: 'products',
      label: 'Products',
      icon: <Package />,
      roles: ['admin', 'cashier'],
    },
    {
      view: 'customers',
      label: 'Customers',
      icon: <Users />,
      roles: ['admin', 'cashier'],
    },
    {
      view: 'employees',
      label: 'Karyawan',
      icon: <UsersRound />,
      roles: ['admin'],
    },
    {
      view: 'transactions',
      label: 'Transactions',
      icon: <History />,
      roles: ['admin', 'cashier'],
    },
    {
      view: 'pending-orders',
      label: 'Pending Orders',
      icon: <ClipboardList />,
      roles: ['admin', 'cashier'],
    },
    {
      view: 'promotions',
      label: 'Promotions',
      icon: <TicketPercent />,
      roles: ['admin', 'cashier'],
    },
    {
      view: 'challenges',
      label: 'Tantangan',
      icon: <Trophy />,
      roles: ['admin'],
    },
    {
      view: 'receipt-settings',
      label: 'Receipt Settings',
      icon: <Receipt />,
      roles: ['admin'],
    },
  ];
  
  const menuItems = currentUser 
    ? allMenuItems.filter(item => item.roles.includes(currentUser.role))
    : [];

  const isAdmin = currentUser?.role === 'admin';

  const tokenDisplay = (
      <div className="flex items-center justify-center gap-2 text-sidebar-foreground">
          <CircleDollarSign className="h-4 w-4" />
          {activeStore && <span className="font-mono text-sm font-semibold">{activeStore.coinBalance.toLocaleString()}</span>}
      </div>
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="items-center">
        <Logo />
        {activeStore && (
            <div className="mt-2 w-full text-center group-data-[collapsible=icon]:hidden">
                <Separator className="mb-2 bg-sidebar-border" />
                 <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
                    {isAdmin ? (
                        <DialogTrigger asChild>
                            <div className="cursor-pointer rounded-md p-1 hover:bg-sidebar-accent">
                                {tokenDisplay}
                            </div>
                        </DialogTrigger>
                    ) : (
                        <div className="p-1">
                            {tokenDisplay}
                        </div>
                    )}
                    <TopUpDialog 
                        storeName={activeStore.name} 
                        currentBalance={activeStore.coinBalance}
                        setDialogOpen={setIsTopUpOpen} 
                    />
                 </Dialog>
                 <p className="text-xs text-sidebar-foreground/70">Pradana Token</p>
            </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.view}>
              <SidebarMenuButton
                onClick={() => navigate(item.view)}
                isActive={currentView === item.view}
                tooltip={item.label}
              >
                {item.icon}
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
         <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings" onClick={() => navigate('settings')} isActive={currentView === 'settings'}>
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Log Out" onClick={handleLogout}>
              <LogOut />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
