'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Transaction, Store, User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Receipt } from '@/components/dashboard/receipt';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

function TransactionDetailsDialog({ transaction, open, onOpenChange, stores, users }: { transaction: Transaction; open: boolean; onOpenChange: (open: boolean) => void; stores: Store[], users: User[] }) {
    if (!transaction) return null;
    
    const store = stores.find(s => s.id === transaction.storeId);
    const staff = users.find(u => u.id === transaction.staffId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline tracking-wider">Transaction Details</DialogTitle>
                    <DialogDescription>
                        ID: {transaction.id}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                   <div>
                        <p className="text-sm text-muted-foreground">Store</p>
                        <p className="font-medium">{store?.name || 'Unknown'}</p>
                   </div>
                   <div>
                        <p className="text-sm text-muted-foreground">Customer</p>
                        <p className="font-medium">{transaction.customerName}</p>
                   </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Cashier</p>
                        <p className="font-medium">{staff?.name || 'Unknown'}</p>
                   </div>
                   <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-medium">{new Date(transaction.createdAt).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p>
                   </div>
                   <Separator />
                   <div className="space-y-2">
                        <p className="font-medium">Items Purchased</p>
                        {transaction.items.map(item => (
                            <div key={item.productId} className="flex justify-between items-center text-sm">
                                <div>
                                    <p>{item.productName}</p>
                                    <p className="text-muted-foreground">{item.quantity} x Rp {item.price.toLocaleString('id-ID')}</p>
                                </div>
                                <p>Rp {(item.quantity * item.price).toLocaleString('id-ID')}</p>
                            </div>
                        ))}
                   </div>
                   <Separator />
                   <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <p className="text-muted-foreground">Subtotal</p>
                            <p>Rp {transaction.subtotal.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="flex justify-between text-destructive">
                            <p>Discount</p>
                            <p>- Rp {transaction.discountAmount.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="flex justify-between font-medium">
                            <p>Total Amount</p>
                            <p>Rp {transaction.totalAmount.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="flex justify-between">
                            <p className="text-muted-foreground">Payment Method</p>
                            <p>{transaction.paymentMethod}</p>
                        </div>
                         <div className="flex justify-between">
                            <p className="text-muted-foreground">Points Earned</p>
                            <p className="text-primary">+{transaction.pointsEarned} pts</p>
                        </div>
                         <div className="flex justify-between text-destructive">
                            <p>Points Redeemed</p>
                            <p>-{transaction.pointsRedeemed} pts</p>
                        </div>
                   </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function Transactions() {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);
  const [transactionToPrint, setTransactionToPrint] = React.useState<Transaction | null>(null);
  const { toast } = useToast();

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const transactionsQuery = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const transactionList = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setTransactions(transactionList);

        const storesSnapshot = await getDocs(collection(db, 'stores'));
        const storeList = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
        setStores(storeList);
        
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const userList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(userList);

    } catch (error) {
        console.error("Error fetching data:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Memuat Data',
            description: 'Terjadi kesalahan saat mengambil riwayat transaksi.'
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);


  const handlePrint = (transaction: Transaction) => {
    setTransactionToPrint(transaction);
    // Use a timeout to allow the component to render before printing
    setTimeout(() => {
        window.print();
        setTransactionToPrint(null);
    }, 100);
  };


  return (
    <>
      <div className="printable-area">
        {transactionToPrint && <Receipt transaction={transactionToPrint} />}
      </div>
      <div className="non-printable">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline tracking-wider">
              Transaction History
            </CardTitle>
            <CardDescription>
              View all past sales and their details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    Array.from({length: 5}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-28"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                            <TableCell><Skeleton className="h-6 w-16"/></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto"/></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto"/></TableCell>
                        </TableRow>
                    ))
                ) : (
                    transactions.map((transaction) => {
                    const store = stores.find(s => s.id === transaction.storeId);
                    return (
                    <TableRow key={transaction.id}>
                        <TableCell>
                        {new Date(transaction.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        })}
                        </TableCell>
                        <TableCell>{store?.name || 'N/A'}</TableCell>
                        <TableCell>{transaction.customerName}</TableCell>
                        <TableCell>
                        <Badge variant="secondary">{transaction.paymentMethod}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                        Rp {transaction.totalAmount.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setSelectedTransaction(transaction)}>
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrint(transaction)}>
                                Print Receipt
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                                Return
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    )})
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      {selectedTransaction && (
          <TransactionDetailsDialog
              transaction={selectedTransaction}
              open={!!selectedTransaction}
              onOpenChange={() => setSelectedTransaction(null)}
              stores={stores}
              users={users}
          />
      )}
    </>
  );
}
