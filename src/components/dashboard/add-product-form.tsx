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
import type { UserRole, Store } from '@/lib/types';
import * as React from 'react';
import { Loader, ScanBarcode } from 'lucide-react';
import { BarcodeScanner } from './barcode-scanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { db } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Separator } from '../ui/separator';

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
  // Stock is handled outside the form schema
});

type AddProductFormProps = {
  setDialogOpen: (open: boolean) => void;
  userRole: UserRole;
  onProductAdded: () => void;
  stores: Store[];
};

export function AddProductForm({ setDialogOpen, userRole, onProductAdded, stores }: AddProductFormProps) {
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [stockLevels, setStockLevels] = React.useState<Record<string, number>>({});

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

  const handleStockChange = (storeId: string, value: string) => {
    const numberValue = Number(value);
    setStockLevels(prev => ({
      ...prev,
      [storeId]: isNaN(numberValue) ? 0 : numberValue,
    }));
  };

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

    // If cashier is adding, cost price is same as selling price
    const costPrice = userRole === 'cashier' ? data.price : data.costPrice;

    // Create the stock object for Firestore, ensuring all stores are included
    const stockForFirestore = stores.reduce((acc, store) => {
        acc[store.id] = stockLevels[store.id] || 0;
        return acc;
    }, {} as Record<string, number>);

    const placeholderImage = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];


    try {
        await addDoc(collection(db, "products"), {
            name: data.name,
            category: data.category,
            barcode: data.barcode || '',
            price: data.price,
            costPrice: costPrice,
            stock: stockForFirestore,
            supplierId: '',
            imageUrl: placeholderImage.imageUrl,
            imageHint: placeholderImage.imageHint,
            attributes: { 
                brand: data.brand,
            }
        });
        
        toast({
            title: 'Produk Berhasil Ditambahkan!',
            description: `${data.name} telah ditambahkan ke inventaris Anda.`,
        });

        onProductAdded();
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

        <Separator />
        
        <div className="space-y-2">
            <Label>Initial Stock</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-md border p-4">
                {stores.map(store => (
                    <div key={store.id} className="grid gap-2">
                        <Label htmlFor={`stock-${store.id}`} className="text-sm">{store.name}</Label>
                        <Input
                            id={`stock-${store.id}`}
                            type="number"
                            placeholder="0"
                            onChange={(e) => handleStockChange(store.id, e.target.value)}
                            className="w-full"
                        />
                    </div>
                ))}
            </div>
        </div>

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
