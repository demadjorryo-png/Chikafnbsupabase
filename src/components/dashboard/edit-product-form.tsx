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
import type { UserRole, Store, Product } from '@/lib/types';
import * as React from 'react';
import { Loader, ScanBarcode } from 'lucide-react';
import { BarcodeScanner } from './barcode-scanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const FormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  category: z.enum(productCategories),
  barcode: z.string().optional(),
  price: z.coerce.number().min(0, "Price is required"),
  costPrice: z.coerce.number().min(0).optional(),
  brand: z.string().min(2, { message: 'Brand must be at least 2 characters.' }),
});

type FormValues = z.infer<typeof FormSchema>;

type EditProductFormProps = {
  setDialogOpen: (open: boolean) => void;
  userRole: UserRole;
  onProductUpdated: () => void;
  activeStore: Store;
  product: Product;
};

export function EditProductForm({ setDialogOpen, userRole, onProductUpdated, activeStore, product }: EditProductFormProps) {
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: product.name,
      barcode: product.attributes.barcode,
      price: product.price,
      costPrice: product.costPrice,
      brand: product.attributes.brand,
      category: product.category,
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

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    const productCollectionName = `products_${activeStore.id.replace('store_', '')}`;
    const productRef = doc(db, productCollectionName, product.id);

    try {
        await updateDoc(productRef, {
            name: data.name,
            category: data.category,
            price: data.price,
            costPrice: userRole === 'admin' ? data.costPrice : product.costPrice,
            'attributes.brand': data.brand,
            'attributes.barcode': data.barcode || '',
        });
        
        toast({
            title: 'Produk Berhasil Diperbarui!',
            description: `${data.name} telah diperbarui.`,
        });

        onProductUpdated();
        setDialogOpen(false);

    } catch (error) {
        console.error("Error updating product:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Memperbarui Produk',
            description: 'Terjadi kesalahan saat menyimpan perubahan. Silakan coba lagi.',
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <>
    <div className="max-h-[80vh] overflow-y-auto pr-6 pl-2 -mr-6 -ml-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Produk</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Kopi Susu" {...field} />
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
                <FormLabel>Merek</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Chika Coffee" {...field} />
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
                <FormLabel>Kategori</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Kategori" />
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
                      <FormLabel>Harga Pokok (Rp)</FormLabel>
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
                  <FormLabel>Harga Jual (Rp)</FormLabel>
                  <FormControl>
                      <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
          />
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Perubahan
          </Button>
        </form>
      </Form>
    </div>
    
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline tracking-wider">Scan Barcode</DialogTitle>
            <DialogDescription>
              Arahkan kamera ke barcode produk untuk mengambil SKU.
            </DialogDescription>
          </DialogHeader>
          <BarcodeScanner onScan={handleBarcodeScanned} />
        </DialogContent>
      </Dialog>
    </>
  );
}
