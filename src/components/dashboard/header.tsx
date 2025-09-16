import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { UserCircle } from 'lucide-react';

export function Header({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="lg:hidden" />
        <h1 className="font-headline text-2xl tracking-wide text-foreground sm:text-3xl">
          {title}
        </h1>
      </div>
      <Button variant="ghost" size="icon" className="rounded-full">
        <UserCircle className="h-6 w-6" />
        <span className="sr-only">User Menu</span>
      </Button>
    </header>
  );
}
