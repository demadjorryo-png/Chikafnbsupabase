import React from 'react';
import Image from 'next/image';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center">
        <Image 
            src="https://era5758.co.id/wp-content/uploads/2024/07/logo-bkpn-1-scaled.png" 
            alt="Bekupon Logo" 
            width={32} 
            height={32} 
            className="rounded-full"
        />
      </div>
      <span className="font-headline text-2xl tracking-wider text-foreground">
        BEKUPON
      </span>
    </div>
  );
}
