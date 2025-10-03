
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
import { Form, FormField, FormItem, FormControl, FormMessage, FormLabel } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/dashboard/logo';
import { Loader, Sparkles, LogIn, Megaphone, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { ChikaChatDialog } from '@/components/dashboard/chika-chat-dialog';
import { getLoginPromoSettings, type LoginPromoSettings, defaultLoginPromoSettings } from '@/lib/login-promo-settings';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const loginSchema = z.object({
  userId: z.string().min(1, { message: 'User ID tidak boleh kosong.' }),
  password: z.string().min(1, { message: "Password tidak boleh kosong." }),
  storeId: z.string().optional(),
});

const forgotPasswordSchema = z.object({
    email: z.string().email({ message: "Format email tidak valid." }),
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoginLoading, setIsLoginLoading] = React.useState(false);
  const [isConsultDialogOpen, setIsConsultDialogOpen] = React.useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = React.useState(false);
  const [promoSettings, setPromoSettings] = React.useState<LoginPromoSettings>(defaultLoginPromoSettings);
  const [isPromoLoading, setIsPromoLoading] = React.useState(true);

  const { toast } = useToast();
  const router = useRouter();
  const { login, availableStores, isLoading: isAuthLoading } = useAuth();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      userId: '',
      password: '',
      storeId: '',
    },
  });

  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
        email: '',
    },
  });

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
  
  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setIsLoginLoading(true);
    try {
      await login(values.userId, values.password, values.storeId);
      router.push('/dashboard');
    } catch (error: any) {
        let errorMessage = "Terjadi kesalahan. Silakan coba lagi.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = "User ID atau password yang Anda masukkan salah.";
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = "Terlalu banyak percobaan login. Silakan coba lagi nanti.";
        } else if (error.message.includes('Silakan pilih toko')) {
            errorMessage = error.message;
        }
        toast({ variant: 'destructive', title: 'Login Gagal', description: errorMessage });
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleForgotPassword = async (values: z.infer<typeof forgotPasswordSchema>) => {
    try {
        const email = values.email.includes('@') ? values.email : `${values.email}@era5758.co.id`;
        await sendPasswordResetEmail(auth, email);
        toast({
            title: 'Email Terkirim!',
            description: 'Silakan periksa kotak masuk email Anda untuk instruksi reset password.',
        });
        setIsForgotPasswordOpen(false);
        forgotPasswordForm.reset();
    } catch (error: any) {
        let errorMessage = "Terjadi kesalahan. Silakan coba lagi.";
        if (error.code === 'auth/user-not-found') {
            errorMessage = "Email atau User ID yang Anda masukkan tidak terdaftar.";
        }
        toast({
            variant: 'destructive',
            title: 'Gagal Mengirim Email',
            description: errorMessage,
        });
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
              <CardDescription>Pilih toko, masukkan User ID dan password Anda.</CardDescription>
          </CardHeader>
          <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleLogin)} className="grid gap-4">
                    <FormField
                        control={form.control}
                        name="storeId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Toko</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger disabled={isAuthLoading}>
                                        <SelectValue placeholder={isAuthLoading ? "Memuat toko..." : "Pilih toko Anda"} />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="superadmin-no-store">(Login sebagai Superadmin)</SelectItem>
                                        {availableStores.map(store => (
                                            <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="userId"
                        render={({ field }) => (
                            <FormItem>
                                <Label htmlFor="userId">User ID</Label>
                                <FormControl>
                                    <Input id="userId" placeholder='Contoh: riopradana' {...field} />
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
           <CardFooter className="flex justify-center text-sm">
                <p>Belum punya akun? <Link href="/register" className="font-bold text-primary hover:underline">Daftar Sekarang</Link></p>
            </CardFooter>
        </Card>

        <Card className="text-center">
            <CardHeader>
                <CardTitle className="text-lg font-headline tracking-wider">BUTUH APLIKASI DENGAN BRANDING NAMA USAHA ANDA?</CardTitle>
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
    <ChikaChatDialog open={isConsultDialogOpen} onOpenChange={setIsConsultDialogOpen} mode="consultant" />

    <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Lupa Password</DialogTitle>
                <DialogDescription>
                    Masukkan User ID atau email Anda yang terdaftar. Kami akan mengirimkan link untuk mereset password Anda.
                </DialogDescription>
            </DialogHeader>
            <Form {...forgotPasswordForm}>
                <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="grid gap-4 py-4">
                    <FormField
                        control={forgotPasswordForm.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <Label htmlFor="forgot-email" className="sr-only">Email atau User ID</Label>
                                <FormControl>
                                    <Input id="forgot-email" placeholder="Email atau User ID Anda" {...field} />
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
