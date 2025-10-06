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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/dashboard/logo';
import { Loader, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { doc, writeBatch } from 'firebase/firestore';
import { getTransactionFeeSettings } from '@/lib/app-settings';
import { FirebaseError } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getWhatsappSettings } from '@/lib/whatsapp-settings';


const registerSchema = z.object({
  storeName: z.string().min(3, { message: 'Nama toko minimal 3 karakter.' }),
  storeLocation: z.string().min(3, { message: 'Lokasi toko minimal 3 karakter.' }),
  adminName: z.string().min(2, { message: 'Nama Anda minimal 2 karakter.' }),
  email: z.string().email({ message: 'Format email tidak valid.' }),
  whatsapp: z.string().min(10, { message: 'Nomor WhatsApp minimal 10 digit.' }),
  password: z.string().min(6, { message: 'Password minimal 6 karakter.' }),
});

export default function RegisterPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      storeName: '',
      storeLocation: '',
      adminName: '',
      email: '',
      whatsapp: '',
      password: '',
    },
  });

  const handleRegister = async (values: z.infer<typeof registerSchema>) => {
    setIsLoading(true);
    let newUser = null;

    try {
      // Fetch app settings to get bonus tokens
      const feeSettings = await getTransactionFeeSettings();
      const bonusTokens = feeSettings.newStoreBonusTokens || 0;

      // Step 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      newUser = userCredential.user;
      const uid = newUser.uid;
      
      // Step 2: Create a batch write for Firestore operations
      const batch = writeBatch(db);
      const storeId = uid; // Using UID as store ID for simplicity

      // Create store document
      const storeRef = doc(db, 'stores', storeId);
      batch.set(storeRef, {
        name: values.storeName,
        location: values.storeLocation,
        pradanaTokenBalance: bonusTokens,
        adminUids: [uid],
        createdAt: new Date().toISOString(),
        transactionCounter: 0, // Initialize transaction counter
        firstTransactionDate: null, // Initialize first transaction date
      });

      // Create user document
      const userRef = doc(db, 'users', uid);
      batch.set(userRef, {
        name: values.adminName,
        email: values.email,
        whatsapp: values.whatsapp,
        role: 'admin',
        status: 'active',
        storeId: storeRef.id,
      });

      // Step 3: Commit the batch
      await batch.commit();

      // Step 4: Send welcome message via WhatsApp using a Cloud Function
      const welcomeMessage = 
`🎉 *Selamat Datang di Chika POS F&B, ${values.adminName}!* 🎉

Toko Anda telah berhasil dibuat dengan detail berikut:
- *Nama Toko:* ${values.storeName}
- *Nama Admin:* ${values.adminName}
- *Email Login:* ${values.email}

Sebagai bonus selamat datang, kami telah menambahkan *${bonusTokens} Pradana Token* ke akun Anda.

*PENTING:* Mohon jaga kerahasiaan password Anda dan jangan bagikan kepada siapapun.

Anda sekarang dapat login ke aplikasi untuk mulai mengelola bisnis Anda.

Salam hangat,
*Tim Chika POS F&B*`;

      const formattedPhone = values.whatsapp.startsWith('0') ? `62${values.whatsapp.substring(1)}` : values.whatsapp;
      
      const functions = getFunctions();
      const sendWhatsapp = httpsCallable(functions, 'sendWhatsapp');

      // Fire-and-forget sending to user
      sendWhatsapp({
          storeId: storeId,
          target: formattedPhone,
          message: welcomeMessage
      }).catch(err => console.error("Failed to send welcome WhatsApp to user:", err));
      
      // Also notify platform admin
      getWhatsappSettings(storeId).then(settings => {
          if (settings.adminGroup) {
              const adminMessage = `*PENDAFTARAN TOKO BARU*
Nama Toko: *${values.storeName}*
Admin: *${values.adminName}*
Email: ${values.email}
Lokasi: ${values.storeLocation}
            
Akun telah berhasil dibuat dan mendapatkan bonus *${bonusTokens} Token*.`;

              sendWhatsapp({
                  storeId: storeId,
                  target: settings.adminGroup,
                  message: adminMessage,
                  isGroup: true,
              }).catch(err => console.error("Failed to send notification to admin group:", err));
          }
      });


      toast({
        title: 'Pendaftaran Berhasil!',
        description: 'Toko dan akun admin Anda telah dibuat. Silakan login.',
      });
      router.push('/login');

    } catch (error) {
      // Cleanup: If user was created but Firestore failed, delete the user
      if (newUser) {
        await deleteUser(newUser).catch(deleteError => {
          console.error("Failed to clean up orphaned user:", deleteError);
        });
      }

      let errorMessage = 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.';
      if (error instanceof FirebaseError) {
          if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email ini sudah terdaftar. Silakan gunakan email lain atau login.';
          } else {
            errorMessage = `Error: ${error.code}`;
          }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error('Registration error:', error);
      toast({
        variant: 'destructive',
        title: 'Pendaftaran Gagal',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRegister)}>
              <CardHeader className="text-center">
                <CardTitle className="font-headline text-2xl tracking-wider">DAFTAR TOKO BARU</CardTitle>
                <CardDescription>
                  Lengkapi detail di bawah untuk membuat toko dan akun admin pertama Anda.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <FormField
                  control={form.control}
                  name="storeName"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Nama Toko</Label>
                      <FormControl>
                        <Input placeholder="Contoh: Kopi Chika" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="storeLocation"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Lokasi Toko</Label>
                      <FormControl>
                        <Input placeholder="Contoh: Jakarta" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <hr className="my-2"/>
                <FormField
                  control={form.control}
                  name="adminName"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Nama Lengkap Admin</Label>
                      <FormControl>
                        <Input placeholder="Nama Anda" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Email Admin (untuk login)</Label>
                      <FormControl>
                        <Input type="email" placeholder="email@anda.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Nomor WhatsApp</Label>
                      <FormControl>
                        <Input type="tel" placeholder="08123456xxxx" {...field} />
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
                      <Label>Password</Label>
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
              </CardContent>
              <CardFooter className="flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                  Daftarkan Toko Saya
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Sudah punya akun? <Link href="/login" className="font-semibold text-primary hover:underline">Masuk di sini</Link>
                </p>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </main>
  );
}
