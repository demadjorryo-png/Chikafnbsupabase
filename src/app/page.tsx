
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
       <div className="flex flex-col items-center gap-6 text-center">
            <svg
                width="180"
                height="180"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="animate-pulse-slow"
                >
                <rect width="64" height="64" rx="12" fill="#1E1E1E" />
                <path
                    d="M48.226 27.2023C48.0779 27.0542 47.8821 26.9746 47.6777 26.9836H41.4286V21.4111C41.4286 21.014 41.1059 20.6913 40.7088 20.6913C40.3117 20.6913 39.989 21.014 39.989 21.4111V26.9836H24.011V21.4111C24.011 21.014 23.6883 20.6913 23.2912 20.6913C22.8941 20.6913 22.5714 21.014 22.5714 21.4111V26.9836H16.3223C16.1179 26.9746 15.9221 27.0542 15.774 27.2023C15.6258 27.3505 15.5463 27.5463 15.5552 27.7507V36.2493C15.5463 36.4537 15.6258 36.6495 15.774 36.7977C15.9221 36.9458 16.1179 37.0254 16.3223 37.0164H22.5714V42.5889C22.5714 42.986 22.8941 43.3087 23.2912 43.3087C23.6883 43.3087 24.011 42.986 24.011 42.5889V37.0164H39.989V42.5889C39.989 42.986 40.3117 43.3087 40.7088 43.3087C41.1059 43.3087 41.4286 42.986 41.4286 42.5889V37.0164H47.6777C47.8821 37.0254 48.0779 36.9458 48.226 36.7977C48.3742 36.6495 48.4537 36.4537 48.4448 36.2493V27.7507C48.4537 27.5463 48.3742 27.3505 48.226 27.2023ZM32 34.1379C30.9391 34.1379 30.0714 33.2702 30.0714 32.2093C30.0714 31.1484 30.9391 30.2807 32 30.2807C33.0609 30.2807 33.9286 31.1484 33.9286 32.2093C33.9286 33.2702 33.0609 34.1379 32 34.1379Z"
                    fill="#FFBF00"
                />
            </svg>

          <h1 className="font-headline text-6xl font-bold tracking-wider text-foreground">
            Chika
          </h1>
      </div>
    </div>
  );
}
