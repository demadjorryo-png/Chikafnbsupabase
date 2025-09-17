'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { stores } from '@/lib/data';
import type { User } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { auth, db } from '@/lib/firebase';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { Loader, KeyRound, UserCircle, Building, Eye, EyeOff } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';

const PasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini harus diisi.'),
    newPassword: z
      .string()
      .min(8, 'Password baru harus minimal 8 karakter.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Password baru tidak cocok.',
    path: ['confirmPassword'],
  });

export default function Settings() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof PasswordFormSchema>>({
    resolver: zodResolver(PasswordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  React.useEffect(() => {
    async function fetchUser() {
        if (userId) {
          const userQuery = query(collection(db, "users"), where("id", "==", userId));
          const userDocs = await getDocs(userQuery);
          if (!userDocs.empty) {
            // Since we're querying by a unique ID field you'd set, we expect one doc
            const userFromDb = { id: userDocs.docs[0].id, ...userDocs.docs[0].data() } as User;
            setCurrentUser(userFromDb);
          }
        }
    }
    fetchUser();
  }, [userId]);

  const store = React.useMemo(() => {
    if (currentUser?.storeId) {
      return stores.find((s) => s.id === currentUser.storeId);
    }
    return null;
  }, [currentUser]);

  const handlePasswordChange = async (
    values: z.infer<typeof PasswordFormSchema>
  ) => {
    setIsLoading(true);
    const user = auth.currentUser;

    if (!user || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Tidak ada pengguna yang login. Silakan login ulang.',
      });
      setIsLoading(false);
      return;
    }

    const credential = EmailAuthProvider.credential(
      user.email,
      values.currentPassword
    );

    try {
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, values.newPassword);
      toast({
        title: 'Berhasil!',
        description: 'Password Anda telah berhasil diubah.',
      });
      form.reset();
    } catch (error: any) {
      let description = 'Terjadi kesalahan. Silakan coba lagi.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'Password Anda saat ini salah.';
      }
      toast({
        variant: 'destructive',
        title: 'Gagal Mengubah Password',
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="font-headline tracking-wider">
            Profil Anda
          </CardTitle>
          <CardDescription>
            Informasi akun Anda yang sedang login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <UserCircle className="h-6 w-6 text-muted-foreground" />
            <div>
                <p className='text-sm text-muted-foreground'>Nama</p>
                <p className="font-semibold">{currentUser?.name}</p>
            </div>
          </div>
           <div className="flex items-center gap-3">
            <KeyRound className="h-6 w-6 text-muted-foreground" />
             <div>
                <p className='text-sm text-muted-foreground'>Jabatan</p>
                <p className="font-semibold capitalize">{currentUser?.role}</p>
            </div>
          </div>
           <div className="flex items-center gap-3">
            <Building className="h-6 w-6 text-muted-foreground" />
             <div>
                <p className='text-sm text-muted-foreground'>Toko Utama</p>
                <p className="font-semibold">{store?.name || 'Global'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-headline tracking-wider">
            Ubah Password
          </CardTitle>
          <CardDescription>
            Untuk keamanan, masukkan password Anda saat ini sebelum membuat
            yang baru.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handlePasswordChange)}
              className="space-y-6 max-w-md"
            >
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Saat Ini</FormLabel>
                    <div className="relative">
                        <FormControl>
                        <Input type={showCurrentPassword ? 'text' : 'password'} {...field} />
                        </FormControl>
                        <Button 
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                            {showCurrentPassword ? <EyeOff /> : <Eye />}
                        </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Baru</FormLabel>
                     <div className="relative">
                        <FormControl>
                        <Input type={showNewPassword ? 'text' : 'password'} {...field} />
                        </FormControl>
                        <Button 
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                            {showNewPassword ? <EyeOff /> : <Eye />}
                        </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konfirmasi Password Baru</FormLabel>
                    <div className="relative">
                        <FormControl>
                        <Input type={showConfirmPassword ? 'text' : 'password'} {...field} />
                        </FormControl>
                        <Button 
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? <EyeOff /> : <Eye />}
                        </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                )}
                Simpan Password Baru
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
