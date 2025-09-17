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
import { signInWithEmailAndPassword, User as FirebaseAuthUser } from 'firebase/auth';
import { stores } from '@/lib/data'; // Import mock user and store data
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User } from '@/lib/types';


export default function LoginPage() {
  const [userId, setUserId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [storeId, setStoreId] = React.useState<string>(stores[0]?.id || '');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSuccessfulLogin = (userData: User) => {
    // After any successful login, redirect user to the dashboard
    
    // Check if the user is inactive
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

    // For cashiers, always direct them to their assigned store.
    // For admins, respect the store they selected on the login page.
    const targetStoreId = userData.role === 'admin' ? storeId : userData.storeId;
    router.push(`/dashboard?view=overview&storeId=${targetStoreId}&userId=${userData.id}`);
  };


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

    // Standard Firebase Auth login for all users including superadmin
    try {
      const email = `${userId}@era5758.co.id`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const firestoreId = userCredential.user.uid;
      
      let userData: User | null = null;
      
      // Special check if it's the mock superadmin ID
      if (userId === 'Pradana01') {
          const { users } = await import('@/lib/data');
          const mockAdmin = users.find(u => u.userId === 'Pradana01');
          if (mockAdmin) {
            // We use the mock admin data but fetched by Auth UID
             userData = { ...mockAdmin, id: firestoreId };
          }
      } else {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            userData = { id: userDoc.id, ...userDoc.data() } as User;
          }
      }


      if (!userData) {
        if (auth.currentUser) await auth.signOut();
        toast({
            variant: "destructive",
            title: "Login Gagal",
            description: "Data karyawan tidak ditemukan di database.",
        });
        setIsLoading(false);
        return;
      }
      
      handleSuccessfulLogin(userData);

    } catch (error: any) {
      let description = "Terjadi kesalahan. Silakan coba lagi.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        description = "Login Gagal: User ID atau Password yang Anda masukkan salah.";
      } else if (error.code === 'auth/operation-not-allowed') {
        description = "Metode login Email/Password belum diaktifkan di Firebase Console."
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
              Pilih STORE, lalu masukkan User ID dan password Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="store">Pilih Toko</Label>
                <Select value={storeId} onValueChange={setStoreId}>
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
                  placeholder="e.g., Bekupon...."
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
