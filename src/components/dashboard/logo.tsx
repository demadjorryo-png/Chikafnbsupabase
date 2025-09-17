import React from 'react';
import Image from 'next/image';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center">
        <Image 
            src="https://storage.googleapis.com/stedi-studio-outputs/439eba28-1b2c-473d-8d26-b8e727e4e899/bekupon-vapestore-logo.png" 
            alt="Bekupon Vapestore Logo" 
            width={120} 
            height={60} 
        />
      </div>
    </div>
  );
}
