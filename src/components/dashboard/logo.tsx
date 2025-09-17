import React from 'react';
import { Cloud } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2 text-primary">
      <div className="flex items-center justify-center rounded-md bg-primary/20 p-2">
        <Cloud className="h-6 w-6" />
      </div>
      <span className="font-headline text-2xl tracking-wider text-sidebar-foreground group-data-[collapsible=icon]:hidden">Bekupon</span>
    </div>
  );
}
