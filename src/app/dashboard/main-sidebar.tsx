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
import { Logo } from '@/components/dashboard/logo';
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
  UserCircle,
} from 'lucide-react';
import * as React from 'react';
import type { User, Store } from '@/lib/types';
import { Separator } from '../ui/separator';
import { TopUpDialog } from '@/components/dashboard/top-up-dialog';
import { Dialog, DialogTrigger } from '../ui/dialog';
import { auth } from '@/lib/firebase';

type MainSidebarProps = {
  currentUser: User | null;
  activeStore: Store | null;
  pradanaTokenBalance: number;
}

export function MainSidebar({ currentUser, activeStore, pradanaTokenBalance }: MainSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'overview';
  const storeId = searchParams.get('storeId');
  const userId = searchParams.get('userId'); 
  
  const [isTopUpOpen, setIsTopUpOpen] = React.useState(false);

  React.useEffect(() => {
    // Redirect if essential data is missing
    if (!userId || !storeId) {
        router.push('/login');
    }
  }, [userId, storeId, router]);

  const navigate = (view: string) => {
    // Admin overview has a special route structure for now
    if (currentUser?.role === 'admin' && view === 'overview') {
        router.push(`/dashboard?view=overview&storeId=${storeId}&userId=${userId}`);
        return;
    }
    router.push(`/dashboard?view=${view}&storeId=${storeId}&userId=${userId}`);
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
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
      roles: [], // Removed 'admin' and 'cashier' to hide it, will add back cashier
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
  
  // Re-add 'cashier' to POS roles
  const posMenuItem = allMenuItems.find(item => item.view === 'pos');
  if (posMenuItem) {
    posMenuItem.roles = ['cashier'];
  }
  
  const menuItems = currentUser 
    ? allMenuItems.filter(item => item.roles.includes(currentUser.role))
    : [];

  const isAdmin = currentUser?.role === 'admin';

  const tokenDisplay = (
      <div className="flex items-center justify-center gap-2 text-sidebar-foreground">
          <CircleDollarSign className="h-4 w-4" />
          <span className="font-mono text-sm font-semibold">{pradanaTokenBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
      </div>
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="items-center">
        <Logo />
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
                    currentBalance={pradanaTokenBalance}
                    setDialogOpen={setIsTopUpOpen} 
                />
              </Dialog>
              <p className="text-xs text-sidebar-foreground/70">Pradana Token</p>
        </div>
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
            {currentUser && (
               <div className="mb-2 w-full p-2 group-data-[collapsible=icon]:hidden">
                  <Separator className="mb-2 bg-sidebar-border" />
                  <div className="flex items-center gap-2 rounded-md p-2">
                     <UserCircle className="h-8 w-8 shrink-0" />
                     <div className="overflow-hidden">
                        <p className="truncate font-semibold">{currentUser.name}</p>
                        <p className="truncate text-xs text-sidebar-foreground/70 capitalize">{currentUser.role}</p>
                     </div>
                  </div>
               </div>
            )}
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
