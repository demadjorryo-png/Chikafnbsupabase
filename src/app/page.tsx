
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { UtensilsCrossed } from 'lucide-react';

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
            <UtensilsCrossed className="h-20 w-20 animate-pulse-slow text-primary" />
            <h1 className="font-headline text-3xl font-bold tracking-wider text-foreground">
                CHIKA POS F&amp;B
            </h1>
      </div>
    </div>
  );
}
