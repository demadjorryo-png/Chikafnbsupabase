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
  Sparkles,
  Percent,
  ScanBarcode,
  ClipboardList,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoyaltyRecommendation } from '@/components/dashboard/loyalty-recommendation';
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
import { BarcodeScanner } from '@/components/dashboard/barcode-scanner';
import { useToast } from '@/hooks/use-toast';


export default function POS() {
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<
    Customer | undefined
  >(customers[0]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isMemberDialogOpen, setIsMemberDialogOpen] = React.useState(false);
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const { toast } = useToast();

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.productId === product.id
      );
      if (existingItem) {
        return prevCart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prevCart,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: product.price,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.productId !== productId)
    );
  };
  
  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
      toast({
        title: 'Product Added!',
        description: `${product.name} has been added to the cart.`,
      });
      setIsScannerOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Product Not Found',
        description: `No product found with barcode: ${barcode}`,
      });
    }
  };

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  
  const pointsEarned = Math.floor(cartTotal / 10000);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handlePendingOrder = () => {
    if (!selectedCustomer) {
       toast({
        variant: 'destructive',
        title: 'No Customer Selected',
        description: `Please select a customer to create a pending order.`,
      });
      return;
    }
    // In a real app, you would save this to a database.
    // For now, we just show a toast.
    toast({
      title: 'Pending Order Created',
      description: `A pending order has been created for ${selectedCustomer.name}.`,
    });
    setCart([]);
  }

  return (
    <>
    <div className="grid flex-1 items-start gap-4 lg:grid-cols-3 xl:grid-cols-5">
      <div className="lg:col-span-2 xl:col-span-3">
        <Card>
          <CardHeader className="border-b">
            <div className="relative flex items-center gap-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products by name..."
                className="w-full rounded-lg bg-secondary pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
               <Button variant="outline" size="icon" onClick={() => setIsScannerOpen(true)}>
                  <ScanBarcode className="h-4 w-4" />
                  <span className="sr-only">Scan Barcode</span>
                </Button>
            </div>
          </CardHeader>
          <ScrollArea className="h-[calc(100vh-220px)]">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="group cursor-pointer overflow-hidden"
                    onClick={() => addToCart(product)}
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
                       {product.stock === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <Badge variant="destructive" className="text-base">OUT OF STOCK</Badge>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary">
                          Rp {product.price.toLocaleString('id-ID')}
                        </Badge>
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
              Current Order
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
                    <DialogTitle className="font-headline tracking-wider">
                      Register New Member
                    </DialogTitle>
                    <DialogDescription>
                      Add a new customer to the Bekupon community. Age will be verified.
                    </DialogDescription>
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
                    <AvatarFallback>
                      {selectedCustomer.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{selectedCustomer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCustomer.phone}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 font-semibold text-primary">
                    <Crown className="h-4 w-4" />
                    <span>{selectedCustomer.memberTier}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.loyaltyPoints.toLocaleString('id-ID')} pts
                  </p>
                </div>
              </div>
            )}
            
            <Separator />
            
            <ScrollArea className="h-[250px] w-full">
              <div className="space-y-4 pr-4">
              {cart.length > 0 ? (
                cart.map((item) => (
                  <div key={item.productId} className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        Rp {item.price.toLocaleString('id-ID')}
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
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Your cart is empty.
                </div>
              )}
              </div>
            </ScrollArea>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rp {cartTotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1"><Percent className="h-3 w-3" /> Discount</span>
                <span>- Rp 0</span>
              </div>
               <div className="flex justify-between text-muted-foreground">
                 <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Points Earned</span>
                <span>+ {pointsEarned.toLocaleString('id-ID')} pts</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>Rp {cartTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>
            
            {selectedCustomer && cart.length > 0 && (
              <LoyaltyRecommendation customer={selectedCustomer} totalPurchaseAmount={cartTotal} />
            )}

            <div className="grid grid-cols-2 gap-2">
               <Button variant="outline" className="gap-1" onClick={handlePendingOrder}>
                  <ClipboardList className="h-4 w-4" />
                  Pending Order
                </Button>
                <Button size="lg" className="w-full font-headline text-lg tracking-wider col-span-1">Checkout</Button>
            </div>
             <div className="grid grid-cols-3 gap-2">
                <Button variant="secondary">Cash</Button>
                <Button variant="secondary">Card</Button>
                <Button variant="secondary">QRIS</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline tracking-wider">Scan Barcode</DialogTitle>
            <DialogDescription>
              Point your camera at a product's barcode to add it to the cart.
            </DialogDescription>
          </DialogHeader>
          <BarcodeScanner onScan={handleBarcodeScanned} />
        </DialogContent>
      </Dialog>
    </>
  );
}
