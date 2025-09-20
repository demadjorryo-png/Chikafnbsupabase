import React from 'react';
import Image from 'next/image';


type LogoProps = {
    storeName?: string;
}

export function Logo({ storeName }: LogoProps) {
  return (
    <div className="flex items-center gap-2 text-primary">
      <div className="flex items-center justify-center rounded-md bg-primary/20 p-2">
        <Image src="/icon.svg" alt="Chika POS F&B Logo" width={24} height={24} />
      </div>
      <div className="flex flex-col group-data-[collapsible=icon]:hidden">
        <span className="font-headline text-xl leading-none tracking-wider text-sidebar-foreground">CHIKA POS F&B</span>
        {storeName && (
            <span className="text-xs font-medium text-sidebar-foreground/70">{storeName}</span>
        )}
      </div>
    </div>
  );
}
