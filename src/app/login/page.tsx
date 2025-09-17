
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
import { auth, db, googleProvider } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword, signInWithPopup, User as FirebaseAuthUser } from 'firebase/auth';
import { Separator } from '@/components/ui/separator';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C43.021,36.223,44,30.551,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
        </svg>
    );
}

export default function LoginPage() {
  const [userId, setUserId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSuccessfulLogin = async (authUser: FirebaseAuthUser) => {
    // After any successful Firebase Auth login, find the user doc in Firestore
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", authUser.email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // If user is authenticated but not in our 'users' collection, they are not an employee.
      await auth.signOut(); // Sign them out from Firebase Auth
      toast({
        variant: "destructive",
        title: "Login Gagal",
        description: "Akun Anda tidak terdaftar sebagai karyawan.",
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

    try {
      const email = `${userId}@bekupon.com`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await handleSuccessfulLogin(userCredential.user);
    } catch (error: any) {
      let description = "Terjadi kesalahan. Silakan coba lagi.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
        description = "User ID atau Password yang Anda masukkan salah.";
      } else if (error.code === 'auth/operation-not-allowed') {
        description = "Metode login ini belum diaktifkan. Hubungi admin.";
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
  
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
        const result = await signInWithPopup(auth, googleProvider);
        await handleSuccessfulLogin(result.user);
    } catch (error: any) {
        console.error("Google Login Error:", error);
        toast({
            variant: "destructive",
            title: "Google Login Gagal",
            description: "Tidak dapat login dengan Google saat ini. Silakan coba lagi."
        });
    } finally {
        setIsGoogleLoading(false);
    }
  }

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
              <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                {isLoading && (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                )}
                Masuk
              </Button>
            </form>
            <div className="relative my-4">
              <Separator />
              <span className="absolute left-1/2 -translate-x-1/2 top-[-10px] bg-card px-2 text-xs text-muted-foreground">
                OR
              </span>
            </div>
             <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoading || isGoogleLoading}>
                {isGoogleLoading ? (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon className="mr-2 h-5 w-5"/>
                )}
                Masuk dengan Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
