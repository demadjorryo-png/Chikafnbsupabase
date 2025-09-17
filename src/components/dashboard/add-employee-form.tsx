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
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      userId: '',
      name: '',
      password: '',
    },
  });

  // NOTE: This is a client-side implementation for demonstration.
  // In a production app, this should be a secure server-side action.
  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
        // This is a simplified example. In a real-world scenario, you'd use a backend
        // function (like a Firebase Cloud Function) to create users to avoid
        // exposing sensitive logic on the client.
        const email = `${data.userId}@bekupon.com`;
        
        // Temporarily sign out to create a new user, then sign back in.
        // This is a workaround for demo purposes. A backend function is the correct approach.
        const currentUser = auth.currentUser;

        const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
        const newUser = userCredential.user;

        // Add employee data to Firestore
        await setDoc(doc(db, "users", newUser.uid), {
            name: data.name,
            role: data.role,
            storeId: data.storeId
        });
        
        // After creating the user, sign out the new user and log the admin back in.
        if (currentUser) {
            await auth.updateCurrentUser(currentUser);
        } else {
             await auth.signOut();
        }


        toast({
            title: 'Employee Added!',
            description: `${data.name} has been added with User ID ${data.userId}.`,
        });
        setDialogOpen(false);
        // This is a simple way to refresh data on the page.
        window.location.reload();

    } catch (error: any) {
        console.error("Error creating employee:", error);
        toast({
            variant: "destructive",
            title: 'Registration Failed',
            description: error.message || 'Could not create employee. The User ID might already be in use.',
        });
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
              <FormControl>
                <Input placeholder="••••••••" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Add Employee
        </Button>
      </form>
    </Form>
  );
}
