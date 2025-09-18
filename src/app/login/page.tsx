
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/dashboard/logo';
import { Loader, Sparkles, LogIn, Megaphone } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { ChikaChatDialog } from '@/components/dashboard/chika-chat-dialog';
import { getLoginPromoSettings, type LoginPromoSettings, defaultLoginPromoSettings } from '@/lib/login-promo-settings';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';


export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoginLoading, setIsLoginLoading] = React.useState(false);
  const [isConsultDialogOpen, setIsConsultDialogOpen] = React.useState(false);
  const [promoSettings, setPromoSettings] = React.useState<LoginPromoSettings>(defaultLoginPromoSettings);
  const [isPromoLoading, setIsPromoLoading] = React.useState(true);

  const { toast } = useToast();
  const router = useRouter();
  const { login } = useAuth();

  React.useEffect(() => {
    async function fetchPromo() {
        try {
            const settings = await getLoginPromoSettings();
            setPromoSettings(settings);
        } catch (error) {
            console.error("Failed to load promo settings, using defaults.");
        } finally {
            setIsPromoLoading(false);
        }
    }
    fetchPromo();
  }, []);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Login Gagal', description: error.message });
    } finally {
      setIsLoginLoading(false);
    }
  };

  return (
    <>
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader className="text-center">
              <CardTitle className="text-2xl font-headline tracking-wider">SELAMAT DATANG</CardTitle>
              <CardDescription>Masukkan email dan password Anda untuk masuk.</CardDescription>
          </CardHeader>
          <CardContent>
              <form onSubmit={handleLogin} className="grid gap-4">
              <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder='admin@tokosaya.com' value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoginLoading}>
                  {isLoginLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                  Masuk
              </Button>
              </form>
          </CardContent>
           <CardFooter className="flex justify-center text-sm">
                <p>Belum punya akun? <Link href="/register" className="font-bold text-primary hover:underline">Daftar Sekarang</Link></p>
            </CardFooter>
        </Card>

        <Card className="text-center">
            <CardHeader>
                <CardTitle className="text-lg font-headline tracking-wider">BUTUH APLIKASI UNTUK BISNIS ANDA?</CardTitle>
                <CardDescription>Konsultasikan kebutuhan aplikasi Anda secara gratis dengan asisten AI kami.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 text-left text-sm">
                    {isPromoLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-1/3" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                        </div>
                    ) : (
                        <>
                            <p className="font-headline tracking-wider text-primary flex items-center gap-2 mb-2"><Megaphone/> {promoSettings.title}</p>
                            {promoSettings.line1 && <p>{promoSettings.line1}</p>}
                            {promoSettings.line2 && <p className="mt-2">{promoSettings.line2}</p>}
                            {promoSettings.line3 && <p className="mt-2">{promoSettings.line3}</p>}
                            {promoSettings.footnote && <p className="text-xs text-primary/80 mt-1">{promoSettings.footnote}</p>}
                        </>
                    )}
                </div>
                 <Button variant="outline" className="w-full" onClick={() => setIsConsultDialogOpen(true)}>
                    <Sparkles className="mr-2 h-4 w-4 text-primary" />
                    Konsultasi Pembuatan Aplikasi
                </Button>
            </CardContent>
        </Card>

      </div>
    </main>
    <ChikaChatDialog open={isConsultDialogOpen} onOpenChange={setIsConsultDialogOpen} />
    </>
  );
}
