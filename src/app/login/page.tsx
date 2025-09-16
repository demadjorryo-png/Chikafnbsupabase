
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/dashboard/logo';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { users } from '@/lib/data';


const FormSchema = z.object({
  userId: z.string().min(1, {
    message: 'User ID tidak boleh kosong.',
  }),
  password: z.string().min(1, {
    message: 'Password tidak boleh kosong.',
  }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      userId: '',
      password: '',
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    const user = users.find(u => u.id === data.userId && u.password === data.password);

    if (user) {
      toast({
        title: 'Login Berhasil!',
        description: `Selamat datang kembali, ${user.name}.`,
      });
      router.push('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: 'Login Gagal',
        description: 'User ID atau password salah. Silakan coba lagi.',
      });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    <Logo />
                </div>
                <CardTitle className="font-headline text-2xl tracking-wider">
                    Employee Login
                </CardTitle>
                <CardDescription>
                    Masukkan User ID dan password Anda untuk masuk.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                        control={form.control}
                        name="userId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>User ID</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., kasir001" {...field} />
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
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input placeholder="••••••••" type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="submit" className="w-full">
                        Login
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}
