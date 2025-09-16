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
import { transactions } from '@/lib/data';
import type { Transaction } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

function TransactionDetailsDialog({ transaction, open, onOpenChange }: { transaction: Transaction; open: boolean; onOpenChange: (open: boolean) => void }) {
    if (!transaction) return null;

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
                        <p className="text-sm text-muted-foreground">Customer</p>
                        <p className="font-medium">{transaction.customerName}</p>
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
                            <p className="text-muted-foreground">Total Amount</p>
                            <p className="font-medium">Rp {transaction.totalAmount.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="flex justify-between">
                            <p className="text-muted-foreground">Payment Method</p>
                            <p className="font-medium">{transaction.paymentMethod}</p>
                        </div>
                         <div className="flex justify-between">
                            <p className="text-muted-foreground">Points Earned</p>
                            <p className="font-medium text-primary">+{transaction.pointsEarned} pts</p>
                        </div>
                   </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function Transactions() {
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);

  return (
    <>
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
              <TableHead>Customer</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {new Date(transaction.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </TableCell>
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
                       <DropdownMenuItem>Print Receipt</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    {selectedTransaction && (
        <TransactionDetailsDialog
            transaction={selectedTransaction}
            open={!!selectedTransaction}
            onOpenChange={() => setSelectedTransaction(null)}
        />
    )}
    </>
  );
}
