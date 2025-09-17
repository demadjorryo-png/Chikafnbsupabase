
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';
import type { Product, Store } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, runTransaction } from 'firebase/firestore';
import { Loader, Save } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

type StockAdjustmentCardProps = {
  products: Product[];
  stores: Store[];
  onStockUpdated: () => void;
  isLoading: boolean;
};

export function StockAdjustmentCard({ products, stores, onStockUpdated, isLoading: isDataLoading }: StockAdjustmentCardProps) {
  const [selectedProductId, setSelectedProductId] = React.useState<string | undefined>();
  const [adjustments, setAdjustments] = React.useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { toast } = useToast();

  const selectedProduct = React.useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [selectedProductId, products]);

  const productOptions = React.useMemo(() => {
    return products.map(p => ({ value: p.id, label: p.name }));
  }, [products]);

  const handleAdjustmentChange = (storeId: string, value: string) => {
    setAdjustments(prev => ({
      ...prev,
      [storeId]: value,
    }));
  };

  const resetState = () => {
    setSelectedProductId(undefined);
    setAdjustments({});
  };

  const handleSaveStock = async () => {
    if (!selectedProduct) {
      toast({ variant: 'destructive', title: 'No product selected.' });
      return;
    }

    const hasAdjustments = Object.values(adjustments).some(val => val && Number(val) !== 0);
    if (!hasAdjustments) {
      toast({ title: 'No changes to save.' });
      return;
    }

    setIsProcessing(true);
    
    try {
      const productRef = doc(db, 'products', selectedProduct.id);
      await runTransaction(db, async (transaction) => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) {
          throw new Error("Product not found in database.");
        }

        const currentStock = productDoc.data().stock as Record<string, number>;
        const newStock: Record<string, number> = {...currentStock};

        for (const storeId in adjustments) {
            const adjustmentValue = adjustments[storeId];
            const adjustment = Number(adjustmentValue);

            if (adjustmentValue && !isNaN(adjustment) && adjustment !== 0) {
              const current = newStock[storeId] || 0;
              const finalStock = current + adjustment;
              
              if (finalStock < 0) {
                  const storeName = stores.find(s => s.id === storeId)?.name || storeId;
                  throw new Error(`Adjustment for ${storeName} results in negative stock.`);
              }
              newStock[storeId] = finalStock;
            }
        }

        transaction.update(productRef, { stock: newStock });
      });

      toast({
        title: 'Stock Updated!',
        description: `Stock for ${selectedProduct.name} has been successfully adjusted.`,
      });

      onStockUpdated();
      resetState();

    } catch (error) {
      console.error("Error updating stock:", error);
      toast({
        variant: 'destructive',
        title: 'Failed to Update Stock',
        description: String(error),
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  React.useEffect(() => {
    setAdjustments({});
  }, [selectedProductId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline tracking-wider">Stock Adjustment</CardTitle>
        <CardDescription>Select a product to quickly add or remove stock from specific stores.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isDataLoading ? (
            <Skeleton className="h-10 w-full" />
        ) : (
            <Combobox
                options={productOptions}
                value={selectedProductId}
                onValueChange={setSelectedProductId}
                placeholder="Select a product to adjust..."
                searchPlaceholder="Search product..."
                notFoundText="No product found."
            />
        )}
        
        {selectedProduct && (
          <>
            <Separator />
            <div className="space-y-4">
              <Label className="font-semibold">Adjust Stock for: {selectedProduct.name}</Label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {stores.map(store => (
                  <div key={store.id} className="space-y-2">
                    <Label htmlFor={`adjust-${store.id}`}>{store.name}</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm">
                        <span>Current: {selectedProduct.stock[store.id] || 0}</span>
                      </div>
                      <Input
                        id={`adjust-${store.id}`}
                        type="number"
                        placeholder="+/-"
                        value={adjustments[store.id] || ''}
                        onChange={(e) => handleAdjustmentChange(store.id, e.target.value)}
                        className="w-24 text-center"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
      {selectedProduct && (
        <CardFooter>
            <Button onClick={handleSaveStock} disabled={isProcessing}>
                {isProcessing ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Stock Changes
            </Button>
        </CardFooter>
      )}
    </Card>
  );
}
