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
import { Banknote, Info, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { getTransactionFeeSettings, defaultFeeSettings } from '@/lib/app-settings';
import type { TransactionFeeSettings } from '@/lib/app-settings';


type TopUpDialogProps = {
  storeName: string;
  currentBalance: number;
  setDialogOpen: (open: boolean) => void;
};

const topUpPackages = [50, 100, 200, 500, 1000];
const ADMIN_PHONE = '6282140442252'; // Format internasional tanpa '+'
const BANK_INFO = {
    name: 'BCA',
    account: '3680167523',
    holder: 'RIO YULI PRADANA'
};

export function TopUpDialog({ storeName, currentBalance, setDialogOpen }: TopUpDialogProps) {
  const [selectedAmount, setSelectedAmount] = React.useState<number | string>(topUpPackages[1]);
  const [manualAmount, setManualAmount] = React.useState('');
  const [feeSettings, setFeeSettings] = React.useState<TransactionFeeSettings>(defaultFeeSettings);
  const { toast } = useToast();

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

  const handleConfirm = () => {
    if (finalAmount <= 0) {
        toast({
            variant: 'destructive',
            title: 'Jumlah tidak valid',
            description: 'Silakan pilih paket atau masukkan jumlah yang valid.'
        });
        return;
    }
    if (finalAmount % 50 !== 0) {
        toast({
            variant: 'destructive',
            title: 'Jumlah tidak valid',
            description: 'Jumlah token harus dalam kelipatan 50.'
        });
        return;
    }

    const message = `Halo, saya admin dari toko "${storeName}" ingin melakukan konfirmasi top-up Pradana Token.

Detail:
- Toko: ${storeName}
- Jumlah Token: ${finalAmount} Token
- Total Transfer: Rp ${totalRp.toLocaleString('id-ID')}

Mohon segera diproses. Terima kasih.`;

    const whatsappUrl = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp in a new tab
    window.open(whatsappUrl, '_blank');

    toast({
        title: 'Lanjutkan di WhatsApp',
        description: `Anda akan diarahkan ke WhatsApp untuk mengirim konfirmasi. Saldo akan diperbarui setelah admin memverifikasi pembayaran.`
    });

    setDialogOpen(false);
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-headline tracking-wider">Top Up Pradana Token</DialogTitle>
        <DialogDescription>
          Isi ulang saldo token untuk toko: <span className="font-semibold">{storeName}</span>
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
            className="grid grid-cols-3 gap-2"
          >
            {topUpPackages.map((pkg) => (
              <ToggleGroupItem key={pkg} value={String(pkg)} className="w-full">
                {pkg}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="space-y-2">
          <Label>Atau Masukkan Jumlah Lain (kelipatan 50)</Label>
          <Input
            type="number"
            placeholder="e.g., 150"
            value={manualAmount}
            onChange={handleManualChange}
            step="50"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4 text-primary">
            <div className="flex items-center gap-2 font-headline text-lg">
                <Banknote className="h-6 w-6" />
                <span>Total Bayar</span>
            </div>
            <p className="font-mono text-xl font-bold">Rp {totalRp.toLocaleString('id-ID')}</p>
        </div>
        
        <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Instruksi Pembayaran</AlertTitle>
            <AlertDescription>
                <ol className="list-decimal pl-4 text-xs space-y-1 mt-2">
                    <li>Silakan transfer ke rekening berikut:</li>
                    <li className="list-none ml-2 font-semibold">{BANK_INFO.name}: {BANK_INFO.account} a.n {BANK_INFO.holder}</li>
                    <li>Setelah transfer berhasil, klik tombol konfirmasi di bawah untuk mengirim bukti via WhatsApp.</li>
                    <li>Saldo token akan diperbarui setelah pembayaran diverifikasi oleh admin.</li>
                </ol>
            </AlertDescription>
        </Alert>

      </div>
      <DialogFooter>
        <Button className="w-full" onClick={handleConfirm}>Konfirmasi via WhatsApp</Button>
      </DialogFooter>
    </DialogContent>
  );
}
