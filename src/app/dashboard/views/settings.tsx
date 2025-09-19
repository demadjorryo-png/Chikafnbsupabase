

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
import { auth } from '@/lib/firebase';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { Loader, KeyRound, UserCircle, Building, Eye, EyeOff, Save, Play } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getReceiptSettings, updateReceiptSettings } from '@/lib/receipt-settings';
import type { ReceiptSettings } from '@/lib/types';
import { convertTextToSpeech } from '@/ai/flows/text-to-speech';


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
  
const availableGenders = [
    { value: 'female', label: 'Suara Wanita' },
    { value: 'male', label: 'Suara Pria' },
];

function ProfileCardSkeleton() {
    return (
        <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle className="font-headline tracking-wider">Profil Anda</CardTitle>
                <CardDescription>Informasi akun Anda yang sedang login.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-[80px]" />
                        <Skeleton className="h-5 w-[150px]" />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-[50px]" />
                        <Skeleton className="h-5 w-[80px]" />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-[60px]" />
                        <Skeleton className="h-5 w-[120px]" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default function Settings() {
  const { currentUser, activeStore, isLoading: isAuthLoading } = useAuth();
  const [isPasswordChangeLoading, setIsPasswordChangeLoading] = React.useState(false);
  const [isVoiceSettingLoading, setIsVoiceSettingLoading] = React.useState(false);
  const [isSamplePlaying, setIsSamplePlaying] = React.useState(false);
  const [voiceSettings, setVoiceSettings] = React.useState<Pick<ReceiptSettings, 'voiceGender'> | null>(null);
  
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const { toast } = useToast();
  
  React.useEffect(() => {
    if (activeStore) {
        getReceiptSettings(activeStore.id).then(settings => {
            setVoiceSettings({ voiceGender: settings.voiceGender });
        });
    }
  }, [activeStore]);

  const passwordForm = useForm<z.infer<typeof PasswordFormSchema>>({
    resolver: zodResolver(PasswordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handlePasswordChange = async (
    values: z.infer<typeof PasswordFormSchema>
  ) => {
    setIsPasswordChangeLoading(true);
    const user = auth.currentUser;

    if (!user || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Tidak ada pengguna yang login. Silakan login ulang.',
      });
      setIsPasswordChangeLoading(false);
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
      passwordForm.reset();
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
      setIsPasswordChangeLoading(false);
    }
  };
  
  const handleVoiceSettingSave = async () => {
    if (!activeStore || !voiceSettings) return;
    setIsVoiceSettingLoading(true);
    try {
        await updateReceiptSettings(activeStore.id, { voiceGender: voiceSettings.voiceGender });
        toast({ title: 'Pengaturan Suara Disimpan!' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
    } finally {
        setIsVoiceSettingLoading(false);
    }
  };
  
  const handlePlaySample = async () => {
    if (!voiceSettings?.voiceGender) return;
    setIsSamplePlaying(true);
    try {
        const { audioDataUri } = await convertTextToSpeech({
            text: "Ini adalah contoh suara saya. Terima kasih.",
            gender: voiceSettings.voiceGender,
        });
        const audio = new Audio(audioDataUri);
        audio.play();
    } catch (error) {
        console.error("Error playing voice sample:", error);
        toast({ variant: 'destructive', title: 'Gagal Memutar Suara', description: 'Tidak dapat menghasilkan sampel suara saat ini.' });
    } finally {
        setIsSamplePlaying(false);
    }
  };
  
  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
      {isAuthLoading ? (
        <ProfileCardSkeleton />
      ) : (
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
                    <p className="font-semibold">{activeStore?.name || (currentUser?.role === 'admin' ? 'Global' : '-')}</p>
                </div>
            </div>
            </CardContent>
        </Card>
      )}

      <div className="lg:col-span-2 grid gap-6">
        {currentUser?.role === 'admin' && (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline tracking-wider">Pengaturan Suara Panggilan</CardTitle>
                    <CardDescription>Pilih gender suara yang akan digunakan untuk memanggil pelanggan saat pesanan siap.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="max-w-md space-y-2">
                        <Label>Gender Suara</Label>
                        {voiceSettings ? (
                            <div className="flex items-center gap-2">
                                 <Select
                                    value={voiceSettings.voiceGender}
                                    onValueChange={(value: 'male' | 'female') => setVoiceSettings({ voiceGender: value })}
                                 >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih gender..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableGenders.map(gender => (
                                            <SelectItem key={gender.value} value={gender.value}>
                                                {gender.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handlePlaySample}
                                    disabled={isSamplePlaying}
                                    aria-label="Play voice sample"
                                >
                                    {isSamplePlaying ? <Loader className="h-4 w-4 animate-spin"/> : <Play className="h-4 w-4" />}
                                </Button>
                            </div>
                        ) : <Skeleton className="h-10 w-full" />}
                       
                    </div>
                     <Button onClick={handleVoiceSettingSave} disabled={isVoiceSettingLoading}>
                        {isVoiceSettingLoading && <Loader className="mr-2 h-4 w-4 animate-spin"/>}
                        <Save className="mr-2 h-4 w-4" />
                        Simpan Suara
                    </Button>
                </CardContent>
            </Card>
        )}
        <Card>
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
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(handlePasswordChange)}
                className="space-y-6 max-w-md"
              >
                <FormField
                  control={passwordForm.control}
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
                              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
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
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
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
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isPasswordChangeLoading}>
                  {isPasswordChangeLoading && (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Simpan Password Baru
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    
```