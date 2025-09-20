'use client';

import * as React from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Banknote, Info, Loader, Wallet, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getTransactionFeeSettings, defaultFeeSettings } from '@/lib/app-settings';
import type { TransactionFeeSettings } from '@/lib/app-settings';
import { useAuth } from '@/contexts/auth-context';

declare global {
    interface Window {
        snap: any;
    }
}

type TopUpDialogProps = {
  currentBalance: number;
  setDialogOpen: (open: boolean) => void;
};

const topUpPackages = [50, 100, 200, 500, 1000];

export function TopUpDialog({ currentBalance, setDialogOpen }: TopUpDialogProps) {
  const { activeStore, currentUser } = useAuth();
  const [selectedAmount, setSelectedAmount] = React.useState<number | string>(topUpPackages[1]);
  const [manualAmount, setManualAmount] = React.useState('');
  const [feeSettings, setFeeSettings] = React.useState<TransactionFeeSettings>(defaultFeeSettings);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    const isProduction = process.env.NODE_ENV === 'production';
    const midtransScriptUrl = isProduction 
        ? 'https://app.midtrans.com/snap/snap.js' 
        : 'https://app.sandbox.midtrans.com/snap/snap.js';
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    
    if (!clientKey) {
        console.error("Midtrans client key is not set. Please check your environment variables.");
        toast({
            variant: 'destructive',
            title: 'Konfigurasi Midtrans Error',
            description: 'Client Key Midtrans tidak ditemukan.'
        });
        return;
    }

    let script = document.createElement('script');
    script.src = midtransScriptUrl;
    script.setAttribute('data-client-key', clientKey);
    script.async = true;

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    }
  }, [toast]);

  React.useEffect(() => {
    async function fetchSettings() {
        const settings = await getTransactionFeeSettings();
        setFeeSettings(settings);
    }
    fetchSettings();
  }, []);

  const handlePackageSelect = (value: string) => {
    if (value) {
      setSelectedAmount(Number(value));
      setManualAmount('');
    }
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSelectedAmount('');
    setManualAmount(value);
  };
  
  const finalAmount = typeof selectedAmount === 'number' ? selectedAmount : Number(manualAmount);
  const totalRp = finalAmount * feeSettings.tokenValueRp;

  const handleConfirm = async () => {
    if (finalAmount <= 0) {
        toast({
            variant: 'destructive',
            title: 'Jumlah tidak valid',
            description: 'Silakan pilih paket atau masukkan jumlah yang valid.'
        });
        return;
    }
    
    setIsProcessing(true);

    try {
        const response = await fetch('/api/midtrans', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: totalRp,
                tokens: finalAmount,
                storeId: activeStore?.id,
                storeName: activeStore?.name,
                customerDetails: {
                    first_name: currentUser?.name,
                    email: currentUser?.email,
                    phone: currentUser?.whatsapp || '',
                }
            })
        });
        
        const data = await response.json();
        
        if (response.status !== 200) {
            throw new Error(data.message || 'Gagal membuat transaksi.');
        }
        
        window.snap.pay(data.token, {
            onSuccess: function(result: any){
              toast({ title: "Pembayaran Berhasil!", description: "Saldo token Anda akan segera diperbarui." });
              setDialogOpen(false);
            },
            onPending: function(result: any){
              toast({ title: "Pembayaran Tertunda", description: "Menunggu pembayaran Anda selesai." });
              setDialogOpen(false);
            },
            onError: function(result: any){
              toast({ variant: 'destructive', title: "Pembayaran Gagal", description: "Silakan coba lagi atau gunakan metode lain." });
            },
            onClose: function(){
              // User closed the popup without finishing the payment
            }
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
        toast({ variant: 'destructive', title: "Error", description: errorMessage });
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-headline tracking-wider">Top Up Pradana Token</DialogTitle>
        <DialogDescription>
          Isi ulang saldo token untuk toko Anda melalui pembayaran otomatis.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm">Saldo Anda Saat Ini</p>
          </div>
          <p className="font-mono text-lg font-bold">{currentBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
        </div>

        <div className="space-y-2">
          <Label>Pilih Paket (1 Token = Rp {feeSettings.tokenValueRp.toLocaleString('id-ID')})</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={typeof selectedAmount === 'number' ? String(selectedAmount) : ''}
            onValueChange={handlePackageSelect}
            className="grid grid-cols-5 gap-2"
          >
            {topUpPackages.map((pkg) => (
              <ToggleGroupItem key={pkg} value={String(pkg)} className="w-full">
                {pkg}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="space-y-2">
          <Label>Atau Masukkan Jumlah Lain</Label>
          <Input
            type="number"
            placeholder="e.g., 150"
            value={manualAmount}
            onChange={handleManualChange}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4 text-primary">
            <div className="flex items-center gap-2 font-headline text-lg">
                <Banknote className="h-6 w-6" />
                <span>Total Bayar</span>
            </div>
            <p className="font-mono text-xl font-bold">Rp {totalRp.toLocaleString('id-ID')}</p>
        </div>
        
        <Alert variant="default" className="border-green-500/50 bg-green-500/10">
            <ShieldCheck className="h-4 w-4 text-green-700" />
            <AlertTitle className="text-green-800">Aman & Terpercaya</AlertTitle>
            <AlertDescription className="text-green-700/80">
                Pembayaran diproses oleh Midtrans, mendukung GoPay, OVO, transfer bank, dan lainnya.
            </AlertDescription>
        </Alert>

      </div>
      <DialogFooter>
        <Button className="w-full" onClick={handleConfirm} disabled={isProcessing || finalAmount <= 0}>
            {isProcessing ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Bayar Sekarang
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
