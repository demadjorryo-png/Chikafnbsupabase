import React from 'react';

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

type LogoProps = {
    storeName?: string;
}

export function Logo({ storeName }: LogoProps) {
  return (
    <div className="flex items-center gap-2 text-primary">
      <div className="flex items-center justify-center rounded-md bg-primary/20 p-2">
        <VapeIcon className="h-6 w-6" />
      </div>
      <div className="flex flex-col group-data-[collapsible=icon]:hidden">
        <span className="font-headline text-2xl leading-none tracking-wider text-sidebar-foreground">Bekupon</span>
        {storeName && (
            <span className="text-xs font-medium text-sidebar-foreground/70">{storeName}</span>
        )}
      </div>
    </div>
  );
}
