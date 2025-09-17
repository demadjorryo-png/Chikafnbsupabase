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
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { stores } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User } from '@/lib/types';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export default function LoginPage() {
  const [userId, setUserId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [storeId, setStoreId] = React.useState<string>(stores[0]?.id || '');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSuccessfulLogin = (userData: User, selectedStoreId?: string) => {
    if (userData.status === 'inactive') {
      toast({
        variant: 'destructive',
        title: "Akun Tidak Aktif",
        description: "Akun Anda saat ini nonaktif. Silakan hubungi admin.",
      });
      if (auth.currentUser) auth.signOut();
      return;
    }

    toast({
      title: 'Login Berhasil!',
      description: `Selamat datang kembali, ${userData.name}.`,
    });

    const params = new URLSearchParams();
    params.set('view', 'overview');
    params.set('userId', userData.id);

    // Hanya tambahkan storeId untuk kasir
    if (userData.role === 'cashier' && selectedStoreId) {
      params.set('storeId', selectedStoreId);
    }
      
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const isLoginAsCashier = storeId !== '';

    if (isLoginAsCashier && !storeId) {
      toast({
        variant: "destructive",
        title: "Toko Belum Dipilih",
        description: "Silakan pilih toko terlebih dahulu.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const email = `${userId}@era5758.co.id`;
      await signInWithEmailAndPassword(auth, email, password);
      
      const userQuery = query(collection(db, "users"), where("userId", "==", userId));
      const userDoc = await getDocs(userQuery);
      
      if (userDoc.empty) {
        throw new Error("User data not found in Firestore.");
      }

      const userData = { id: userDoc.docs[0].id, ...userDoc.docs[0].data() } as User;
      
      // Jika user adalah admin tapi mencoba login dengan memilih toko, block login
      if (userData.role === 'admin' && isLoginAsCashier) {
          toast({
              variant: 'destructive',
              title: 'Login Admin Salah',
              description: 'Admin harus login tanpa memilih toko. Hapus pilihan toko untuk melanjutkan.'
          });
          setIsLoading(false);
          auth.signOut();
          return;
      }
      
      // Jika user adalah kasir tapi mencoba login tanpa memilih toko, block login
      if (userData.role === 'cashier' && !isLoginAsCashier) {
           toast({
              variant: 'destructive',
              title: 'Login Kasir Salah',
              description: 'Kasir harus memilih toko untuk login.'
          });
          setIsLoading(false);
          auth.signOut();
          return;
      }
      
      handleSuccessfulLogin(userData, storeId);

    } catch (error: any) {
      let description = "Terjadi kesalahan. Silakan coba lagi.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.message.includes("Invalid")) {
        description = "Login Gagal: User ID atau Password yang Anda masukkan salah.";
      } else if (error.code === 'auth/operation-not-allowed') {
        description = "Metode login Email/Password belum diaktifkan di Firebase Console."
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
              Masukkan kredensial Anda untuk melanjutkan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="grid gap-4">
               
                <div className="grid gap-2">
                  <Label htmlFor="store">Pilih Toko (Kosongkan jika Anda Admin)</Label>
                  <Select value={storeId} onValueChange={setStoreId}>
                    <SelectTrigger id="store">
                      <SelectValue placeholder="Pilih toko..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Login Sebagai Admin</SelectItem>
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
                  placeholder='e.g., Bekupon...'
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
