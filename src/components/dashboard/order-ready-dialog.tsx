
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
import { Loader, Send, Volume2 } from 'lucide-react';
import { getOrderReadyFollowUp } from '@/ai/flows/order-ready-follow-up';
import { convertTextToSpeech } from '@/ai/flows/text-to-speech';
import type { Customer, Store, Transaction } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Separator } from '../ui/separator';

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
  const [announcementText, setAnnouncementText] = React.useState('');
  const [audioDataUri, setAudioDataUri] = React.useState('');
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const handleCallCustomer = React.useCallback(async () => {
    if (!customer) {
      toast({ variant: 'destructive', title: 'Pelanggan tidak ditemukan.' });
      return;
    }

    setIsLoading(true);
    setAnnouncementText('');
    setAudioDataUri('');

    try {
      // 1. Generate announcement text
      const result = await getOrderReadyFollowUp({
        customerName: customer.name,
        storeName: store.name,
      });
      const text = result.followUpMessage;
      setAnnouncementText(text);

      // 2. Generate audio from text
      const audioResult = await convertTextToSpeech({ text });
      setAudioDataUri(audioResult.audioDataUri);

      // 3. Update transaction status
      const transactionCollectionName = `transactions_${store.id}`;
      const transactionRef = doc(db, transactionCollectionName, transaction.id);
      await updateDoc(transactionRef, { status: 'Selesai' });

      toast({
        title: 'Status Pesanan Diperbarui!',
        description: `Status transaksi telah diubah menjadi "Selesai".`,
      });

      onStatusUpdated();

    } catch (error) {
      console.error('Error in order ready flow:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memanggil Pelanggan',
        description: 'Terjadi kesalahan saat memproses permintaan Anda. Coba lagi.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [customer, store, transaction, onStatusUpdated, toast]);
  
  // Effect to auto-play audio when URI is available
  React.useEffect(() => {
    if (audioDataUri && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
    }
  }, [audioDataUri]);

  // Effect to reset state and call customer when dialog opens
   React.useEffect(() => {
    if (open) {
      handleCallCustomer();
    }
  }, [open, handleCallCustomer]);

  const sendWhatsApp = () => {
     if (!customer || !announcementText) return;
     const formattedPhone = customer.phone.startsWith('0')
        ? `62${customer.phone.substring(1)}`
        : customer.phone;
     const webhookUrl = `https://app.whacenter.com/api/send?device_id=${WHA_CENTER_DEVICE_ID}&number=${formattedPhone}&message=${encodeURIComponent(announcementText)}`;
     
     fetch(webhookUrl).then(response => {
        if (response.ok) {
            toast({ title: "Notifikasi WhatsApp Terkirim!" });
        } else {
            toast({ variant: 'destructive', title: "Gagal Mengirim WhatsApp" });
        }
     }).catch(() => toast({ variant: 'destructive', title: "Gagal Mengirim WhatsApp" }));
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Panggil Pelanggan</DialogTitle>
          <DialogDescription>
            Sistem akan mengumumkan bahwa pesanan untuk {customer?.name} telah siap.
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
          
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-4">
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                <span>Memproses panggilan...</span>
            </div>
          )}

          {!isLoading && announcementText && audioDataUri && (
            <>
            <Alert variant="default" className="bg-primary/10 border-primary/30">
              <Volume2 className="h-4 w-4" />
              <AlertTitle className="font-semibold">Pengumuman Disiarkan</AlertTitle>
              <AlertDescription>
                "{announcementText}"
              </AlertDescription>
            </Alert>
            <audio ref={audioRef} src={audioDataUri} className="w-full" controls />
            <Separator />
            <Button
                className="w-full"
                variant="secondary"
                onClick={sendWhatsApp}
                disabled={!customer}
            >
                <Send className="mr-2 h-4 w-4" />
                Kirim juga via WhatsApp
            </Button>
            </>
          )}

          {!isLoading && !customer && (
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
