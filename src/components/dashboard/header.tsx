'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ChevronRight, LogOut, Settings, UserCircle } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { users } from '@/lib/data';
import type { User } from '@/lib/types';

export function Header({
  title,
  storeName,
}: {
  title: string;
  storeName?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const storeId = searchParams.get('storeId');
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    if (userId) {
      const user = users.find((u) => u.id === userId);
      setCurrentUser(user || null);
    }
  }, [userId]);

  const handleLogout = () => {
    router.push('/login');
  };

  const navigate = (view: string) => {
    router.push(`/dashboard?view=${view}&storeId=${storeId}&userId=${userId}`);
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="lg:hidden" />
        <div className="flex items-center gap-2">
          <h1 className="font-headline text-2xl tracking-wide text-foreground sm:text-3xl">
            {title}
          </h1>
          {storeName && (
            <>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
              <span className="text-xl font-semibold text-muted-foreground">
                {storeName}
              </span>
            </>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <UserCircle className="h-6 w-6" />
            <span className="sr-only">User Menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {currentUser && (
            <>
              <DropdownMenuLabel>
                <div className="font-medium">{currentUser.name}</div>
                <div className="text-xs font-normal capitalize text-muted-foreground">
                  {currentUser.role}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => navigate('settings')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
