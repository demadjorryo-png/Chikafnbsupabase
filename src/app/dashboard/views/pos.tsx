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
import { products, customers, transactions, users, stores } from '@/lib/data';
import type { Product, Customer, CartItem, Transaction } from '@/lib/types';
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
  Printer,
  Plus,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoyaltyRecommendation } from '@/components/dashboard/loyalty-recommendation';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AddCustomerForm } from '@/components/dashboard/add-customer-form';
import { Combobox } from '@/components/ui/combobox';
import { BarcodeScanner } from '@/components/dashboard/barcode-scanner';
import { useToast } from '@/hooks/use-toast';
import { Receipt } from '@/components/dashboard/receipt';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSearchParams } from 'next/navigation';


function CheckoutReceiptDialog({ transaction, open, onOpenChange, onPrint }: { transaction: Transaction | null; open: boolean; onOpenChange: (open: boolean) => void, onPrint: () => void }) {
    if (!transaction) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="font-headline tracking-wider text-center">Checkout Successful</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Receipt transaction={transaction} />
                </div>
                <DialogFooter className="sm:justify-center">
                    <Button type="button" className="w-full gap-2" onClick={onPrint}>
                        <Printer className="h-4 w-4" />
                        Print Receipt
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function POS() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get('storeId') || stores[0].id;
  const userId = searchParams.get('userId');
  
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<
    Customer | undefined
  >(customers[0]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<'Cash' | 'Card' | 'QRIS'>('Cash');
  const [isMemberDialogOpen, setIsMemberDialogOpen] = React.useState(false);
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [lastTransaction, setLastTransaction] = React.useState<Transaction | null>(null);
  const [discountType, setDiscountType] = React.useState<'percent' | 'nominal'>('percent');
  const [discountValue, setDiscountValue] = React.useState(0);
  const { toast } = useToast();
  
  const currentStaff = users.find(u => u.id === userId)!;

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const addToCart = (product: Product) => {
    const stockInStore = product.stock[storeId] || 0;
    if (stockInStore === 0) {
      toast({
        variant: 'destructive',
        title: 'Out of Stock',
        description: `${product.name} is currently out of stock in this store.`,
      });
      return;
    }
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.productId === product.id
      );
      if (existingItem) {
        if (existingItem.quantity >= stockInStore) {
            toast({
                variant: 'destructive',
                title: 'Stock Limit Reached',
                description: `Only ${stockInStore} units of ${product.name} available.`,
            });
            return prevCart;
        }
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

    const product = products.find(p => p.id === productId);
    const stockInStore = product?.stock[storeId] || 0;
    if(product && quantity > stockInStore) {
        toast({
            variant: 'destructive',
            title: 'Stock Limit Reached',
            description: `Only ${stockInStore} units of ${product.name} available.`,
        });
        setCart((prevCart) =>
            prevCart.map((item) =>
                item.productId === productId ? { ...item, quantity: stockInStore } : item
            )
        );
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

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  
  const discountAmount = React.useMemo(() => {
    if (discountType === 'percent') {
      return (subtotal * discountValue) / 100;
    }
    return discountValue;
  }, [subtotal, discountType, discountValue]);

  const totalAmount = Math.max(0, subtotal - discountAmount);
  const pointsEarned = Math.floor(totalAmount / 10000);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Cart is Empty',
        description: 'Add products to the cart before checking out.',
      });
      return;
    }
    
    const newTransaction: Transaction = {
        id: `trx${String(transactions.length + 1).padStart(3, '0')}`,
        storeId: storeId,
        customerId: selectedCustomer?.id || 'N/A',
        customerName: selectedCustomer?.name || 'Guest',
        staffId: currentStaff.id,
        createdAt: new Date().toISOString(),
        subtotal: subtotal,
        discountAmount: discountAmount,
        totalAmount: totalAmount,
        paymentMethod: paymentMethod,
        pointsEarned: pointsEarned,
        items: cart,
    };

    // --- Coin System Simulation ---
    const transactionFee = Math.max(500, newTransaction.totalAmount * 0.005);
    toast({
        title: "Transaction Fee (Simulation)",
        description: `Biaya sebesar Rp ${transactionFee.toLocaleString('id-ID')} akan dipotong dari saldo koin toko.`
    })
    // In a real app, you would deduct this from the store's coinBalance in the database.
    // ----------------------------
    
    setLastTransaction(newTransaction);
    setCart([]);
    setDiscountValue(0);
  }

  const handlePrint = () => {
    // This will trigger the print dialog. CSS will handle hiding non-receipt elements.
    setTimeout(() => {
      window.print();
    }, 100);
  };


  return (
    <>
    <div className="grid flex-1 items-start gap-4 lg:grid-cols-3 xl:grid-cols-5 non-printable">
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
            <CardContent className="p-0">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center w-[120px]">Stock</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const stockInStore = product.stock[storeId] || 0;
                    const isOutOfStock = stockInStore === 0;
                    return (
                      <TableRow key={product.id} className={cn(isOutOfStock && "text-muted-foreground")}>
                        <TableCell>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground">{product.attributes.brand}</div>
                        </TableCell>
                        <TableCell className="text-right">Rp {product.price.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="text-center">
                           {isOutOfStock ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                           ) : (
                            stockInStore
                           )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => addToCart(product)}
                            disabled={isOutOfStock}
                            aria-label="Add to cart"
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
                  <AddCustomerForm setDialogOpen={setIsMemberDialogOpen} userRole={currentStaff.role} />
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
                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="grid gap-2">
                <Label htmlFor='discount' className="flex items-center gap-1 text-muted-foreground"><Percent className="h-3 w-3" /> Discount</Label>
                <div className="flex items-center gap-2">
                    <Input 
                        id="discount"
                        type="number"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        className="h-9"
                    />
                    <ToggleGroup 
                        type="single" 
                        variant="outline"
                        value={discountType}
                        onValueChange={(value) => {
                            if (value) setDiscountType(value as 'percent' | 'nominal');
                        }}
                    >
                        <ToggleGroupItem value="percent" aria-label="Toggle percent" className="h-9">
                            %
                        </ToggleGroupItem>
                        <ToggleGroupItem value="nominal" aria-label="Toggle nominal" className="h-9">
                            Rp
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span/>
                <span className="text-destructive">- Rp {discountAmount.toLocaleString('id-ID')}</span>
              </div>
               <div className="flex justify-between text-muted-foreground">
                 <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Points Earned</span>
                <span>+ {pointsEarned.toLocaleString('id-ID')} pts</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>Rp {totalAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>
            
            {selectedCustomer && cart.length > 0 && (
              <LoyaltyRecommendation customer={selectedCustomer} totalPurchaseAmount={totalAmount} />
            )}

            <div className="grid grid-cols-3 gap-2">
                <Button variant={paymentMethod === 'Cash' ? 'default' : 'secondary'} onClick={() => setPaymentMethod('Cash')}>Cash</Button>
                <Button variant={paymentMethod === 'Card' ? 'default' : 'secondary'} onClick={() => setPaymentMethod('Card')}>Card</Button>
                <Button variant={paymentMethod === 'QRIS' ? 'default' : 'secondary'} onClick={() => setPaymentMethod('QRIS')}>QRIS</Button>
            </div>
             <Button size="lg" className="w-full font-headline text-lg tracking-wider" onClick={handleCheckout}>Checkout</Button>
          </CardContent>
        </Card>
      </div>
    </div>

    <div className="printable-area">
        {lastTransaction && <Receipt transaction={lastTransaction} />}
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

      <CheckoutReceiptDialog
        transaction={lastTransaction}
        open={!!lastTransaction}
        onOpenChange={(open) => {
            if (!open) setLastTransaction(null);
        }}
        onPrint={handlePrint}
      />
    </>
  );
}
