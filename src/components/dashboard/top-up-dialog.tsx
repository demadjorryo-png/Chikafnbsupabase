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
import { supabase } from '@/lib/supabaseClient';
import type { TopUpRequest } from '@/lib/types';
// Hapus import { sendWhatsAppNotification } from '@/ai/flows/whatsapp-notification';
// Hapus import { getWhatsappSettings } from '@/lib/whatsapp-settings';
import { getBankAccountSettings, type BankAccountSettings } from '@/lib/bank-account-settings';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';

interface WhatsappSettings {
  deviceId: string;
  adminGroup: string; // The group name or ID for admin notifications
}

type TopUpDialogProps = {
  setDialogOpen: (open: boolean) => void;
};

export function TopUpDialog({ setDialogOpen }: TopUpDialogProps) {
  const { activeStore, currentUser } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = React.useState(50000);
  const [uniqueCode, setUniqueCode] = React.useState(0);
  const [proofFile, setProofFile] = React.useState<File | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [history, setHistory] = React.useState<TopUpRequest[]>([]);
  const [bankSettings, setBankSettings] = React.useState<BankAccountSettings | null>(null);

  React.useEffect(() => {
    // Generate unique code only on the client-side to prevent hydration mismatch
    setUniqueCode(Math.floor(Math.random() * 900) + 100);
    getBankAccountSettings().then(setBankSettings);
  }, []);

  React.useEffect(() => {
    if (!activeStore) return;
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('top_up_requests')
        .select('*')
        .eq('store_id', activeStore.id)
        .order('requested_at', { ascending: false })
      if (!error && data) {
        setHistory(
          data.map((d: any) => ({
            id: d.id,
            storeId: d.store_id,
            storeName: d.store_name,
            userId: d.user_id,
            userName: d.user_name,
            amount: Number(d.amount || 0),
            uniqueCode: Number(d.unique_code || 0),
            totalAmount: Number(d.total_amount || 0),
            proofUrl: d.proof_url,
            status: d.status,
            requestedAt: new Date(d.requested_at).toISOString(),
            processedAt: d.processed_at ? new Date(d.processed_at).toISOString() : undefined,
          }))
        )
      }
    }
    fetchHistory()
  }, [activeStore])

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
      // 1. Upload proof to Supabase Storage
      const filePath = `${activeStore.id}/${Date.now()}-${proofFile.name}`
      const { error: upErr } = await supabase.storage.from('topup-proofs').upload(filePath, proofFile, { upsert: true })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('topup-proofs').getPublicUrl(filePath)
      const proofUrl = pub.publicUrl

      // 2. Save request to Supabase
      const totalAmount = amount + uniqueCode
      const { error: insErr } = await supabase.from('top_up_requests').insert({
        store_id: activeStore.id,
        store_name: activeStore.name,
        user_id: currentUser.id,
        user_name: currentUser.name,
        amount,
        unique_code: uniqueCode,
        total_amount: totalAmount,
        proof_url: proofUrl,
        status: 'pending',
        requested_at: new Date().toISOString(),
      })
      if (insErr) throw insErr
      
      toast({
        title: 'Pengajuan Top Up Terkirim!',
        description: `Pengajuan sebesar Rp ${totalAmount.toLocaleString('id-ID')} sedang diproses.`,
      });
      
      // Hapus bagian pengiriman notifikasi WhatsApp
      // Ini harus dilakukan oleh Cloud Function atau API Route di sisi server.
      /*
      try {
        const whatsappSettingsResponse = await fetch('/api/whatsapp-settings?storeId=platform');
        if (whatsappSettingsResponse.ok) {
          const settings: WhatsappSettings = await whatsappSettingsResponse.json();
          if (settings.adminGroup) {
              const adminMessage = `*PENGAJUAN TOP UP BARU*\nToko: *${activeStore.name}*\nAdmin: *${currentUser.name}*\nJumlah: *Rp ${totalAmount.toLocaleString('id-ID')}*\nStatus: *Pending*\n\nMohon untuk segera diverifikasi melalui panel Superadmin.\nLihat bukti: ${proofUrl}`;

              const userMessage = `Halo *${currentUser.name}*, pengajuan top up Pradana Token Anda untuk toko *${activeStore.name}* sebesar *Rp ${totalAmount.toLocaleString('id-ID')}* telah berhasil kami terima dan sedang dalam proses verifikasi.`;

              if(settings.adminGroup) {
                 // await sendWhatsAppNotification({ isGroup: true, target: settings.adminGroup, message: adminMessage });
              }
              
              if(currentUser.whatsapp) {
                const formattedPhone = currentUser.whatsapp.startsWith('0') ? `62${currentUser.whatsapp.substring(1)}` : currentUser.whatsapp;
                // await sendWhatsAppNotification({ target: formattedPhone, message: userMessage });
              }
          }
        } else {
          console.error("Failed to fetch WhatsApp settings from API route.");
        }
      } catch (notificationError) {
          console.error('Failed to send WhatsApp notification:', notificationError);
      }
      */

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
                  min="50000"
                  step="50000"
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
                    Rp ${(amount + uniqueCode).toLocaleString('id-ID')}
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
