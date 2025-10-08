
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
import type { OrderReadyFollowUpOutput, OrderReadyFollowUpInput } from '@/functions/src/ai/flows/order-ready-follow-up';
import type { TextToSpeechInput, TextToSpeechOutput } from '@/functions/src/ai/flows/text-to-speech';
import type { Customer, Store, Transaction, ReceiptSettings } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { getReceiptSettings } from '@/lib/receipt-settings';
import { supabase } from '@/lib/supabase'; // Mengganti Firebase dengan Supabase

type OrderReadyDialogProps = {
  transaction: Transaction;
  customer?: Customer;
  store: Store;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: 'call' | 'whatsapp';
  onSuccess?: () => void;
};

export function OrderReadyDialog({
  transaction,
  customer,
  store,
  open,
  onOpenChange,
  actionType,
  onSuccess
}: OrderReadyDialogProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [announcementText, setAnnouncementText] = React.useState('');
  const [audioDataUri, setAudioDataUri] = React.useState('');
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  
  const [receiptSettings, setReceiptSettings] = React.useState<ReceiptSettings | null>(null);

  React.useEffect(() => {
    if(store.id) {
        getReceiptSettings(store.id).then(setReceiptSettings);
    }
  }, [store.id]);

  const processAction = React.useCallback(async () => {
    if (!receiptSettings) {
        if(open) toast({ variant: 'destructive', title: 'Pengaturan belum dimuat. Coba lagi.' });
        setIsLoading(false);
        return;
    }

    if (actionType === 'whatsapp' && (!customer || !customer.phone)) {
        toast({
            variant: 'destructive',
            title: 'Nomor WhatsApp Tidak Ditemukan',
            description: `Pelanggan "${transaction.customerName}" tidak memiliki nomor telepon yang terdaftar.`,
        });
        setIsLoading(false);
        onOpenChange(false); // Close dialog
        return;
    }

    setIsLoading(true);

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) {
            throw new Error('Supabase URL is not configured.');
        }
    
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (sessionError || !accessToken) {
            console.warn("Could not get access token for Edge Function call, proceeding without it.", sessionError);
            // Optionally, handle this error more strictly if the Edge Function requires authentication.
        }

        const nameToAnnounce = customer?.name || transaction.customerName;
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const orderReadyInput: OrderReadyFollowUpInput = {
            customerName: nameToAnnounce,
            storeName: store.name,
            itemsOrdered: transaction.items.map(item => item.productName),
            currentTime: currentTime,
            notificationStyle: receiptSettings.notificationStyle,
        };

        const orderReadyResponse = await fetch(`${supabaseUrl}/functions/v1/order-ready-follow-up-flow`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(orderReadyInput),
        });

        if (!orderReadyResponse.ok) {
            const errorData = await orderReadyResponse.json();
            throw new Error(errorData.message || 'Failed to generate order ready message');
        }

        const generatedTextResult: OrderReadyFollowUpOutput = await orderReadyResponse.json();
        const text = generatedTextResult.followUpMessage;
        setAnnouncementText(text);

        if (actionType === 'call') {
            const textToSpeechInput: TextToSpeechInput = { text, gender: receiptSettings.voiceGender };
            const audioResponse = await fetch(`${supabaseUrl}/functions/v1/text-to-speech-flow`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify(textToSpeechInput),
            });

            if (!audioResponse.ok) {
                const errorData = await audioResponse.json();
                throw new Error(errorData.message || 'Failed to convert text to speech');
            }
            const audioResult: TextToSpeechOutput = await audioResponse.json();
            setAudioDataUri(audioResult.audioDataUri);
            onSuccess?.();
        } else if (actionType === 'whatsapp') {
            if (!customer?.phone) throw new Error("Nomor telepon pelanggan tidak ditemukan untuk mengirim WhatsApp.");
            
            const formattedPhone = customer.phone.startsWith('0')
                ? `62${customer.phone.substring(1)}`
                : customer.phone;

            const sendWhatsappResponse = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  storeId: store.id,
                  target: formattedPhone,
                  message: text,
                }),
            });

            if (!sendWhatsappResponse.ok) {
                const errorData = await sendWhatsappResponse.json();
                throw new Error(errorData.message || 'Failed to send WhatsApp message');
            }
            
            toast({ title: "Notifikasi WhatsApp Terkirim!" });
            onSuccess?.();
            onOpenChange(false);
        }

    } catch (error) {
      console.error('Error in order ready flow:', error);
      toast({
        variant: 'destructive',
        title: `Gagal Melakukan Aksi: ${actionType}`,
        description: (error as Error).message,
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  }, [actionType, customer, store, transaction, onOpenChange, toast, open, onSuccess, receiptSettings]);
  
  React.useEffect(() => {
    if (audioDataUri && audioRef.current && actionType === 'call') {
      audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
    }
  }, [audioDataUri, actionType]);

  React.useEffect(() => {
    if (open) {
        setAnnouncementText('');
        setAudioDataUri('');
        if (receiptSettings) {
            processAction();
        }
    }
  }, [open, processAction, receiptSettings]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Panggilan Tindakan Pesanan</DialogTitle>
          <DialogDescription>
            Memproses tindakan untuk pesanan {customer?.name || transaction.customerName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm font-semibold mb-2">Detail Transaksi:</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Nota: {String(transaction.receiptNumber).padStart(6, '0')}</p>
              <p>Pelanggan: {transaction.customerName}</p>
              <p>Item: {transaction.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}</p>
            </div>
          </div>
          
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-4">
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                <span>Memproses {actionType === 'call' ? 'panggilan suara' : 'pesan WhatsApp'}...</span>
            </div>
          )}

          {!isLoading && announcementText && (
            <>
            <Alert variant="default" className={actionType === 'call' ? 'bg-primary/10 border-primary/30' : 'bg-green-500/10 border-green-500/30'}>
              {actionType === 'call' ? <Volume2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              <AlertTitle className="font-semibold">{actionType === 'call' ? 'Pengumuman Suara' : 'Pesan WhatsApp'}</AlertTitle>
              <AlertDescription className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {announcementText}
              </AlertDescription>
            </Alert>
            {actionType === 'call' && audioDataUri && (
                <audio ref={audioRef} src={audioDataUri} className="w-full" controls autoPlay/>
            )}
            </>
          )}

          {!isLoading && !announcementText && !receiptSettings && (
             <div className="flex items-center justify-center gap-2 py-4">
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                <span>Memuat pengaturan...</span>
            </div>
          )}

           {!isLoading && !announcementText && receiptSettings &&(
            <Alert variant="destructive">
              <AlertTitle>Gagal Memproses</AlertTitle>
              <AlertDescription>
                Terjadi kesalahan. Silakan tutup dan coba lagi.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
