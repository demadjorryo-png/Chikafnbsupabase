
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
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/dashboard/logo';
import { Loader, Eye, EyeOff, ScanBarcode } from 'lucide-react';
import Link from 'next/link';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarcodeScanner } from '@/components/dashboard/barcode-scanner';
import { getFunctions, httpsCallable } from 'firebase/functions';

const FormSchema = z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter.'),
    storeName: z.string().min(3, 'Nama toko minimal 3 karakter.'),
    email: z.string().email('Format email tidak valid.'),
    whatsapp: z.string().min(10, 'Nomor WhatsApp minimal 10 digit.'),
    password: z.string().min(6, 'Password minimal 6 karakter.'),
});

export default function RegisterPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
      storeName: '',
      email: '',
      whatsapp: '',
      password: '',
    },
  });

  const handlePhoneScanned = (scannedPhone: string) => {
    const cleanedPhone = scannedPhone.replace(/\D/g, ''); 
    form.setValue('whatsapp', cleanedPhone);
    toast({
      title: 'Nomor WhatsApp Terbaca!',
      description: `Nomor ${cleanedPhone} telah diisi.`,
    });
    setIsScannerOpen(false);
  };

  const handleRegister = async (values: z.infer<typeof FormSchema>) => {
    setIsLoading(true);
    try {
      const functions = getFunctions();
      const createUser = httpsCallable(functions, 'createUser');
      
      const result: any = await createUser({
        email: values.email,
        password: values.password,
        name: values.name,
        storeName: values.storeName,
        whatsapp: values.whatsapp, // Pass whatsapp number to the function
      });

      if (result.data.error) {
        throw new Error(result.data.error);
      }
      
      toast({
          title: 'Registrasi Berhasil!',
          description: `Selamat datang, ${values.name}! Toko Anda "${values.storeName}" telah dibuat. Silakan login.`,
      });

      router.push('/login');

    } catch (error: any) {
      console.error("Registration error:", error);
      let description = 'Terjadi kesalahan saat pendaftaran. Silakan coba lagi.';
      if (error.message.includes('already-exists')) {
        description = 'Email yang Anda masukkan sudah terdaftar. Silakan gunakan email lain.';
      }
      toast({ variant: 'destructive', title: 'Pendaftaran Gagal', description: description });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader className="text-center">
              <CardTitle className="text-2xl font-headline tracking-wider">DAFTAR AKUN BARU</CardTitle>
              <CardDescription>Buat akun admin dan bisnis F&B pertama Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleRegister)} className="grid gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Lengkap Anda</FormLabel>
                      <FormControl><Input placeholder="Budi Santoso" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="storeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Kafe/Restoran Anda</FormLabel>
                      <FormControl><Input placeholder="Kafe Chika" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (untuk login)</FormLabel>
                      <FormControl><Input type="email" placeholder="admin@kafechika.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. WhatsApp</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                            <Input type="tel" placeholder="08123456789" {...field} />
                        </FormControl>
                        <Button variant="outline" size="icon" type="button" onClick={() => setIsScannerOpen(true)}>
                            <ScanBarcode className="h-4 w-4" />
                            <span className="sr-only">Scan QR Code</span>
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                     <FormItem>
                      <FormLabel>Password</FormLabel>
                       <div className="relative">
                          <FormControl>
                          <Input type={showPassword ? 'text' : 'password'} {...field} />
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
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    Daftar & Buat Bisnis
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center text-sm">
            <p>Sudah punya akun? <Link href="/login" className="font-bold text-primary hover:underline">Masuk di sini</Link></p>
          </CardFooter>
        </Card>
      </div>
    </main>

    <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline tracking-wider">Scan Nomor WhatsApp</DialogTitle>
            <DialogDescription>
              Arahkan kamera ke QR code yang berisi nomor telepon.
            </DialogDescription>
          </DialogHeader>
          <BarcodeScanner onScan={handlePhoneScanned} />
        </DialogContent>
      </Dialog>
    </>
  );
}
