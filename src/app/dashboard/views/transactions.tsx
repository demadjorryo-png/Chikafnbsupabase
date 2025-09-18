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
import type { Transaction, Store, User, Customer } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Volume2, Send, CheckCircle, Loader } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { OrderReadyDialog } from '@/components/dashboard/order-ready-dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, writeBatch, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


type TransactionsProps = {
    transactions: Transaction[];
    stores: Store[];
    users: User[];
    customers: Customer[];
    onDataChange: () => void;
    isLoading: boolean;
};

function TransactionDetailsDialog({ transaction, open, onOpenChange, stores, users }: { transaction: Transaction; open: boolean; onOpenChange: (open: boolean) => void; stores: Store[], users: User[] }) {
    if (!transaction) return null;
    
    const store = stores.find(s => s.id === transaction.storeId);
    const staff = users.find(u => u.id === transaction.staffId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline tracking-wider">Detail Transaksi</DialogTitle>
                    <DialogDescription>
                        ID: {transaction.id}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                   <div>
                        <p className="text-sm text-muted-foreground">Toko</p>
                        <p className="font-medium">{store?.name || 'Unknown'}</p>
                   </div>
                   <div>
                        <p className="text-sm text-muted-foreground">Pelanggan</p>
                        <p className="font-medium">{transaction.customerName}</p>
                   </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Kasir</p>
                        <p className="font-medium">{staff?.name || 'Unknown'}</p>
                   </div>
                   <div>
                        <p className="text-sm text-muted-foreground">Tanggal</p>
                        <p className="font-medium">{new Date(transaction.createdAt).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</p>
                   </div>
                   <Separator />
                   <div className="space-y-2">
                        <p className="font-medium">Item Dibeli</p>
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
                            <p>Diskon</p>
                            <p>- Rp {transaction.discountAmount.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="flex justify-between font-medium">
                            <p>Total</p>
                            <p>Rp {transaction.totalAmount.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="flex justify-between">
                            <p className="text-muted-foreground">Metode Pembayaran</p>
                            <p>{transaction.paymentMethod}</p>
                        </div>
                         <div className="flex justify-between">
                            <p className="text-muted-foreground">Poin Didapat</p>
                            <p className="text-primary">+{transaction.pointsEarned} pts</p>
                        </div>
                         <div className="flex justify-between text-destructive">
                            <p>Poin Ditukar</p>
                            <p>-{transaction.pointsRedeemed} pts</p>
                        </div>
                   </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function Transactions({ transactions, stores, users, customers, onDataChange, isLoading }: TransactionsProps) {
  const { activeStore } = useAuth();
  const { toast } = useToast();
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);
  const [transactionToPrint, setTransactionToPrint] = React.useState<Transaction | null>(null);
  const [actionInProgress, setActionInProgress] = React.useState<{ transaction: Transaction; type: 'call' | 'whatsapp' } | null>(null);
  const [completingTransactionId, setCompletingTransactionId] = React.useState<string | null>(null);
  const [transactionToComplete, setTransactionToComplete] = React.useState<Transaction | null>(null);
  const [sentWhatsappIds, setSentWhatsappIds] = React.useState<Set<string>>(new Set());

  const handlePrint = (transaction: Transaction) => {
    setTransactionToPrint(transaction);
    setTimeout(() => {
        window.print();
        setTransactionToPrint(null);
    }, 100);
  };

  const getCustomerForTransaction = (transaction: Transaction): Customer | undefined => {
      if (!transaction.customerId || transaction.customerId === 'N/A') return undefined;
      return customers.find(c => c.id === transaction.customerId);
  }

  const handleActionClick = (transaction: Transaction, type: 'call' | 'whatsapp') => {
    setActionInProgress({ transaction, type });
  };
  
  const handleWhatsappSent = (transactionId: string) => {
    setSentWhatsappIds(prev => new Set(prev).add(transactionId));
  }

  const handleCompleteTransaction = async () => {
    if (!transactionToComplete || !activeStore) return;
    
    setCompletingTransactionId(transactionToComplete.id);

    const transactionCollectionName = `transactions_${activeStore.id}`;
    const transactionRef = doc(db, transactionCollectionName, transactionToComplete.id);

    try {
        const batch = writeBatch(db);
        batch.update(transactionRef, { status: 'Selesai' });

        if (transactionToComplete.tableId) {
            const tableCollectionName = `tables_${activeStore.id}`;
            const tableRef = doc(db, tableCollectionName, transactionToComplete.tableId);
            batch.update(tableRef, { status: 'Selesai Dibayar' });
        }
        
        await batch.commit();

        toast({ title: 'Pesanan Selesai!', description: `Status pesanan untuk ${transactionToComplete.customerName} telah diperbarui.`});
        onDataChange();

    } catch (error) {
        console.error("Error completing transaction:", error);
        toast({ variant: 'destructive', title: 'Gagal Menyelesaikan Pesanan' });
    } finally {
        setCompletingTransactionId(null);
        setTransactionToComplete(null);
    }
  }

  return (
    <>
      <div className="printable-area">
        {transactionToPrint && <Receipt transaction={transactionToPrint} />}
      </div>
      <div className="non-printable">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline tracking-wider">
              Riwayat Transaksi
            </CardTitle>
            <CardDescription>
              Lihat semua penjualan yang lalu, status pesanan, dan detailnya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    Array.from({length: 5}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-6 w-20 mx-auto"/></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto"/></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto"/></TableCell>
                        </TableRow>
                    ))
                ) : (
                    transactions.map((transaction) => {
                    return (
                    <TableRow key={transaction.id}>
                        <TableCell>
                        {new Date(transaction.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        })}
                        </TableCell>
                        <TableCell>{transaction.customerName}</TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={transaction.status === 'Selesai' ? 'secondary' : 'default'}
                            className={cn(
                                transaction.status === 'Diproses' && 'bg-amber-500/20 text-amber-800 border-amber-500/50',
                                transaction.status === 'Selesai Dibayar' && 'bg-slate-500/20 text-slate-800 border-slate-500/50'
                            )}
                          >
                              {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                        Rp {transaction.totalAmount.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {transaction.status === 'Diproses' && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleActionClick(transaction, 'call')}
                                    >
                                        <Volume2 className="h-4 w-4"/>
                                        <span className="sr-only">Panggil Pelanggan</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleActionClick(transaction, 'whatsapp')}
                                        disabled={!getCustomerForTransaction(transaction) || sentWhatsappIds.has(transaction.id)}
                                    >
                                        <Send className="h-4 w-4"/>
                                        <span className="sr-only">Kirim WhatsApp</span>
                                    </Button>
                                     <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10 border-green-500/30"
                                        onClick={() => setTransactionToComplete(transaction)}
                                        disabled={completingTransactionId === transaction.id}
                                    >
                                        {completingTransactionId === transaction.id ? <Loader className="h-4 w-4 animate-spin"/> : <CheckCircle className="h-4 w-4"/>}
                                        <span className="sr-only">Selesaikan Pesanan</span>
                                    </Button>
                                </>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setSelectedTransaction(transaction)}>
                                    Lihat Detail
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePrint(transaction)}>
                                    Cetak Struk
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                    Pengembalian
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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
      {actionInProgress && activeStore && (
        <OrderReadyDialog
          transaction={actionInProgress.transaction}
          customer={getCustomerForTransaction(actionInProgress.transaction)}
          store={activeStore}
          open={!!actionInProgress}
          onOpenChange={() => setActionInProgress(null)}
          actionType={actionInProgress.type}
          onSuccess={() => {
            if (actionInProgress.type === 'whatsapp') {
                handleWhatsappSent(actionInProgress.transaction.id);
            }
          }}
        />
      )}
      <AlertDialog open={!!transactionToComplete} onOpenChange={() => setTransactionToComplete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Selesaikan Pesanan?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menandai pesanan untuk <span className="font-bold">{transactionToComplete?.customerName}</span> sebagai selesai. Pastikan pesanan sudah diserahkan kepada pelanggan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteTransaction}>Ya, Selesaikan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
