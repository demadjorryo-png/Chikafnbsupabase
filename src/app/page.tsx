'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

function VapeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24"
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
          <VapeIcon className="h-20 w-20 text-primary animate-pulse-slow" />
          <h1 className="font-headline text-5xl tracking-widest text-foreground">
            KASIR POS CHIKA
          </h1>
          <p className="text-lg text-muted-foreground">
            Aplikasi Kasir POS Chika
          </p>
      </div>
    </div>
  );
}
