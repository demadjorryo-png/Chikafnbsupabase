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
import type { User } from '@/lib/types';
import * as React from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader } from 'lucide-react';

const FormSchema = z.object({
    name: z.string().min(2, {
      message: 'Name must be at least 2 characters.',
    }),
    role: z.enum(['admin', 'cashier'], {
        required_error: "Please select a role."
    }),
    storeId: z.string({ required_error: 'Please select a store.'}),
  });

type EditEmployeeFormProps = {
  setDialogOpen: (open: boolean) => void;
  employee: User;
  onEmployeeUpdated: () => void;
};

export function EditEmployeeForm({ setDialogOpen, employee, onEmployeeUpdated }: EditEmployeeFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: employee.name,
      role: employee.role,
      storeId: employee.storeId,
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);
    const userDocRef = doc(db, 'users', employee.id);

    try {
        await updateDoc(userDocRef, {
            name: data.name,
            role: data.role,
            storeId: data.storeId,
        });
        
        toast({
        title: 'Karyawan Diperbarui!',
        description: `Data untuk ${data.name} telah berhasil diperbarui.`,
        });

        onEmployeeUpdated();
        setDialogOpen(false);
    } catch (error) {
        console.error("Error updating employee:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Memperbarui',
            description: 'Terjadi kesalahan saat menyimpan perubahan. Silakan coba lagi.'
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
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
