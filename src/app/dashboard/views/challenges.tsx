
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateChallenges } from '@/ai/flows/challenge-generator';
import type { Challenge } from '@/lib/types';
import { Loader, Sparkles, Trophy, Save } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useDashboard } from '@/contexts/dashboard-context';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { deductAiUsageFee } from '@/lib/app-settings';

type GeneratedChallenges = {
  period: string;
  challenges: Omit<Challenge, 'id' | 'storeId' | 'isActive'>[];
};

export default function Challenges() {
  const { currentUser, activeStore, pradanaTokenBalance, refreshPradanaTokenBalance } = useAuth();
  const { dashboardData, refreshData } = useDashboard();
  const feeSettings = dashboardData?.feeSettings;
  const { toast } = useToast();

  const [challengeType, setChallengeType] = React.useState('transaksi');
  const [target, setTarget] = React.useState(100);
  const [reward, setReward] = React.useState(50000);
  const [duration, setDuration] = React.useState('mingguan');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [generatedChallenges, setGeneratedChallenges] = React.useState<GeneratedChallenges | null>(null);

  const handleGenerateChallenges = async () => {
    if (!activeStore || !currentUser || !feeSettings) return;

    try {
      await deductAiUsageFee(pradanaTokenBalance, feeSettings, activeStore.id, toast);
    } catch (error) {
      return; // Stop if fee deduction fails
    }

    setIsLoading(true);
    setGeneratedChallenges(null);
    try {
      const result = await generateChallenges({
        storeName: activeStore.name,
        staffName: currentUser.name,
        challengeType,
        target: String(target),
        reward: String(reward),
        duration,
      });
      setGeneratedChallenges(result);
      refreshPradanaTokenBalance();
    } catch (error) {
      console.error('Error generating challenges:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Membuat Tantangan',
        description: 'Terjadi kesalahan saat berkomunikasi dengan AI. Coba lagi.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChallenges = async () => {
    if (!generatedChallenges || !activeStore) return;

    setIsSaving(true);
    try {
      const challengesCollection = collection(db, 'stores', activeStore.id, 'challenges');
      for (const challenge of generatedChallenges.challenges) {
        await addDoc(challengesCollection, {
          ...challenge,
          storeId: activeStore.id,
          isActive: true, // Automatically activate new challenges
          createdAt: new Date().toISOString(),
        });
      }
      toast({ title: 'Tantangan Berhasil Disimpan!', description: 'Tantangan baru kini aktif untuk karyawan.' });
      setGeneratedChallenges(null);
      refreshData(); // Refresh dashboard data to show new challenges
    } catch (error) {
      console.error('Error saving challenges:', error);
      toast({ variant: 'destructive', title: 'Gagal Menyimpan Tantangan' });
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="grid gap-6">
      <div className='grid md:grid-cols-2 gap-6'>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline tracking-wider">Generator Tantangan AI</CardTitle>
              <CardDescription>Buat tantangan penjualan untuk tim Anda dengan bantuan Chika AI.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="challenge-type">Jenis Tantangan</Label>
                    <Input id="challenge-type" value={challengeType} onChange={(e) => setChallengeType(e.target.value)} placeholder="e.g., transaksi" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Durasi</Label>
                    <Input id="duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g., mingguan" />
                  </div>
              </div>
               <div className="space-y-2">
                <Label htmlFor="target">Target</Label>
                <Input id="target" type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} placeholder="e.g., 100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward">Hadiah (Poin)</Label>
                <Input id="reward" type="number" value={reward} onChange={(e) => setReward(Number(e.target.value))} placeholder="e.g., 50000" />
              </div>
              <div className="pt-2">
                 <Button 
                    onClick={handleGenerateChallenges} 
                    disabled={isLoading || !feeSettings}
                    className="w-full"
                 >
                  {isLoading ? (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {feeSettings ? `Buat dengan Chika AI (${feeSettings.aiUsageFee} Token)` : 'Memuat...'}
                </Button>
              </div>
            </CardContent>
          </Card>
          {generatedChallenges && (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline tracking-wider">
                  Draf Tantangan yang Dihasilkan
                </CardTitle>
                <CardDescription>
                  Tantangan untuk periode: <span className='font-semibold'>{generatedChallenges.period}</span>. Simpan untuk mengaktifkannya.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {generatedChallenges.challenges.map((challenge, index) => (
                  <Card key={index} className="flex flex-col">
                    <CardHeader>
                      <CardTitle className='text-base flex items-center gap-2'>
                        <Trophy className='w-4 h-4'/>
                        {challenge.title}
                      </CardTitle>
                      <CardDescription>{challenge.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <div className='text-sm space-y-1'>
                            <p><span className='font-semibold'>Target:</span> {challenge.target.toLocaleString('id-ID')}</p>
                            <p><span className='font-semibold'>Hadiah:</span> {challenge.rewardPoints.toLocaleString('id-ID')} poin</p>
                        </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
                <div className='flex justify-end p-6'>
                    <Button onClick={handleSaveChallenges} disabled={isSaving}>
                        {isSaving ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Simpan & Aktifkan Tantangan
                    </Button>
                </div>
            </Card>
          )}
      </div>
    </div>
  );
}
