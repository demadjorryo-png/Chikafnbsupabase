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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquareHeart, Sparkles } from 'lucide-react';
import { pendingOrders, products } from '@/lib/data';
import { getPendingOrderFollowUp } from '@/ai/flows/pending-order-follow-up';

export default function PendingOrders() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [followUpMessage, setFollowUpMessage] = React.useState('');
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);

  const handleGenerateFollowUp = async (order: (typeof pendingOrders)[0]) => {
    setIsLoading(true);
    setFollowUpMessage('');
    try {
      const result = await getPendingOrderFollowUp({
        customerName: order.customerName,
        productName: order.productName,
      });
      setFollowUpMessage(result.followUpMessage);
      setIsAlertOpen(true);
    } catch (error) {
      console.error('Error generating follow-up:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline tracking-wider">
            Pending Orders
          </CardTitle>
          <CardDescription>
            Manage customer orders for out-of-stock items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOrders.map((order) => {
                const product = products.find((p) => p.id === order.productId);
                const isBackInStock = product ? product.stock > 0 : false;
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/50">
                          <AvatarImage
                            src={order.customerAvatarUrl}
                            alt={order.customerName}
                          />
                          <AvatarFallback>
                            {order.customerName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{order.customerName}</div>
                      </div>
                    </TableCell>
                    <TableCell>{order.productName}</TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isBackInStock ? 'default' : 'secondary'}>
                        {isBackInStock ? 'Back in Stock' : 'Out of Stock'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!isBackInStock || isLoading}
                        onClick={() => handleGenerateFollowUp(order)}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquareHeart className="mr-2 h-4 w-4" />
                        )}
                        Follow Up
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                 <Sparkles className="h-5 w-5" />
              </div>
              <AlertDialogTitle className="font-headline tracking-wider">
                Chika AI Follow-up
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-4 text-base text-foreground">
              {followUpMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigator.clipboard.writeText(followUpMessage)}>Copy Text</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
