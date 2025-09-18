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
import { db } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';
import * as React from 'react';
import { Loader } from 'lucide-react';
import { UserRole } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) =>
  (currentYear - 18 - i).toString()
);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString().padStart(2, '0'),
  label: new Date(0, i).toLocaleString('id-ID', { month: 'long' }),
}));
const days = Array.from({ length: 31 }, (_, i) =>
  (i + 1).toString().padStart(2, '0')
);

const FormSchema = z
  .object({
    name: z.string().min(2, {
      message: 'Name must be at least 2 characters.',
    }),
    phone: z.string().min(10, {
      message: 'Phone number must be at least 10 digits.',
    }),
    birthDay: z.string({ required_error: 'Tanggal lahir harus diisi.' }),
    birthMonth: z.string({ required_error: 'Bulan lahir harus diisi.' }),
    birthYear: z.string({ required_error: 'Tahun lahir harus diisi.' }),
  })
  .superRefine((data, ctx) => {
    const { birthYear, birthMonth, birthDay } = data;
    if (!birthYear || !birthMonth || !birthDay) {
        // Let required_error messages handle this
        return;
    }
    
    const year = parseInt(birthYear, 10);
    const month = parseInt(birthMonth, 10);
    const day = parseInt(birthDay, 10);

    const d = new Date(year, month - 1, day);
    if (
      d.getFullYear() !== year ||
      d.getMonth() !== month - 1 ||
      d.getDate() !== day
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tanggal tidak valid.',
        path: ['birthDay'],
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day
    const birthDate = new Date(year, month - 1, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 21) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pelanggan harus berusia minimal 21 tahun.',
        path: ['birthYear'],
      });
    }
  });

type AddCustomerFormProps = {
  setDialogOpen: (open: boolean) => void;
  onCustomerAdded?: () => void;
  userRole: UserRole; 
};

export function AddCustomerForm({ setDialogOpen, onCustomerAdded, userRole }: AddCustomerFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
      phone: '',
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);
    const birthDate = `${data.birthYear}-${data.birthMonth}-${data.birthDay}`;
    const avatarUrl = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl;


    try {
        await addDoc(collection(db, "customers"), {
            name: data.name,
            phone: data.phone,
            birthDate: birthDate,
            joinDate: new Date().toISOString(),
            loyaltyPoints: 0,
            memberTier: 'Squab',
            avatarUrl: avatarUrl,
        });

        toast({
            title: 'Member Berhasil Didaftarkan!',
            description: `${data.name} sekarang menjadi bagian dari komunitas.`,
        });

        onCustomerAdded?.();
        setDialogOpen(false);

    } catch (error) {
        console.error("Error adding customer:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Mendaftarkan Member',
            description: 'Terjadi kesalahan saat menyimpan data. Silakan coba lagi.',
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
                <Input placeholder="Budi Santoso" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number (for Member ID)</FormLabel>
              <FormControl>
                <Input placeholder="081234567890" type="tel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-2">
          <FormLabel>Date of Birth</FormLabel>
          <div className="grid grid-cols-3 gap-2">
            <FormField
              control={form.control}
              name="birthDay"
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Tgl" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {days.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="birthMonth"
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Bulan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="birthYear"
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Tahun" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
          <FormMessage>
            {form.formState.errors.birthDay?.message ||
              form.formState.errors.birthMonth?.message ||
              form.formState.errors.birthYear?.message}
          </FormMessage>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          Register Member
        </Button>
      </form>
    </Form>
  );
}
