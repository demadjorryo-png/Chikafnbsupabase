'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader, Send, Sparkles } from 'lucide-react';
import { getPendingOrderFollowUp } from '@/ai/flows/pending-order-follow-up';
import type { Customer, PendingOrder } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type PendingOrderFollowUpDialogProps = {
  order: PendingOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PendingOrderFollowUpDialog({
  order,
  open,
  onOpenChange,
}: PendingOrderFollowUpDialogProps) {
  const [message, setMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const result = await getPendingOrderFollowUp({
        customerName: order.customerName,
        productName: order.productName,
      });
      setMessage(result.followUpMessage);
    } catch (error) {
      console.error('Error generating follow-up message:', error);
      setMessage('Gagal membuat pesan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (open) {
      // Automatically generate message when dialog opens
      handleGenerate();

      // Fetch customer phone number
      const fetchCustomer = async () => {
        try {
          const customerRef = doc(db, 'customers', order.customerId);
          const customerSnap = await getDoc(customerRef);
          if (customerSnap.exists()) {
            setCustomer(customerSnap.data() as Customer);
          } else {
             toast({ variant: 'destructive', title: 'Pelanggan tidak ditemukan.' });
          }
        } catch (error) {
             toast({ variant: 'destructive', title: 'Gagal mengambil data pelanggan.' });
        }
      }
      fetchCustomer();

    } else {
      // Reset state when dialog closes
      setMessage('');
      setIsLoading(false);
      setCustomer(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order, toast]);

  const formattedPhone = customer?.phone
    ? customer.phone.startsWith('0')
      ? `62${customer.phone.substring(1)}`
      : customer.phone
    : '';

  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
    message
  )}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Follow Up Pesanan: {order.productName}
          </DialogTitle>
          <DialogDescription>
            Kirim notifikasi ke {order.customerName} bahwa produknya sudah
            tersedia.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader className="h-4 w-4 animate-spin" />
                <span>Chika AI sedang membuat pesan...</span>
            </div>
          )}
          
          {message && (
            <div className="space-y-4">
              <Alert className="border-accent bg-accent/10">
                <Sparkles className="h-4 w-4 !text-accent" />
                <AlertTitle className="font-semibold text-accent">
                  Pesan yang Dihasilkan
                </AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <Link href={whatsappUrl} target="_blank" className="w-full">
                <Button className="w-full" variant="secondary" disabled={!customer}>
                  <Send className="mr-2 h-4 w-4" />
                  Kirim via WhatsApp
                </Button>
              </Link>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
