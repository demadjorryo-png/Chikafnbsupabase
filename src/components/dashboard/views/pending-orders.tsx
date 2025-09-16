'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { products, customers } from '@/lib/data';
import type { Product, Customer, CartItem } from '@/lib/types';
import Image from 'next/image';
import {
  Search,
  PlusCircle,
  MinusCircle,
  XCircle,
  UserPlus,
  Crown,
  ClipboardList,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AddCustomerForm } from '@/components/dashboard/add-customer-form';
import { Combobox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';

export default function PendingOrders() {
  const [pendingList, setPendingList] = React.useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<
    Customer | undefined
  >(customers[0]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [manualItemName, setManualItemName] = React.useState('');
  const [isMemberDialogOpen, setIsMemberDialogOpen] = React.useState(false);
  const { toast } = useToast();

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
  }));
  
  // Filter for products that are out of stock
  const outOfStockProducts = products.filter((product) =>
    product.stock === 0 && product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToPendingList = (product: Product) => {
    setPendingList((prevList) => {
      const existingItem = prevList.find(
        (item) => item.productId === product.id
      );
      if (existingItem) {
        return prevList.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prevList,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: product.price, // Price might not be relevant but good to have
        },
      ];
    });
  };

  const handleAddManualItem = () => {
    if (!manualItemName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nama Item Kosong',
        description: 'Silakan masukkan nama produk yang ingin ditambahkan.',
      });
      return;
    }
    const manualProductId = `manual-${Date.now()}`;
    const newItem: CartItem = {
      productId: manualProductId,
      productName: manualItemName.trim(),
      quantity: 1,
      price: 0, // Price is 0 for items not in inventory
    };
    setPendingList((prevList) => [...prevList, newItem]);
    setManualItemName(''); // Clear input after adding
    toast({
      title: 'Item Manual Ditambahkan',
      description: `${newItem.productName} telah ditambahkan ke daftar tunggu.`,
    });
  };


  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromPendingList(productId);
      return;
    }
    setPendingList((prevList) =>
      prevList.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromPendingList = (productId: string) => {
    setPendingList((prevList) =>
      prevList.filter((item) => item.productId !== productId)
    );
  };

  const handleCreatePendingOrder = () => {
    if (pendingList.length === 0) {
      toast({
        variant: 'destructive',
        title: 'List is Empty',
        description: 'Add products to the list before creating a pending order.',
      });
      return;
    }
    if (!selectedCustomer) {
      toast({
        variant: 'destructive',
        title: 'No Customer Selected',
        description: 'Please select a customer to create a pending order.',
      });
      return;
    }
    
    // In a real app, you would save this to a database.
    // For now, we just show a toast and clear the list.
    toast({
      title: 'Pending Order Created!',
      description: `A pending order for ${pendingList.length} item(s) has been created for ${selectedCustomer.name}.`,
    });
    setPendingList([]);
  };

  return (
    <div className="grid flex-1 items-start gap-4 lg:grid-cols-3 xl:grid-cols-5">
      <div className="lg:col-span-2 xl:col-span-3">
        <Card>
          <CardHeader className="border-b">
             <CardTitle className="font-headline tracking-wider">Out of Stock & Manual Products</CardTitle>
             <CardDescription>Select out-of-stock items or add new unlisted items to a pending order.</CardDescription>
            <div className="relative flex items-center gap-2 pt-2">
              <Search className="absolute left-2.5 top-4 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search out-of-stock products..."
                className="w-full rounded-lg bg-secondary pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Input
                placeholder="Add manual item (e.g., 'Liquid FOO BAR v2')"
                value={manualItemName}
                onChange={(e) => setManualItemName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddManualItem()}
              />
              <Button onClick={handleAddManualItem} className="gap-1 whitespace-nowrap">
                <Plus className="h-4 w-4" />
                <span>Add Manual</span>
              </Button>
            </div>
          </CardHeader>
          <ScrollArea className="h-[calc(100vh-320px)]">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {outOfStockProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="group cursor-pointer overflow-hidden"
                    onClick={() => addToPendingList(product)}
                  >
                    <div className="relative">
                      <Image
                        alt={product.name}
                        className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                        height={200}
                        src={product.imageUrl}
                        width={200}
                        data-ai-hint={product.imageHint}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <Badge variant="destructive" className="text-base">OUT OF STOCK</Badge>
                      </div>
                    </div>
                    <CardFooter className="flex-col items-start p-2">
                      <p className="text-sm font-medium leading-tight">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.attributes.brand}
                      </p>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
          </ScrollArea>
        </Card>
      </div>
      <div className="xl:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline tracking-wider">
              Pending Order List
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Combobox
                options={customerOptions}
                value={selectedCustomer?.id}
                onValueChange={(value) => {
                  setSelectedCustomer(customers.find((c) => c.id === value));
                }}
                placeholder="Search customer..."
                searchPlaceholder="Search by name..."
                notFoundText="No customer found."
              />
              <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="font-headline tracking-wider">Register New Member</DialogTitle>
                    <DialogDescription>Add a new customer to the Bekupon community.</DialogDescription>
                  </DialogHeader>
                  <AddCustomerForm setDialogOpen={setIsMemberDialogOpen} />
                </DialogContent>
              </Dialog>
            </div>

            {selectedCustomer && (
              <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedCustomer.avatarUrl} />
                    <AvatarFallback>{selectedCustomer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{selectedCustomer.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 font-semibold text-primary">
                    <Crown className="h-4 w-4" />
                    <span>{selectedCustomer.memberTier}</span>
                  </div>
                </div>
              </div>
            )}
            
            <Separator />
            
            <ScrollArea className="h-[300px] w-full">
              <div className="space-y-4 pr-4">
              {pendingList.length > 0 ? (
                pendingList.map((item) => (
                  <div key={item.productId} className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        Requested Quantity
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                      >
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                      <span className="w-4 text-center">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive/80 hover:text-destructive"
                        onClick={() => removeFromPendingList(item.productId)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No products in the pending list.
                </div>
              )}
              </div>
            </ScrollArea>
            <Separator />
            <Button size="lg" className="w-full gap-2 font-headline text-lg tracking-wider" onClick={handleCreatePendingOrder}>
                <ClipboardList className="h-5 w-5" />
                Create Pending Order
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    