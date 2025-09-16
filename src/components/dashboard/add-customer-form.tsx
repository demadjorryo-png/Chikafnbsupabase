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
import { differenceInYears, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const FormSchema = z
  .object({
    name: z.string().min(2, {
      message: 'Name must be at least 2 characters.',
    }),
    phone: z.string().min(10, {
      message: 'Phone number must be at least 10 digits.',
    }),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.'),
  })
  .refine(
    (data) => {
      const date = parseISO(data.birthDate);
      // Check if the parsed date is valid
      if (isNaN(date.getTime())) {
        return false;
      }
      const age = differenceInYears(new Date(), date);
      return age >= 21;
    },
    {
      message: 'Pelanggan harus berusia minimal 21 tahun.',
      path: ['birthDate'],
    }
  );

type AddCustomerFormProps = {
  setDialogOpen: (open: boolean) => void;
};

export function AddCustomerForm({ setDialogOpen }: AddCustomerFormProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
      phone: '',
      birthDate: '',
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log({
      ...data,
      birthDate: new Date(data.birthDate), // Convert string to Date object for submission
    });
    toast({
      title: 'Member Registered!',
      description: `${data.name} is now part of the Bekupon community.`,
    });
    setDialogOpen(false);
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
        <FormField
          control={form.control}
          name="birthDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of birth</FormLabel>
              <FormControl>
                <Input placeholder="YYYY-MM-DD" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Register Member
        </Button>
      </form>
    </Form>
  );
}
