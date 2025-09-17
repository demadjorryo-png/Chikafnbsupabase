'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import * as React from 'react';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [storeId, setStoreId] = React.useState(searchParams.get('storeId') || '');

  async function handleAnonymousLogin() {
    if (!storeId) {
        toast({
            variant: 'destructive',
            title: 'Toko Belum Dipilih',
            description: 'Silakan pilih toko terlebih dahulu.',
        });
        return;
    }
    
    setIsLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      toast({
        title: 'Login Berhasil!',
        description: 'Sesi anonim telah dibuat. Selamat datang.',
      });
      
      // For a real anonymous flow, you might redirect to a user/profile selection page.
      // For now, we'll simulate picking the first admin for demo purposes.
      // A more robust solution is needed for multi-user anonymous access.
      const defaultUserIdForDemo = 'admin001_uid'; // This needs to be a real UID from your Firestore 'users' collection
      router.push(`/dashboard?storeId=${storeId}&userId=${user.uid}`);

    } catch (error: any) {
      console.error("Anonymous login failed:", error);
      toast({
        variant: 'destructive',
        title: 'Login Gagal',
        description: 'Tidak dapat membuat sesi anonim. Silakan coba lagi.',
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
            Pilih toko Anda untuk memulai sesi kerja.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
            <Button onClick={handleAnonymousLogin} className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Masuk'}
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
