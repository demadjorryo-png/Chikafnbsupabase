'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { receiptSettings as initialSettings, updateReceiptSettings } from '@/lib/receipt-settings';
import { Receipt } from 'lucide-react';

export default function ReceiptSettings() {
  const [headerText, setHeaderText] = React.useState(initialSettings.headerText);
  const [footerText, setFooterText] = React.useState(initialSettings.footerText);
  const [promoText, setPromoText] = React.useState(initialSettings.promoText);
  const { toast } = useToast();

  const handleSaveChanges = () => {
    updateReceiptSettings({
      headerText,
      footerText,
      promoText,
    });
    toast({
      title: 'Pengaturan Struk Disimpan!',
      description: 'Perubahan Anda akan langsung diterapkan pada cetakan struk berikutnya.',
    });
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline tracking-wider">
            Pengaturan Struk (Receipt Settings)
          </CardTitle>
          <CardDescription>
            Sesuaikan konten yang muncul pada struk belanja pelanggan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="header-text">Header Struk</Label>
            <Textarea
              id="header-text"
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder="Nama Toko&#10;Alamat Toko&#10;No. Telepon"
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              Masukkan nama toko, alamat, dan info kontak. Gunakan baris baru untuk setiap informasi.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="promo-text">Info Promo Singkat</Label>
            <Textarea
              id="promo-text"
              value={promoText}
              onChange={(e) => setPromoText(e.target.value)}
              placeholder="Contoh: Beli 2 Liquid Gratis 1!"
              rows={2}
            />
            <p className="text-sm text-muted-foreground">
              Teks ini akan muncul di bawah rincian total belanja.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="footer-text">Footer Struk</Label>
            <Textarea
              id="footer-text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Contoh: Terima kasih, selamat nge-vape!"
              rows={3}
            />
             <p className="text-sm text-muted-foreground">
              Pesan penutup atau ucapan terima kasih untuk pelanggan.
            </p>
          </div>
          <Button onClick={handleSaveChanges}>
            <Receipt className="mr-2 h-4 w-4" />
            Simpan Perubahan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
