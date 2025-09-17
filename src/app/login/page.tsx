
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { users } from '@/lib/data';
import { Logo } from '@/components/dashboard/logo';
import { Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [userId, setUserId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // MOCK LOGIN (temporary)
    const user = users.find(u => u.userId === userId && u.password === password);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (user) {
        toast({
            title: 'Login Berhasil!',
            description: `Selamat datang kembali, ${user.name}.`,
        });
        // Redirect to dashboard with user and default store info
        router.push(`/dashboard?view=overview&storeId=${user.storeId}&userId=${user.id}`);
    } else {
        toast({
            variant: 'destructive',
            title: 'Login Gagal',
            description: 'User ID atau Password yang Anda masukkan salah.',
        });
    }

    setIsLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
            <Logo />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-headline tracking-wider">Login</CardTitle>
            <CardDescription>
              Masukkan User ID dan Password Anda untuk masuk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  type="text"
                  placeholder="e.g., kasir001"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                )}
                Masuk
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
