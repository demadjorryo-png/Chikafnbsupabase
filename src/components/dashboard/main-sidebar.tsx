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
} from 'lucide-react';
import * as React from 'react';
import { users } from '@/lib/data';
import type { User } from '@/lib/types';

export function MainSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'overview';
  const storeId = searchParams.get('storeId');
  const userId = searchParams.get('userId'); 
  
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    if (userId) {
      const user = users.find(u => u.id === userId);
      setCurrentUser(user || null);
    }
  }, [userId]);


  const navigate = (view: string) => {
    router.push(`/dashboard?view=${view}&storeId=${storeId}&userId=${userId}`);
  };

  const handleLogout = () => {
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
      view: 'challenges',
      label: 'Tantangan',
      icon: <Trophy />,
      roles: ['admin'],
    },
  ];
  
  const menuItems = currentUser 
    ? allMenuItems.filter(item => item.roles.includes(currentUser.role))
    : [];


  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Logo />
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
