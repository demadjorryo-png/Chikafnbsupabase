
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check } from 'lucide-react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

type TopUpDialogProps = {
  setDialogOpen: (open: boolean) => void;
};

const BANK_DETAILS = {
    bank: 'BCA',
    accountName: 'PT ERA MAJU MAPAN BERSAMA PRADANA',
    accountNumber: '6225089802'
};

export function TopUpDialog({ setDialogOpen }: TopUpDialogProps) {
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(BANK_DETAILS.accountNumber);
    setHasCopied(true);
    toast({
      title: 'Nomor Rekening Disalin!',
      description: 'Nomor rekening BCA telah disalin ke clipboard.',
    });
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-headline tracking-wider">Top Up Pradana Token</DialogTitle>
        <DialogDescription>
          Silakan lakukan transfer bank ke rekening berikut untuk menambah saldo token Anda.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-1">
            <p className="text-sm font-semibold">{BANK_DETAILS.bank}</p>
            <p className="text-lg font-bold">{BANK_DETAILS.accountName}</p>
        </div>
        <div className="space-y-2">
            <Label htmlFor="account-number">Nomor Rekening</Label>
            <div className="flex items-center gap-2">
                <Input id="account-number" value={BANK_DETAILS.accountNumber} readOnly />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                    {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
        </div>
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-bold">PENTING:</p>
            <ul className="list-disc pl-5 mt-2">
                <li>Nilai 1 Pradana Token = Rp 1.000.</li>
                <li>Setelah melakukan transfer, mohon kirimkan bukti pembayaran ke Admin Platform untuk proses verifikasi dan penambahan saldo.</li>
            </ul>
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={() => setDialogOpen(false)}>Tutup</Button>
      </DialogFooter>
    </DialogContent>
  );
}
