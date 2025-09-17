import React from 'react';
import Image from 'next/image';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center">
        <Image 
            src="https://storage.googleapis.com/stedi-studio-outputs/e40b3c69-9407-4286-a51a-790175b2241b/bekupon-logo-black.png" 
            alt="Bekupon Vapestore Logo" 
            width={120} 
            height={60} 
        />
      </div>
    </div>
  );
}
