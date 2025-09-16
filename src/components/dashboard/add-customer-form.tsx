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

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) =>
  (currentYear - 18 - i).toString()
);
const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString().padStart(2, '0'),
    label: new Date(0, i).toLocaleString('id-ID', { month: 'long' })
}));
const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));


const FormSchema = z.object({
    name: z.string().min(2, {
      message: 'Name must be at least 2 characters.',
    }),
    phone: z.string().min(10, {
      message: 'Phone number must be at least 10 digits.',
    }),
    birthDay: z.string({ required_error: 'Tanggal lahir harus diisi.'}),
    birthMonth: z.string({ required_error: 'Bulan lahir harus diisi.'}),
    birthYear: z.string({ required_error: 'Tahun lahir harus diisi.'}),
  }).refine(data => {
      const { birthDay, birthMonth, birthYear } = data;
      const today = new Date();
      const birthDate = new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay));
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
      }
      return age >= 21;

  }, {
      message: 'Pelanggan harus berusia minimal 21 tahun.',
      path: ['birthYear'],
  });

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
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log({
      ...data,
      birthDate: `${data.birthYear}-${data.birthMonth}-${data.birthDay}`,
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
        <div className="grid grid-cols-3 gap-2">
            <FormField
                control={form.control}
                name="birthDay"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Tgl</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <FormMessage />
                </FormItem>
                )}
            />
          <FormField
            control={form.control}
            name="birthMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bulan</FormLabel>
                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Bulan" />
                      </Trigger>
                    </FormControl>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="birthYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tahun</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Tahun" />
                      </Trigger>
                    </FormControl>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full">
          Register Member
        </Button>
      </form>
    </Form>
  );
}
