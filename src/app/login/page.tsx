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
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            toast({
                variant: 'destructive',
                title: 'Login Gagal',
                description: 'User ID atau Password yang Anda masukkan salah.',
            });
            setIsLoading(false);
            return;
        }

        let userDoc;
        querySnapshot.forEach((doc) => {
            userDoc = { id: doc.id, ...doc.data() };
        });

        // This is an insecure password check as requested temporarily.
        if (userDoc && userDoc.password === password) {
             toast({
                title: 'Login Berhasil!',
                description: `Selamat datang kembali, ${userDoc.name}!`,
            });
            // Redirect to dashboard with the Firestore document ID (which should be the Auth UID in a real scenario)
            router.push(`/dashboard?storeId=${storeId}&userId=${userDoc.id}`);
        } else {
             toast({
                variant: 'destructive',
                title: 'Login Gagal',
                description: 'User ID atau Password yang Anda masukkan salah.',
            });
        }
    } catch (error) {
        console.error("Firestore Login Error:", error);
        toast({
            variant: 'destructive',
            title: 'Login Gagal',
            description: 'Terjadi kesalahan saat mencoba login.',
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
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
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
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
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
