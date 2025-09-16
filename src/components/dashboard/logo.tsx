import React from 'react';
import { Bird } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bird className="h-5 w-5" />
      </div>
      <span className="font-headline text-2xl tracking-wider text-foreground">
        BEKUPON
      </span>
    </div>
  );
}
