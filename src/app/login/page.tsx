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
import { users } from '@/lib/data'; // Import mock user data

export default function LoginPage() {
  const [userId, setUserId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSuccessfulLogin = async (authUser: FirebaseAuthUser | (Omit<FirebaseAuthUser, 'uid'> & {uid: string, name?: string, storeId?: string})) => {
    // After any successful login, find the user doc in Firestore or mock
    const userEmail = authUser.email;
    if (!userEmail) {
        toast({
            variant: "destructive",
            title: "Login Gagal",
            description: "Email pengguna tidak ditemukan.",
        });
        return;
    }
    
    // Find in mock data first for superadmin
    const mockUser = users.find(u => u.email === userEmail);
    if(mockUser) {
         toast({
          title: 'Login Berhasil!',
          description: `Selamat datang kembali, ${mockUser.name}.`,
        });
        router.push(`/dashboard?view=overview&storeId=${mockUser.storeId}&userId=${mockUser.id}`);
        return;
    }
    
    // Then check firestore for other users
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", userEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      if (auth.currentUser) await auth.signOut();
      toast({
        variant: "destructive",
        title: "Login Gagal",
        description: "Data karyawan tidak ditemukan di database.",
      });
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = { id: userDoc.id, ...userDoc.data() };
    
    toast({
      title: 'Login Berhasil!',
      description: `Selamat datang kembali, ${userData.name}.`,
    });
    router.push(`/dashboard?view=overview&storeId=${userData.storeId}&userId=${userData.id}`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Superadmin check against mock data
    const superAdmin = users.find(u => u.userId === userId && u.role === 'admin');
    if (superAdmin && superAdmin.password === password) {
        await handleSuccessfulLogin({
            uid: superAdmin.id,
            email: superAdmin.email!,
            name: superAdmin.name,
            storeId: superAdmin.storeId
        });
        setIsLoading(false);
        return;
    }

    // Standard Firebase Auth login for other users
    try {
      const email = `${userId}@bekupon.com`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await handleSuccessfulLogin(userCredential.user);
    } catch (error: any) {
      let description = "Terjadi kesalahan. Silakan coba lagi.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
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
                  placeholder="e.g., Pradana01"
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
