
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/dashboard/logo';
import { Loader, Sparkles, LogIn, Megaphone, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { AppConsultantChatDialog } from '@/components/dashboard/app-consultant-chat-dialog';
// Hapus import { getLoginPromoSettings, type LoginPromoSettings, defaultLoginPromoSettings } from '@/lib/login-promo-settings';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface LoginPromoSettings {
  title: string;
  line1: string;
  line2: string;
  line3: string;
  footnote: string;
}

const loginSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid.' }),
  password: z.string().min(1, { message: "Password tidak boleh kosong." }),
});

const forgotPasswordSchema = z.object({
    email: z.string().email({ message: "Format email tidak valid." }),
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoginLoading, setIsLoginLoading] = React.useState(false);
  const [isConsultDialogOpen, setIsConsultDialogOpen] = React.useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = React.useState(false);
  const [promoSettings] = React.useState<LoginPromoSettings>({
    title: "PROMO SPESIAL!",
    line1: "Dapatkan aplikasi kasir canggih seperti ini hanya Rp 500/transaksi, tanpa biaya langganan bulanan.",
    line2: "Biaya setup awal diskon 50%, hanya Rp 750.000 (dari Rp 1.500.000).",
    line3: "",
    footnote: "Penawaran terbatas!"
  });
  // Hapus const [isPromoLoading, setIsPromoLoading] = React.useState(true);

  const { toast } = useToast();
  const router = useRouter();
  const { login } = useAuth();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
        email: '',
    },
  });

  // Hapus React.useEffect(() => {
  //   async function fetchPromo() {
  //       try {
  //           const settings = await getLoginPromoSettings();
  //           setPromoSettings(settings);
  //       } catch (error) {
  //           console.error("Failed to load promo settings, using defaults.");
  //       } finally {
  //           setIsPromoLoading(false);
  //       }
  //   }
  //   fetchPromo();
  // }, []);
  
  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setIsLoginLoading(true);
    try {
      await login(values.email, values.password);
      router.push('/dashboard');
    } catch (error: any) {
      const errorMessage = error?.message || 'Terjadi kesalahan. Silakan coba lagi.'
      toast({ variant: 'destructive', title: 'Login Gagal', description: errorMessage });
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleForgotPassword = async (values: z.infer<typeof forgotPasswordSchema>) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email)
      if (error) throw error
      toast({
        title: 'Email Terkirim!',
        description: 'Silakan periksa email Anda untuk instruksi reset password.',
      })
      setIsForgotPasswordOpen(false)
      forgotPasswordForm.reset()
    } catch (error: any) {
      const errorMessage = error?.message || 'Gagal mengirim email reset password.'
      toast({ variant: 'destructive', title: 'Gagal Mengirim Email', description: errorMessage })
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
              <CardDescription>Masukkan email dan password Anda.</CardDescription>
          </CardHeader>
          <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleLogin)} className="grid gap-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <Label htmlFor="email">Email</Label>
                                <FormControl>
                                    <Input id="email" type="email" placeholder='admin@tokosaya.com' {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <button type="button" onClick={() => setIsForgotPasswordOpen(true)} className="text-xs text-primary hover:underline focus:outline-none">
                                        Lupa Password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <FormControl>
                                        <Input id="password" type={showPassword ? 'text' : 'password'} {...field} />
                                    </FormControl>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full gap-2" disabled={isLoginLoading}>
                        {isLoginLoading ? <Loader className="animate-spin" /> : <LogIn />}
                        Masuk
                    </Button>
                </form>
              </Form>
          </CardContent>
           <CardFooter className="text-center text-sm flex-col gap-2">
                <p>Belum punya akun? <Link href="/register" className="font-semibold text-primary hover:underline">Daftar Toko Baru</Link></p>
            </CardFooter>
        </Card>

        <Card className="text-center">
            <CardHeader>
                <CardTitle className="text-lg font-headline tracking-wider">BUTUH APLIKASI DENGAN BRANDING NAMA USAHA ANDA?</CardTitle>
                <CardDescription>Konsultasikan kebutuhan aplikasi Anda secara gratis dengan asisten AI kami.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 text-left text-sm">
                    {/* Hapus kondisional isPromoLoading, tampilkan langsung promoSettings */}
                    <>
                        <p className="font-headline tracking-wider text-primary flex items-center gap-2 mb-2"><Megaphone/> {promoSettings.title}</p>
                        {promoSettings.line1 && <p>{promoSettings.line1}</p>}
                        {promoSettings.line2 && <p className="mt-2">{promoSettings.line2}</p>}
                        {promoSettings.line3 && <p className="mt-2">{promoSettings.line3}</p>}
                        {promoSettings.footnote && <p className="text-xs text-primary/80 mt-1">{promoSettings.footnote}</p>}
                    </>
                </div>
                 <Button variant="outline" className="w-full" onClick={() => setIsConsultDialogOpen(true)}>
                    <Sparkles className="mr-2 h-4 w-4 text-primary" />
                    Konsultasi Pembuatan Aplikasi
                </Button>
            </CardContent>
        </Card>

      </div>
    </main>
    <AppConsultantChatDialog open={isConsultDialogOpen} onOpenChange={setIsConsultDialogOpen} />

    <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Lupa Password</DialogTitle>
                <DialogDescription>
                    Masukkan email Anda yang terdaftar. Kami akan mengirimkan link untuk mereset password Anda.
                </DialogDescription>
            </DialogHeader>
            <Form {...forgotPasswordForm}>
                <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="grid gap-4 py-4">
                    <FormField
                        control={forgotPasswordForm.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <Label htmlFor="forgot-email" className="sr-only">Email</Label>
                                <FormControl>
                                    <Input id="forgot-email" placeholder="Email Anda" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <Button type="submit" disabled={forgotPasswordForm.formState.isSubmitting}>
                            {forgotPasswordForm.formState.isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Kirim
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
    </>
  );
}
