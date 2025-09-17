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
import { ChevronRight } from 'lucide-react';


export function Header({
  title,
  storeName,
}: {
  title: string;
  storeName?: string;
}) {

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
    </header>
  );
}
