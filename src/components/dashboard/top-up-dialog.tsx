
'use client';

import * as React from 'react';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader, Banknote, Upload, History, Send, Copy } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, query, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';
import type { TopUpRequest } from '@/lib/types';
import { sendWhatsAppNotification } from '@/ai/flows/whatsapp-notification';
import { getWhatsappSettings } from '@/lib/whatsapp-settings';
import { getBankAccountSettings, type BankAccountSettings } from '@/lib/bank-account-settings';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';

type TopUpDialogProps = {
  setDialogOpen: (open: boolean) => void;
};

export function TopUpDialog({ setDialogOpen }: TopUpDialogProps) {
  const { activeStore, currentUser } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = React.useState(50000);
  const [uniqueCode] = React.useState(Math.floor(Math.random() * 900) + 100);
  const [proofFile, setProofFile] = React.useState<File | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [history, setHistory] = React.useState<TopUpRequest[]>([]);
  const [bankSettings, setBankSettings] = React.useState<BankAccountSettings | null>(null);

  React.useEffect(() => {
    getBankAccountSettings().then(setBankSettings);
  }, []);

  React.useEffect(() => {
    if (!activeStore) return;
    const q = query(
      collection(db, 'stores', activeStore.id, 'topUpRequests'),
      orderBy('requestedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const historyData: TopUpRequest[] = [];
      querySnapshot.forEach((doc) => {
        historyData.push({ id: doc.id, ...doc.data() } as TopUpRequest);
      });
      setHistory(historyData);
    });

    return () => unsubscribe();
  }, [activeStore]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore || !currentUser || !proofFile || amount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Data Tidak Lengkap',
        description: 'Pastikan jumlah top-up dan bukti transfer sudah diisi.',
      });
      return;
    }
    setIsLoading(true);

    try {
      // 1. Upload proof to Firebase Storage
      const storage = getStorage();
      const proofRef = ref(storage, `top-up-proofs/${activeStore.id}/${Date.now()}-${proofFile.name}`);
      const uploadResult = await uploadBytes(proofRef, proofFile);
      const proofUrl = await getDownloadURL(uploadResult.ref);

      // 2. Save request to Firestore
      const totalAmount = amount + uniqueCode;
      const newRequest: Omit<TopUpRequest, 'id'> = {
        storeId: activeStore.id,
        storeName: activeStore.name,
        userId: currentUser.id,
        userName: currentUser.name,
        amount: amount,
        uniqueCode: uniqueCode,
        totalAmount: totalAmount,
        proofUrl: proofUrl,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'stores', activeStore.id, 'topUpRequests'), newRequest);
      
      toast({
        title: 'Pengajuan Top Up Terkirim!',
        description: `Pengajuan sebesar Rp ${totalAmount.toLocaleString('id-ID')} sedang diproses.`,
      });
      
      // 3. Send WhatsApp notifications
      const { adminGroup } = await getWhatsappSettings();
      const adminMessage = `*PENGAJUAN TOP UP BARU*
Toko: *${activeStore.name}*
Admin: *${currentUser.name}*
Jumlah: *Rp ${totalAmount.toLocaleString('id-ID')}*
Status: *Pending*

Mohon untuk segera diverifikasi melalui panel Superadmin.
Lihat bukti: ${proofUrl}`;

      const userMessage = `Halo *${currentUser.name}*, pengajuan top up Pradana Token Anda untuk toko *${activeStore.name}* sebesar *Rp ${totalAmount.toLocaleString('id-ID')}* telah berhasil kami terima dan sedang dalam proses verifikasi.`;

      // Send to platform admin group
      if(adminGroup) {
         await sendWhatsAppNotification({ isGroup: true, target: adminGroup, message: adminMessage });
      }
      
      // Send to store admin
      if(currentUser.whatsapp) {
        const formattedPhone = currentUser.whatsapp.startsWith('0') ? `62${currentUser.whatsapp.substring(1)}` : currentUser.whatsapp;
        await sendWhatsAppNotification({ target: formattedPhone, message: userMessage });
      }

      setDialogOpen(false);
    } catch (error) {
      console.error('Top-up submission error:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Mengirim Pengajuan',
        description: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        toast({ title: "Nomor Rekening Disalin!" });
    }, (err) => {
        toast({ variant: 'destructive', title: "Gagal menyalin" });
        console.error('Could not copy text: ', err);
    });
  };

  const getStatusBadge = (status: TopUpRequest['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className='bg-yellow-500/20 text-yellow-700 border-yellow-500/50'>Pending</Badge>;
      case 'completed': return <Badge variant="secondary" className='bg-green-500/20 text-green-700 border-green-500/50'>Selesai</Badge>;
      case 'rejected': return <Badge variant="destructive">Ditolak</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  }
  
  const topUpOptions = [50000, 100000, 200000, 500000];

  return (
    <DialogContent className="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle className="font-headline tracking-wider">Top Up Pradana Token</DialogTitle>
        <DialogDescription>
          Ajukan penambahan saldo token untuk toko Anda. Saldo akan otomatis bertambah setelah pembayaran diverifikasi.
        </DialogDescription>
      </DialogHeader>
      <div className="grid md:grid-cols-2 gap-6 py-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Banknote />
                Ajukan Top Up Baru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                  <p className="text-sm text-muted-foreground mb-2">Silakan transfer ke rekening berikut:</p>
                  {bankSettings ? (
                    <Card className="bg-secondary/50">
                        <CardContent className="p-4 space-y-2">
                           <div className="text-lg font-bold">{bankSettings.bankName}</div>
                           <div className="flex items-center justify-between">
                             <div className="font-mono text-xl text-primary">{bankSettings.accountNumber}</div>
                             <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(bankSettings.accountNumber)}>
                               <Copy className="h-4 w-4"/>
                             </Button>
                           </div>
                           <div className="text-sm">a/n {bankSettings.accountHolder}</div>
                        </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-1">
                      <Skeleton className="h-24 w-full" />
                    </div>
                  )}
               </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah Top Up (Rp)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min="10000"
                  step="10000"
                  disabled={isLoading}
                />
                <div className="flex flex-wrap gap-2 pt-2">
                    {topUpOptions.map(option => (
                        <Button
                            key={option}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAmount(option)}
                        >
                            {option / 1000} Token
                        </Button>
                    ))}
                </div>
              </div>
              <Card className="bg-primary/10 border-primary/30">
                <CardHeader className="p-4">
                  <CardDescription>Total yang harus ditransfer (termasuk kode unik)</CardDescription>
                  <CardTitle className="text-3xl font-mono text-primary">
                    Rp {(amount + uniqueCode).toLocaleString('id-ID')}
                  </CardTitle>
                </CardHeader>
              </Card>
              <div className="space-y-2">
                <Label htmlFor="proof">Unggah Bukti Transfer</Label>
                <Input
                  id="proof"
                  type="file"
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, application/pdf"
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !proofFile}>
                {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                Kirim Pengajuan
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <History />
                Riwayat Top Up
            </CardTitle>
             <CardDescription>Daftar 5 pengajuan top up terakhir Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history.slice(0, 5).map(item => (
                        <TableRow key={item.id}>
                            <TableCell>{format(new Date(item.requestedAt), 'dd/MM/yy HH:mm')}</TableCell>
                            <TableCell className="font-mono">Rp {item.totalAmount.toLocaleString('id-ID')}</TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DialogContent>
  );
}
