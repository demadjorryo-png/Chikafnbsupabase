
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Building2, Users, Loader, Save } from 'lucide-react';
import type { Store, User } from '@/lib/types';
import { getTransactionFeeSettings, defaultFeeSettings } from '@/lib/app-settings';
import type { TransactionFeeSettings } from '@/lib/app-settings';
import { getLoginPromoSettings, defaultLoginPromoSettings } from '@/lib/login-promo-settings';
import type { LoginPromoSettings } from '@/lib/login-promo-settings';
import { getWhatsappSettings, defaultWhatsappSettings } from '@/lib/whatsapp-settings';
import type { WhatsappSettings } from '@/lib/whatsapp-settings';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';


type PlatformControlProps = {
    allStores: Store[];
    allUsers: User[];
    isLoading: boolean;
};

export default function PlatformControl({ allStores, allUsers, isLoading }: PlatformControlProps) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState<Record<string, boolean>>({});

    const [feeSettings, setFeeSettings] = React.useState<TransactionFeeSettings>(defaultFeeSettings);
    const [promoSettings, setPromoSettings] = React.useState<LoginPromoSettings>(defaultLoginPromoSettings);
    const [whatsappSettings, setWhatsappSettings] = React.useState<WhatsappSettings>(defaultWhatsappSettings);

    const totalStores = allStores.length;
    const totalUsers = allUsers.length;

    React.useEffect(() => {
        if (!isLoading) {
            getTransactionFeeSettings().then(setFeeSettings);
            getLoginPromoSettings().then(setPromoSettings);
            getWhatsappSettings().then(setWhatsappSettings);
        }
    }, [isLoading]);

    const handleSettingsChange = (setter: React.Dispatch<React.SetStateAction<any>>, field: string, value: string | number) => {
        setter((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSave = async (settingsName: 'fees' | 'promo' | 'whatsapp', settingsData: any, docName: string) => {
        setIsSaving(prev => ({ ...prev, [settingsName]: true }));
        try {
            await setDoc(doc(db, 'appSettings', docName), settingsData, { merge: true });
            toast({
                title: 'Pengaturan Disimpan!',
                description: `Pengaturan untuk ${settingsName} telah berhasil diperbarui secara global.`
            });
        } catch (error) {
            console.error(`Error saving ${settingsName} settings:`, error);
            toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
        } finally {
            setIsSaving(prev => ({ ...prev, [settingsName]: false }));
        }
    };
    
    if (isLoading) {
        return <Skeleton className="h-96 w-full" />
    }

    return (
        <div className="grid gap-6">
            {/* Metric Cards */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Toko Terdaftar</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStores}</div>
                        <p className="text-xs text-muted-foreground">Jumlah seluruh toko yang menggunakan platform.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUsers}</div>
                        <p className="text-xs text-muted-foreground">Jumlah admin dan kasir yang terdaftar.</p>
                    </CardContent>
                </Card>
            </div>
            
            {/* Settings Cards */}
            <div className="grid gap-6 lg:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline tracking-wider">Pengaturan Biaya Transaksi & AI</CardTitle>
                        <CardDescription>Atur biaya yang berlaku untuk semua toko.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="tokenValueRp">Nilai 1 Token (Rp)</Label>
                                <Input id="tokenValueRp" type="number" value={feeSettings.tokenValueRp} onChange={(e) => handleSettingsChange(setFeeSettings, 'tokenValueRp', Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="aiUsageFee">Biaya AI (Token)</Label>
                                <Input id="aiUsageFee" type="number" value={feeSettings.aiUsageFee} onChange={(e) => handleSettingsChange(setFeeSettings, 'aiUsageFee', Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="feePercentage">Persentase Biaya (%)</Label>
                                <Input id="feePercentage" type="number" step="0.001" value={feeSettings.feePercentage} onChange={(e) => handleSettingsChange(setFeeSettings, 'feePercentage', Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="minFeeRp">Biaya Minimum (Rp)</Label>
                                <Input id="minFeeRp" type="number" value={feeSettings.minFeeRp} onChange={(e) => handleSettingsChange(setFeeSettings, 'minFeeRp', Number(e.target.value))} />
                            </div>
                        </div>
                        <Button onClick={() => handleSave('fees', feeSettings, 'transactionFees')} disabled={isSaving['fees']}>
                            {isSaving['fees'] ? <Loader className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            Simpan Pengaturan Biaya
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline tracking-wider">Pengaturan Promo Halaman Login</CardTitle>
                        <CardDescription>Ubah teks promosi yang muncul di halaman login.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="promoTitle">Judul Promo</Label>
                            <Input id="promoTitle" value={promoSettings.title} onChange={(e) => handleSettingsChange(setPromoSettings, 'title', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="promoLine1">Baris 1</Label>
                            <Textarea id="promoLine1" value={promoSettings.line1} onChange={(e) => handleSettingsChange(setPromoSettings, 'line1', e.target.value)} rows={2}/>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="promoLine2">Baris 2</Label>
                            <Textarea id="promoLine2" value={promoSettings.line2} onChange={(e) => handleSettingsChange(setPromoSettings, 'line2', e.target.value)} rows={2}/>
                        </div>
                        <Button onClick={() => handleSave('promo', promoSettings, 'loginPromo')} disabled={isSaving['promo']}>
                            {isSaving['promo'] ? <Loader className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            Simpan Pengaturan Promo
                        </Button>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline tracking-wider">Pengaturan Notifikasi WhatsApp</CardTitle>
                        <CardDescription>Konfigurasi webhook WhaCenter untuk notifikasi.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="waDeviceId">Device ID</Label>
                            <Input id="waDeviceId" value={whatsappSettings.deviceId} onChange={(e) => handleSettingsChange(setWhatsappSettings, 'deviceId', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="waAdminGroup">Grup Admin</Label>
                            <Input id="waAdminGroup" value={whatsappSettings.adminGroup} onChange={(e) => handleSettingsChange(setWhatsappSettings, 'adminGroup', e.target.value)} />
                        </div>
                        <Button onClick={() => handleSave('whatsapp', whatsappSettings, 'whatsappConfig')} disabled={isSaving['whatsapp']}>
                             {isSaving['whatsapp'] ? <Loader className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            Simpan Pengaturan WhatsApp
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
