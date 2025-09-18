
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
import { Loader, Sparkles, Send, MessageSquare, LogIn, Megaphone } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ChikaChatDialog } from '@/components/dashboard/chika-chat-dialog';


export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoginLoading, setIsLoginLoading] = React.useState(false);
  const [isConsultDialogOpen, setIsConsultDialogOpen] = React.useState(false);

  const { toast } = useToast();
  const router = useRouter();
  const { login } = useAuth();
  
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
        </Card>

        <Card className="text-center">
            <CardHeader>
                <CardTitle className="text-lg font-headline tracking-wider">BUTUH BANTUAN PROFESIONAL?</CardTitle>
                <CardDescription>Konsultasikan kebutuhan aplikasi Anda secara gratis dengan asisten AI kami.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 text-left text-sm">
                    <p className="font-headline tracking-wider text-primary flex items-center gap-2 mb-2"><Megaphone/> PROMO SPESIAL!</p>
                    <p>Dapatkan aplikasi kasir canggih seperti ini hanya <span className="font-bold">Rp 500/transaksi</span>, tanpa biaya langganan bulanan.</p>
                    <p className="mt-2">Biaya setup awal diskon 90%, hanya <span className="font-bold text-lg">Rp 150.000</span> (dari Rp 1.500.000).</p>
                    <p className="text-xs text-primary/80 mt-1">Penawaran terbatas!</p>
                </div>
                 <Button variant="outline" className="w-full" onClick={() => setIsConsultDialogOpen(true)}>
                    <Sparkles className="mr-2 h-4 w-4 text-primary" />
                    Mulai Konsultasi dengan Chika AI
                </Button>
            </CardContent>
        </Card>

      </div>
    </main>
    <ChikaChatDialog open={isConsultDialogOpen} onOpenChange={setIsConsultDialogOpen} />
    </>
  );
}
