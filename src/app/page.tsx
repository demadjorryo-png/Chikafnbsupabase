
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


export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page
    router.replace(`/login`);

  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
       <div className="flex flex-col items-center gap-4">
          <VapeIcon className="h-16 w-16 animate-pulse-slow text-primary/50" />
          <p className="font-headline text-xl tracking-wider text-muted-foreground">
              Redirecting to Login...
          </p>
      </div>
    </div>
  );
}
