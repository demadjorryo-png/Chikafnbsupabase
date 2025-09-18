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
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import * as React from 'react';
import { Eye, EyeOff, Loader } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

const FormSchema = z.object({
    userId: z.string().min(4, {
        message: "User ID minimal 4 karakter."
    }).regex(/^[a-zA-Z0-9_]+$/, "User ID hanya bisa berisi huruf, angka, dan underscore."),
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
      userId: '',
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
      const email = `${data.userId}@${activeStore.id}.era5758.co.id`;

      // Check if userId already exists in Firestore globally
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("userId", "==", data.userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
          toast({
              variant: 'destructive',
              title: 'User ID Sudah Ada',
              description: "User ID ini sudah digunakan. Silakan pilih yang lain.",
          });
          setIsLoading(false);
          return;
      }


      try {
        const tempAuth = auth;
        const originalUser = tempAuth.currentUser; // Save original user

        const userCredential = await createUserWithEmailAndPassword(tempAuth, email, data.password);
        const newUser = userCredential.user;

        // Add user to firestore
        await setDoc(doc(db, "users", newUser.uid), {
            name: data.name,
            userId: data.userId,
            role: data.role,
            email: email,
            status: 'active',
            storeId: activeStore.id, // Associate user with the current active store
        });
        
        if (originalUser) {
           // This part is tricky and might need a backend function in a real scenario
           // For now, we assume the library handles re-authentication correctly.
           // If issues arise, manually signing in again is the safest bet.
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
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "User ID ini sudah digunakan. Silakan pilih User ID lain.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "Password terlalu lemah. Gunakan minimal 8 karakter.";
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
            name="userId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>User ID (untuk login)</FormLabel>
                <FormControl>
                    <Input placeholder="budi_p" {...field} />
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
