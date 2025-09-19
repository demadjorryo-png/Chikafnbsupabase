import React from 'react';
import { UtensilsCrossed } from 'lucide-react';


type LogoProps = {
    storeName?: string;
}

export function Logo({ storeName }: LogoProps) {
  return (
    <div className="flex items-center gap-2 text-primary">
      <div className="flex items-center justify-center rounded-md bg-primary/20 p-2">
        <UtensilsCrossed className="h-6 w-6" />
      </div>
      <div className="flex flex-col group-data-[collapsible=icon]:hidden">
        <span className="font-headline text-2xl leading-none tracking-wider text-sidebar-foreground">Chika POS F&B</span>
        {storeName && (
            <span className="text-xs font-medium text-sidebar-foreground/70">{storeName}</span>
        )}
      </div>
    </div>
  );
}
