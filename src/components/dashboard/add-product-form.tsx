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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { productCategories } from '@/lib/types';
import type { UserRole } from '@/lib/types';
import * as React from 'react';
import { Loader, ScanBarcode } from 'lucide-react';
import { BarcodeScanner } from './barcode-scanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { db } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { stores } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const FormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  category: z.enum(productCategories),
  barcode: z.string().optional(),
  price: z.coerce.number().min(0, "Harga harus diisi"),
  costPrice: z.coerce.number().min(0).optional(),
  brand: z.string().min(2, {
    message: 'Brand must be at least 2 characters.',
  }),
});

type AddProductFormProps = {
  setDialogOpen: (open: boolean) => void;
  userRole: UserRole;
  onProductAdded: () => void;
};

export function AddProductForm({ setDialogOpen, userRole, onProductAdded }: AddProductFormProps) {
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
      barcode: '',
      price: 0,
      costPrice: 0,
      brand: '',
    },
  });

  const handleBarcodeScanned = (barcode: string) => {
    form.setValue('barcode', barcode);
    toast({
      title: 'Barcode Scanned!',
      description: `SKU ${barcode} has been filled.`,
    });
    setIsScannerOpen(false);
  };

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);

    // If the user is a cashier, set the cost price to be the same as the selling price.
    const costPrice = userRole === 'cashier' ? data.price : data.costPrice;

    // Create a default stock object with 0 stock for all stores
    const stock = stores.reduce((acc, store) => {
        acc[store.id] = 0;
        return acc;
    }, {} as Record<string, number>);

    // Find a random placeholder image
    const placeholderImage = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];


    try {
        await addDoc(collection(db, "products"), {
            name: data.name,
            category: data.category,
            barcode: data.barcode || '',
            price: data.price,
            costPrice: costPrice,
            brand: data.brand,
            stock: stock,
            supplierId: '', // Default to empty string
            imageUrl: placeholderImage.imageUrl,
            imageHint: placeholderImage.imageHint,
            attributes: { // Add default attributes based on category or keep them generic
                brand: data.brand,
            }
        });
        
        toast({
            title: 'Produk Berhasil Ditambahkan!',
            description: `${data.name} telah ditambahkan ke inventaris Anda.`,
        });

        onProductAdded(); // Callback to refresh the product list
        setDialogOpen(false);

    } catch (error) {
        console.error("Error adding product:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Menambahkan Produk',
            description: 'Terjadi kesalahan saat menyimpan produk. Silakan coba lagi.',
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Dark Luna Grape" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Emkay" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {productCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
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
          name="barcode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Barcode (SKU)</FormLabel>
                <div className="flex gap-2">
                    <FormControl>
                        <Input placeholder="e.g., 899..." {...field} />
                    </FormControl>
                    <Button variant="outline" size="icon" type="button" onClick={() => setIsScannerOpen(true)}>
                        <ScanBarcode className="h-4 w-4" />
                        <span className="sr-only">Scan Barcode</span>
                    </Button>
                </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {userRole === 'admin' && (
            <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Cost Price (Rp)</FormLabel>
                    <FormControl>
                    <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        )}
        
        <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Selling Price (Rp)</FormLabel>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          Add Product
        </Button>
      </form>
    </Form>
    
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline tracking-wider">Scan Barcode</DialogTitle>
            <DialogDescription>
              Point your camera at a product's barcode to capture the SKU.
            </DialogDescription>
          </DialogHeader>
          <BarcodeScanner onScan={handleBarcodeScanned} />
        </DialogContent>
      </Dialog>
    </>
  );
}
