
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
import { getOrderReadyFollowUp } from '@/ai/flows/order-ready-follow-up';
import type { Customer, Store, Transaction } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';

type OrderReadyDialogProps = {
  transaction: Transaction;
  customer?: Customer;
  store: Store;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated: () => void;
};

const WHA_CENTER_DEVICE_ID = '0fe2d894646b1e3111e0e40c809b5501';

export function OrderReadyDialog({
  transaction,
  customer,
  store,
  open,
  onOpenChange,
  onStatusUpdated,
}: OrderReadyDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleAutomatedSend = React.useCallback(async () => {
    if (!customer) {
      toast({ variant: 'destructive', title: 'Pelanggan tidak ditemukan.' });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Generate AI message
      const result = await getOrderReadyFollowUp({
        customerName: customer.name,
        storeName: store.name,
      });
      const message = result.followUpMessage;

      // 2. Send notification via Webhook
      const formattedPhone = customer.phone.startsWith('0')
        ? `62${customer.phone.substring(1)}`
        : customer.phone;
      const webhookUrl = `https://app.whacenter.com/api/send?device_id=${WHA_CENTER_DEVICE_ID}&number=${formattedPhone}&message=${encodeURIComponent(message)}`;
      
      const response = await fetch(webhookUrl);
      if (!response.ok) {
        throw new Error('Webhook API request failed.');
      }

      // 3. Update transaction status
      const transactionCollectionName = `transactions_${store.id}`;
      const transactionRef = doc(db, transactionCollectionName, transaction.id);
      await updateDoc(transactionRef, { status: 'Selesai' });

      toast({
        title: 'Notifikasi Terkirim & Status Diperbarui!',
        description: `Status transaksi telah diubah menjadi "Selesai".`,
      });

      onStatusUpdated();
      onOpenChange(false);

    } catch (error) {
      console.error('Error in order ready flow:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Mengirim Notifikasi',
        description: 'Terjadi kesalahan saat memproses permintaan Anda. Coba lagi.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [customer, store, transaction, onStatusUpdated, onOpenChange, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notifikasi Pesanan Siap</DialogTitle>
          <DialogDescription>
            Konfirmasi untuk mengirim notifikasi WhatsApp ke {customer?.name} bahwa pesanan mereka siap diambil.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm font-semibold mb-2">Detail Transaksi:</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>ID: {transaction.id}</p>
              <p>Pelanggan: {transaction.customerName}</p>
              <p>Item: {transaction.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}</p>
            </div>
          </div>
          <Button
            className="w-full"
            onClick={handleAutomatedSend}
            disabled={isLoading || !customer}
          >
            {isLoading ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Kirim Notifikasi & Tandai Selesai
          </Button>
          {!customer && (
            <Alert variant="destructive">
              <AlertTitle>Tidak Ada Nomor Telepon</AlertTitle>
              <AlertDescription>
                Pelanggan ini tidak memiliki nomor telepon yang terdaftar, sehingga notifikasi WhatsApp tidak dapat dikirim.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
