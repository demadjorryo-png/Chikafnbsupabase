
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Product, Customer, CartItem, Transaction, Table } from '@/lib/types';
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
  Gift,
  Coins,
  Armchair,
  Bell,
} from 'lucide-react';
import {
  Table as ShadcnTable,
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
import { pointEarningSettings } from '@/lib/point-earning-settings';
import { supabase } from '@/lib/supabase'; // Mengganti Firebase dengan Supabase
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import type { TransactionFeeSettings } from '@/lib/app-settings';
import { useSearchParams, useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';

type POSProps = {
    products: Product[];
    customers: Customer[];
    tables: Table[];
    onDataChange: () => void;
    isLoading: boolean;
    feeSettings: TransactionFeeSettings;
    pradanaTokenBalance: number;
    onPrintRequest: (transaction: Transaction) => void;
};


export default function POS({ products, customers, tables, onDataChange, isLoading, feeSettings, pradanaTokenBalance, onPrintRequest }: POSProps) {
  const { currentUser, activeStore, refreshPradanaTokenBalance } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedTableId, setSelectedTableId] = React.useState(() => searchParams.get('tableId'));
  const [selectedTableName, setSelectedTableName] = React.useState(() => searchParams.get('tableName'));

  React.useEffect(() => {
    const currentView = searchParams.get('view');
    if (currentView !== 'pos' || !searchParams.has('tableId')) {
        if (selectedTableId) {
            setSelectedTableId(null);
            setSelectedTableName(null);
        }
    } else {
        const tableIdFromParams = searchParams.get('tableId');
        if (tableIdFromParams !== selectedTableId) {
            setSelectedTableId(tableIdFromParams);
            setSelectedTableName(searchParams.get('tableName'));
        }
    }
  }, [searchParams, selectedTableId]);


  const [isProcessingCheckout, setIsProcessingCheckout] = React.useState(false);
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | undefined>(undefined);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<'Cash' | 'Card' | 'QRIS'>('Cash');
  const [isMemberDialogOpen, setIsMemberDialogOpen] = React.useState(false);
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [discountType, setDiscountType] = React.useState<'percent' | 'nominal'>('percent');
  const [discountValue, setDiscountValue] = React.useState(0);
  const [pointsToRedeem, setPointsToRedeem] = React.useState(0);
  const [isDineIn, setIsDineIn] = React.useState(true); // Default to true for table orders
  const { toast } = useToast();
  
  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const availableTableOptions = tables
    .filter(t => t.status === 'Tersedia')
    .map((t) => ({
        value: t.id,
        label: t.name
    }));

  const handleTableSelect = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (table) {
        setSelectedTableId(table.id);
        setSelectedTableName(table.name);
    }
  }


  const addToCart = (product: Product) => {
    if (product.stock === 0) {
      toast({
        variant: 'destructive',
        title: 'Stok Habis',
        description: `${product.name} saat ini stoknya habis di toko ini.`,
      });
      return;
    }
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.productId === product.id
      );
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            toast({
                variant: 'destructive',
                title: 'Batas Stok Tercapai',
                description: `Hanya ${product.stock} unit ${product.name} yang tersedia.`,
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
    if(product && quantity > product.stock) {
        toast({
            variant: 'destructive',
            title: 'Batas Stok Tercapai',
            description: `Hanya ${product.stock} unit ${product.name} yang tersedia.`,
        });
        setCart((prevCart) =>
            prevCart.map((item) =>
                item.productId === productId ? { ...item, quantity: product.stock } : item
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
    const product = products.find(p => p.attributes.barcode === barcode);
    if (product) {
      addToCart(product);
      toast({
        title: 'Produk Ditambahkan!',
        description: `${product.name} telah ditambahkan ke keranjang.`,
      });
      setIsScannerOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Produk Tidak Ditemukan',
        description: `Tidak ada produk dengan barcode: ${barcode}`,
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
  
  const pointsEarned = selectedCustomer ? Math.floor(totalAmount / pointEarningSettings.rpPerPoint) : 0;
  
  const transactionFee = React.useMemo(() => {
    const feeFromPercentage = totalAmount * feeSettings.feePercentage;
    const feeCappedAtMin = Math.max(feeFromPercentage, feeSettings.minFeeRp);
    return Math.min(feeCappedAtMin, feeSettings.maxFeeRp) / feeSettings.tokenValueRp;
  }, [totalAmount, feeSettings]);
  
  const handlePointsRedeemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = Number(e.target.value);
    if (value < 0) value = 0;
    if (selectedCustomer && value > selectedCustomer.loyaltyPoints) {
      value = selectedCustomer.loyaltyPoints;
      toast({
        variant: 'destructive',
        title: 'Poin Tidak Cukup',
        description: `Pelanggan hanya memiliki ${selectedCustomer.loyaltyPoints} poin.`,
      });
    }
    setPointsToRedeem(value);
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Keranjang Kosong', description: 'Silakan tambahkan produk ke keranjang.' });
      return;
    }
    if (!currentUser || !activeStore || !selectedTableId) {
        toast({ variant: 'destructive', title: 'Sesi atau Meja Tidak Valid', description: 'Data staff, toko, atau meja tidak ditemukan. Silakan pilih meja dari halaman utama.' });
        return;
    }

    if (pradanaTokenBalance < transactionFee) {
        toast({
            variant: 'destructive',
            title: 'Saldo Token Tidak Cukup',
            description: `Transaksi ini memerlukan ${transactionFee.toFixed(2)} token, tetapi saldo toko Anda hanya ${pradanaTokenBalance.toFixed(2)}. Silakan top up.`
        });
        return;
    }
    
    setIsProcessingCheckout(true);
    
    try {
      const { data, error } = await supabase.rpc('perform_checkout', {
        p_store_id: activeStore.id,
        p_customer_id: selectedCustomer?.id || null,
        p_customer_name: selectedCustomer?.name || (selectedTableId ? `Meja ${selectedTableName}` : 'Guest'),
        p_staff_id: currentUser.id,
        p_subtotal: subtotal,
        p_discount_amount: discountAmount,
        p_total_amount: totalAmount,
        p_payment_method: paymentMethod,
        p_points_earned: pointsEarned,
        p_points_redeemed: pointsToRedeem,
        p_items: cart,
        p_table_id: selectedTableId,
        p_status: 'Diproses', // All table orders are processed
      });

      if (error) {
        throw error;
      }

      const newTransactionId = data.id; // Assume the RPC returns { id: uuid, receipt_number: bigint }
      const newReceiptNumber = data.receipt_number;

      const finalTransactionData: Transaction = {
          id: newTransactionId,
          receiptNumber: newReceiptNumber,
          storeId: activeStore.id,
          customerId: selectedCustomer?.id || 'N/A',
          customerName: selectedCustomer?.name || (selectedTableId ? `Meja ${selectedTableName}` : 'Guest'),
          staffId: currentUser.id,
          createdAt: new Date().toISOString(),
          subtotal: subtotal,
          discountAmount: discountAmount,
          totalAmount: totalAmount,
          paymentMethod: paymentMethod,
          pointsEarned: pointsEarned,
          pointsRedeemed: pointsToRedeem,
          items: cart,
          status: 'Diproses', // All table orders are processed
          tableId: selectedTableId,
      };

      toast({ title: "Pesanan Meja Berhasil Dibuat!", description: `Transaksi ${newReceiptNumber} telah disimpan dan status meja diperbarui.` });
      
      if (finalTransactionData) {
        onPrintRequest(finalTransactionData);
      }
      
      refreshPradanaTokenBalance();
      
      setCart([]);
      setDiscountValue(0);
      setPointsToRedeem(0);
      setSelectedCustomer(undefined);
      onDataChange();
      
      const params = new URLSearchParams();
      params.set('view', 'pos');
      router.push(`/dashboard?${params.toString()}`);

    } catch (error) {
      console.error("Checkout failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
      toast({ variant: 'destructive', title: 'Checkout Gagal', description: errorMessage });
    } finally {
      setIsProcessingCheckout(false);
    }
  }
  
  const handleCustomerAdded = () => {
    onDataChange();
  }


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
                placeholder="Cari produk..."
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
               <ShadcnTable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-center w-[120px]">Stok</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({length: 10}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                        </TableRow>
                    ))
                  ) : filteredProducts.map((product) => {
                    const stockInStore = product.stock;
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
                            <Badge variant="destructive">Habis</Badge>
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
              </ShadcnTable>
            </CardContent>
          </ScrollArea>
        </Card>
      </div>
      <div className="xl:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline tracking-wider">
              {selectedTableId ? `Pesanan untuk ${selectedTableName}` : 'Pesanan Saat Ini'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
             <div className="grid grid-cols-1 gap-2">
                 <div className="flex items-center gap-2">
                    <Combobox
                        options={customerOptions}
                        value={selectedCustomer?.id}
                        onValueChange={(value) => {
                        setSelectedCustomer(customers.find((c) => c.id === value));
                        setPointsToRedeem(0); // Reset points when customer changes
                        }}
                        placeholder="Cari pelanggan..."
                        searchPlaceholder="Cari nama pelanggan..."
                        notFoundText="Pelanggan tidak ditemukan."
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
                            Daftar Pelanggan Baru
                            </DialogTitle>
                            <DialogDescription>
                              Tambahkan pelanggan baru dan Dapatkan Fitur Menarik Chika AI
                            </DialogDescription>
                        </DialogHeader>
                        <AddCustomerForm setDialogOpen={setIsMemberDialogOpen} onCustomerAdded={handleCustomerAdded} />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>


            {selectedTableId && !selectedCustomer && (
                <div className="flex items-center gap-2 rounded-md border border-dashed p-3">
                    <Armchair className="h-5 w-5 text-muted-foreground" />
                    <p className="font-medium text-muted-foreground">Mode Pesanan Meja</p>
                </div>
            )}


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
                      <Input
                        type="number"
                        className="w-14 h-8 text-center"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                      />
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
                  Keranjang Anda kosong.
                </div>
              )}
              </div>
            </ScrollArea>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Coins className="h-4 w-4"/> Saldo Token Toko
                </span>
                <span>{pradanaTokenBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <Separator className="my-1"/>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="grid gap-2">
                <Label htmlFor='discount' className="flex items-center gap-1 text-muted-foreground"><Percent className="h-3 w-3" /> Diskon Manual</Label>
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

               <div className="grid gap-2">
                <Label htmlFor='redeem-points' className="flex items-center gap-1 text-muted-foreground"><Gift className="h-3 w-3" /> Tukar Poin</Label>
                 <Input 
                    id="redeem-points"
                    type="number"
                    value={pointsToRedeem}
                    onChange={handlePointsRedeemChange}
                    className="h-9"
                    placeholder='0'
                    disabled={!selectedCustomer || selectedCustomer.loyaltyPoints === 0}
                />
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>Total Diskon</span>
                <span className="text-destructive">- Rp {discountAmount.toLocaleString('id-ID')}</span>
              </div>
               <div className="flex justify-between text-muted-foreground">
                 <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Poin Didapat</span>
                <span>+ {pointsEarned.toLocaleString('id-ID')} pts</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                 <span className="flex items-center gap-1 text-destructive"><Gift className="h-3 w-3" /> Poin Ditukar</span>
                <span className="text-destructive">- {pointsToRedeem.toLocaleString('id-ID')} pts</span>
              </div>
              {transactionFee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span className="flex items-center gap-1 text-destructive"><Coins className="h-3 w-3" /> Biaya Transaksi</span>
                    <span className="text-destructive">- {transactionFee.toFixed(2)} Token</span>
                  </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>Rp {totalAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>
            
            {selectedCustomer && cart.length > 0 && (
              <LoyaltyRecommendation customer={selectedCustomer} totalPurchaseAmount={totalAmount} feeSettings={feeSettings} />
            )}

             <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="dine-in-switch" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <span>Sajikan di Sini (Dine-in)</span>
                </Label>
                <Switch id="dine-in-switch" checked={isDineIn} onCheckedChange={setIsDineIn} disabled={!!selectedTableId}/>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <Button variant={paymentMethod === 'Cash' ? 'default' : 'secondary'} onClick={() => setPaymentMethod('Cash')}>Tunai</Button>
                <Button variant={paymentMethod === 'Card' ? 'default' : 'secondary'} onClick={() => setPaymentMethod('Card')}>Kartu</Button>
                <Button variant={paymentMethod === 'QRIS' ? 'default' : 'secondary'} onClick={() => setPaymentMethod('QRIS')}>QRIS</Button>
            </div>
            
             <Button size="lg" className="w-full font-headline text-lg tracking-wider" onClick={handleCheckout} disabled={isProcessingCheckout || isLoading}>
                Buat Pesanan & Bayar
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>

    <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline tracking-wider">Scan Barcode</DialogTitle>
            <DialogDescription>
              Arahkan kamera ke barcode produk untuk menambahkannya ke keranjang.
            </DialogDescription>
          </DialogHeader>
          <BarcodeScanner onScan={handleBarcodeScanned} />
        </DialogContent>
      </Dialog>
    </>
  );
}
