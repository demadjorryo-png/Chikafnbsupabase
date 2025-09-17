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
import { stores } from '@/lib/data';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import * as React from 'react';
import { Eye, EyeOff, Loader } from 'lucide-react';

const FormSchema = z.object({
    userId: z.string().min(4, {
        message: "User ID must be at least 4 characters."
    }).regex(/^[a-zA-Z0-9_]+$/, "User ID can only contain letters, numbers, and underscores."),
    name: z.string().min(2, {
      message: 'Name must be at least 2 characters.',
    }),
    role: z.enum(['admin', 'cashier'], {
        required_error: "Please select a role."
    }),
    storeId: z.string({ required_error: 'Please select a store.'}),
    password: z.string().min(8, {
      message: 'Password must be at least 8 characters.',
    }),
  });

type AddEmployeeFormProps = {
  setDialogOpen: (open: boolean) => void;
};

export function AddEmployeeForm({ setDialogOpen }: AddEmployeeFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      userId: '',
      name: '',
      password: '',
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
      setIsLoading(true);
      const email = `${data.userId}@era5758.co.id`;

      try {
        // Step 1: Create user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
        const user = userCredential.user;

        // Step 2: Save user details to Firestore
        // We use the UID from Auth as the document ID in Firestore for consistency
        await setDoc(doc(db, "users", user.uid), {
            name: data.name,
            userId: data.userId,
            role: data.role,
            storeId: data.storeId,
            email: email,
        });

        toast({
            title: 'Karyawan Berhasil Ditambahkan!',
            description: `Akun untuk ${data.name} telah berhasil dibuat.`,
        });
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
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Budi Perkasa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User ID (for login)</FormLabel>
              <FormControl>
                <Input placeholder="budi_p" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="cashier">Cashier</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="storeId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Primary Store</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a store" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {stores.map(store => (
                            <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                        ))}
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
          Add Employee
        </Button>
      </form>
    </Form>
  );
}
