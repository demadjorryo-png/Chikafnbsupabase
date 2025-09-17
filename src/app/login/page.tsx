'use client';

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
import { Logo } from '@/components/dashboard/logo';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { stores } from '@/lib/data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import * as React from 'react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [storeId, setStoreId] = React.useState(searchParams.get('storeId') || '');
  const [userId, setUserId] = React.useState('');
  const [password, setPassword] = React.useState('');

  async function handleLogin() {
    if (!storeId) {
        toast({
            variant: 'destructive',
            title: 'Toko Belum Dipilih',
            description: 'Silakan pilih toko terlebih dahulu.',
        });
        return;
    }
     if (!userId || !password) {
        toast({
            variant: 'destructive',
            title: 'Data Tidak Lengkap',
            description: 'Silakan masukkan User ID dan Password.',
        });
        return;
    }
    
    setIsLoading(true);
    try {
      // Behind the scenes, we construct an email from the User ID to use Firebase Auth.
      // The end-user never sees this.
      const email = `${userId}@bekupon.com`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      toast({
        title: 'Login Berhasil!',
        description: `Selamat datang kembali!`,
      });
      
      router.push(`/dashboard?storeId=${storeId}&userId=${user.uid}`);

    } catch (error: any) {
      console.error("Login failed:", error);
      let description = 'Terjadi kesalahan. Silakan coba lagi.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        description = 'User ID atau Password yang Anda masukkan salah.';
      }
      toast({
        variant: 'destructive',
        title: 'Login Gagal',
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="font-headline text-2xl tracking-wider">
            Employee Login
          </CardTitle>
          <CardDescription>
            Pilih toko dan masukkan kredensial Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="space-y-2">
              <Label>Toko</Label>
              <Select
                value={storeId}
                onValueChange={setStoreId}
              >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih toko Anda" />
                  </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input 
                    id="userId"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g., chika_kasir"
                    required 
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                    id="password" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                />
            </div>
            <Button onClick={handleLogin} className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Masuk'}
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
