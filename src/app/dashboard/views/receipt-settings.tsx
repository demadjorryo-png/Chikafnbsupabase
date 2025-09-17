'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  receiptSettings as initialSettings,
  updateReceiptSettings,
} from '@/lib/receipt-settings';
import { Loader, Receipt, Sparkles, WandSparkles } from 'lucide-react';
import { getReceiptPromo } from '@/ai/flows/receipt-promo-generator';
import type { RedemptionOption } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type ReceiptSettingsProps = {
  redemptionOptions: RedemptionOption[];
};

export default function ReceiptSettings({ redemptionOptions }: ReceiptSettingsProps) {
  const [headerText, setHeaderText] = React.useState(
    initialSettings.headerText
  );
  const [footerText, setFooterText] = React.useState(
    initialSettings.footerText
  );
  const [promoText, setPromoText] = React.useState(initialSettings.promoText);
  const [generatedPromo, setGeneratedPromo] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const { toast } = useToast();

  const handleSaveChanges = () => {
    updateReceiptSettings({
      headerText,
      footerText,
      promoText,
    });
    toast({
      title: 'Pengaturan Struk Disimpan!',
      description:
        'Perubahan Anda akan langsung diterapkan pada cetakan struk berikutnya.',
    });
  };

  const handleGeneratePromo = async () => {
    setIsGenerating(true);
    setGeneratedPromo('');
    try {
      const activePromos = redemptionOptions
        .filter((o) => o.isActive)
        .map((o) => o.description);

      const result = await getReceiptPromo({ activePromotions: activePromos });
      setGeneratedPromo(result.promoText);
    } catch (error) {
      console.error('Error generating receipt promo:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Membuat Promo',
        description: 'Chika AI tidak dapat membuat teks promo saat ini.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyPromo = () => {
    if (generatedPromo) {
      setPromoText(generatedPromo);
      setGeneratedPromo(''); // Clear after applying
      toast({
        title: 'Teks Promo Diterapkan!',
        description: 'Jangan lupa simpan perubahan Anda.',
      });
    }
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
              Masukkan nama toko, alamat, dan info kontak. Gunakan baris baru
              untuk setiap informasi.
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

          <Card className="bg-secondary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <WandSparkles />
                Butuh Ide Promo?
              </CardTitle>
              <CardDescription>
                Biarkan Chika AI membuat teks promo singkat berdasarkan promo
                aktif Anda saat ini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGeneratePromo}
                disabled={isGenerating}
                variant="outline"
              >
                {isGenerating ? (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate with Chika AI
              </Button>
              {generatedPromo && (
                <div className="mt-4 space-y-4">
                  <Alert className="border-accent bg-accent/10">
                    <Sparkles className="h-4 w-4 !text-accent" />
                    <AlertTitle className="font-semibold text-accent">
                      Saran Teks Promo:
                    </AlertTitle>
                    <AlertDescription>"{generatedPromo}"</AlertDescription>
                  </Alert>
                  <div className="flex gap-2">
                    <Button onClick={handleApplyPromo}>Terapkan</Button>
                    <Button variant="ghost" onClick={handleGeneratePromo} disabled={isGenerating}>
                      Generate Ulang
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
