
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(`/login`);
    }, 2500); // Wait for 2.5 seconds before redirecting

    return () => clearTimeout(timer); // Clean up the timer
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
       <div className="flex flex-col items-center gap-4 text-center">
            <Image 
                src="/icon.svg" 
                alt="App Icon" 
                width={64} 
                height={64} 
                className="h-16 w-16 animate-pulse-slow"
            />
            <h1 className="font-headline text-3xl font-bold tracking-wider text-foreground">
                CHIKA F&B
            </h1>
      </div>
    </div>
  );
}
