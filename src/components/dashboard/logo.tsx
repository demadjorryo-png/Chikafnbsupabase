import React from 'react';
import Image from 'next/image';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center">
        <Image 
            src="https://era5758.co.id/wp-content/uploads/2024/07/Remove-background-project-scaled.png" 
            alt="Bekupon Vapestore Logo" 
            width={120} 
            height={60} 
        />
      </div>
    </div>
  );
}
