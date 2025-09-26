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
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getFunctions, httpsCallable } from 'firebase/functions';
import * as React from 'react';
import { Eye, EyeOff, Loader } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const FormSchema = z.object({
    email: z.string().email({
        message: "Format email tidak valid."
    }),
    name: z.string().min(2, {
      message: 'Nama minimal 2 karakter.',
    }),
    role: z.enum(['admin', 'cashier'], {
        required_error: "Silakan pilih peran."
    }),
    password: z.string().min(8, {
      message: 'Password minimal 8 karakter.',
    }),
  });

type AddEmployeeFormProps = {
  setDialogOpen: (open: boolean) => void;
  onEmployeeAdded: () => void;
};

export function AddEmployeeForm({ setDialogOpen, onEmployeeAdded }: AddEmployeeFormProps) {
  const { activeStore } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: '',
      name: '',
      password: '',
      role: 'cashier',
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
      if (!activeStore) {
          toast({ variant: 'destructive', title: 'Toko Tidak Aktif', description: 'Tidak ada toko aktif yang dipilih.'});
          return;
      }
      setIsLoading(true);
      
      try {
        const functions = getFunctions();
        const createEmployee = httpsCallable(functions, 'createEmployee');
        
        const result: any = await createEmployee({
            email: data.email,
            password: data.password,
            name: data.name,
            role: data.role,
            storeId: activeStore.id,
        });

        if (result.data.error) {
            throw new Error(result.data.error);
        }

        toast({
            title: 'Karyawan Berhasil Ditambahkan!',
            description: `Akun untuk ${data.name} telah berhasil dibuat.`,
        });
        
        onEmployeeAdded();
        setDialogOpen(false);

      } catch (error: any) {
        console.error("Error adding employee:", error);
        let errorMessage = "Gagal menambahkan karyawan. Silakan coba lagi.";
        if (error.message.includes('already-exists')) {
            errorMessage = "Email ini sudah digunakan. Silakan pilih email lain.";
        } else if (error.message.includes('permission-denied')) {
            errorMessage = "Anda tidak memiliki izin untuk melakukan tindakan ini.";
        }
        
        toast({
            variant: 'destructive',
            title: 'Terjadi Kesalahan',
            description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Lengkap</FormLabel>
              <FormControl>
                <Input placeholder="Budi Perkasa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Email (untuk login)</FormLabel>
                <FormControl>
                    <Input placeholder="budi@tokosaya.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Peran</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih peran" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="cashier">Kasir</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input placeholder="••••••••" type={showPassword ? 'text' : 'password'} {...field} />
                </FormControl>
                <Button 
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                >
                    {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          Tambah Karyawan
        </Button>
      </form>
    </Form>
  );
}
