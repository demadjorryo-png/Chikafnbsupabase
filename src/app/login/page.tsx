
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
import { Logo } from '@/components/dashboard/logo';
import { Loader } from 'lucide-react';
import { stores } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Store } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const [userId, setUserId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [storeId, setStoreId] = React.useState<string>(stores[0]?.id || '');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!storeId) {
      toast({
        variant: "destructive",
        title: "Toko Belum Dipilih",
        description: "Silakan pilih toko terlebih dahulu.",
      });
      setIsLoading(false);
      return;
    }

    // Admin now also logs in with a specific store context
    const role = userId.toLowerCase().includes('admin') ? 'admin' : 'cashier';

    try {
      const activeStore = stores.find(s => s.id === storeId);
      await login(userId, password, role, activeStore);
      
      router.push('/dashboard');

    } catch (error: any) {
      let description = "Terjadi kesalahan. Silakan coba lagi.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.message.includes("Invalid")) {
        description = "Login Gagal: User ID atau Password yang Anda masukkan salah.";
      } else {
        description = error.message;
      }
      console.error("Login Error:", error);
      toast({
        variant: 'destructive',
        title: 'Login Gagal',
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-headline tracking-wider">BEKUPON CREW LOGIN</CardTitle>
            <CardDescription>
              Pilih toko dan masukkan kredensial Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="grid gap-4">
               
              <div className="grid gap-2">
                <Label htmlFor="store">Pilih Toko</Label>
                <Select value={storeId} onValueChange={setStoreId} required>
                  <SelectTrigger id="store">
                    <SelectValue placeholder="Pilih toko..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map(store => (
                      <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  type="text"
                  placeholder='e.g., admin001 atau kasir_tpg'
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
