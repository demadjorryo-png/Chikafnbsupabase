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
} from 'lucide-react';

export function MainSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'overview';

  const navigate = (view: string) => {
    router.push(`/dashboard?view=${view}`);
  };

  const menuItems = [
    {
      view: 'overview',
      label: 'Overview',
      icon: <LayoutGrid />,
    },
    {
      view: 'pos',
      label: 'Point of Sale',
      icon: <ShoppingCart />,
    },
    {
      view: 'products',
      label: 'Products',
      icon: <Package />,
    },
    {
      view: 'customers',
      label: 'Customers',
      icon: <Users />,
    },
    {
      view: 'transactions',
      label: 'Transactions',
      icon: <History />,
    },
    {
      view: 'pending-orders',
      label: 'Pending Orders',
      icon: <ClipboardList />,
    },
  ];

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
            <SidebarMenuButton tooltip="Settings">
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Log Out">
              <LogOut />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
