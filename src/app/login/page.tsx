

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
import { useAuth } from '@/contexts/auth-context';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoginLoading, setIsLoginLoading] = React.useState(false);

  const [regName, setRegName] = React.useState('');
  const [regStoreName, setRegStoreName] = React.useState('');
  const [regEmail, setRegEmail] = React.useState('');
  const [regPassword, setRegPassword] = React.useState('');
  const [regWhatsapp, setRegWhatsapp] = React.useState('');
  const [isRegisterLoading, setIsRegisterLoading] = React.useState(false);
  
  const [isLoginView, setIsLoginView] = React.useState(true);
  
  const { toast } = useToast();
  const router = useRouter();
  const { login, register } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (error: any) {
      let description = "Terjadi kesalahan. Silakan coba lagi.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        description = "Login Gagal: Email atau Password yang Anda masukkan salah.";
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
      setIsLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegisterLoading(true);

    try {
      await register(regName, regStoreName, regEmail, regPassword, regWhatsapp);
      router.push('/dashboard');
    } catch (error: any) {
        let description = "Terjadi kesalahan. Silakan coba lagi.";
        if (error.code === 'auth/email-already-in-use') {
            description = "Email ini sudah terdaftar. Silakan gunakan email lain atau login.";
        } else if (error.code === 'auth/weak-password') {
            description = "Password terlalu lemah. Gunakan minimal 8 karakter.";
        }
        console.error("Registration Error:", error);
        toast({
            variant: 'destructive',
            title: 'Registrasi Gagal',
            description: description,
        });
    } finally {
      setIsRegisterLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        {isLoginView ? (
            <Card>
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-headline tracking-wider">SELAMAT DATANG</CardTitle>
                <CardDescription>
                Masukkan email dan password Anda untuk masuk.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                    id="email"
                    type="email"
                    placeholder='admin@tokosaya.com'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                <Button type="submit" className="w-full" disabled={isLoginLoading}>
                    {isLoginLoading && (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Masuk
                </Button>
                </form>
                 <Separator className="my-4" />
                <p className="text-center text-sm text-muted-foreground">
                    Belum punya akun?{' '}
                    <Button variant="link" className="p-0 h-auto" onClick={() => setIsLoginView(false)}>
                        Daftar di sini
                    </Button>
                </p>
            </CardContent>
            </Card>
        ) : (
            <Card>
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-headline tracking-wider">DAFTAR AKUN BARU</CardTitle>
                <CardDescription>
                Buat toko Anda sendiri dan mulai dalam hitungan menit.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleRegister} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="reg-name">Nama Lengkap Anda</Label>
                        <Input id="reg-name" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="reg-store-name">Nama Toko Anda</Label>
                        <Input id="reg-store-name" value={regStoreName} onChange={(e) => setRegStoreName(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="reg-email">Email</Label>
                            <Input id="reg-email" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="reg-whatsapp">Nomor WhatsApp</Label>
                            <Input id="reg-whatsapp" type="tel" value={regWhatsapp} onChange={(e) => setRegWhatsapp(e.target.value)} required />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="reg-password">Password</Label>
                        <Input id="reg-password" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
                    </div>
                <Button type="submit" className="w-full" disabled={isRegisterLoading}>
                    {isRegisterLoading && (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Daftar & Buat Toko
                </Button>
                </form>
                 <Separator className="my-4" />
                <p className="text-center text-sm text-muted-foreground">
                    Sudah punya akun?{' '}
                    <Button variant="link" className="p-0 h-auto" onClick={() => setIsLoginView(true)}>
                        Masuk di sini
                    </Button>
                </p>
            </CardContent>
            </Card>
        )}
      </div>
    </main>
  );
}
