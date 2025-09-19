'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
          <UtensilsCrossed className="h-20 w-20 text-primary animate-pulse-slow" />
          <h1 className="font-headline text-5xl tracking-widest text-foreground">
            KASIR POS CHIKA
          </h1>
          <p className="text-lg text-muted-foreground">
            Aplikasi Kasir untuk Restoran, Kafe, dan Bisnis Kuliner
          </p>
      </div>
    </div>
  );
}
