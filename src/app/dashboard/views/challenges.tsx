
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateChallenges } from '@/ai/flows/challenge-generator';
import type { ChallengeGeneratorOutput } from '@/ai/flows/challenge-generator';
import { Loader, Sparkles, Trophy, Save, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useDashboard } from '@/contexts/dashboard-context';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { AIConfirmationDialog } from '@/components/dashboard/ai-confirmation-dialog';

export default function Challenges() {
  const { currentUser, activeStore } = useAuth();
  const { dashboardData, refreshData } = useDashboard();
  const feeSettings = dashboardData?.feeSettings;
  const { toast } = useToast();

  const [budget, setBudget] = React.useState(500000);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 30),
  });
  const [isSaving, setIsSaving] = React.useState(false);
  const [generatedChallenges, setGeneratedChallenges] = React.useState<ChallengeGeneratorOutput | null>(null);

  const handleGenerateChallenges = async () => {
    if (!activeStore || !currentUser || !feeSettings) {
        toast({ variant: 'destructive', title: 'Error', description: 'Data tidak lengkap untuk membuat tantangan.'});
        throw new Error('Incomplete data');
    }

    if (budget <= 0) {
      toast({
        variant: 'destructive',
        title: 'Anggaran Tidak Valid',
        description: 'Silakan masukkan anggaran lebih besar dari nol.',
      });
      throw new Error('Invalid budget');
    }
    if (!date?.from || !date?.to) {
        toast({
            variant: 'destructive',
            title: 'Tanggal Tidak Valid',
            description: 'Silakan pilih tanggal mulai dan selesai.',
        });
        throw new Error('Invalid date');
    }
    
    setGeneratedChallenges(null);
    return generateChallenges({
        budget,
        startDate: format(date.from, 'yyyy-MM-dd'),
        endDate: format(date.to, 'yyyy-MM-dd'),
        activeStoreName: activeStore.name,
        businessDescription: activeStore.businessDescription || 'bisnis',
    });
  };

  const handleSaveChallenges = async () => {
    if (!generatedChallenges || !activeStore) return;

    setIsSaving(true);
    try {
      // Create a single challenge period document
      await addDoc(collection(db, 'stores', activeStore.id, 'challengePeriods'), {
        startDate: format(date?.from || new Date(), 'yyyy-MM-dd'),
        endDate: format(date?.to || new Date(), 'yyyy-MM-dd'),
        period: generatedChallenges.period,
        challenges: generatedChallenges.challenges, // Save challenges as a sub-array
        isActive: true,
        createdAt: new Date().toISOString(),
      });
      
      toast({ title: 'Tantangan Berhasil Disimpan!', description: 'Periode tantangan baru kini aktif untuk karyawan.' });
      setGeneratedChallenges(null);
      refreshData(); // Refresh dashboard data
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
              <CardDescription>
                Tetapkan anggaran hadiah dan rentang tanggal. Chika AI akan membuat tantangan penjualan
                yang memotivasi berdasarkan total pendapatan (omset) untuk periode tersebut.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">Anggaran Hadiah (Rp)</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    placeholder="e.g., 500000"
                    step="50000"
                  />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="date">Periode Tantangan</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                            date.to ? (
                                <>
                                {format(date.from, "LLL dd, y")} -{" "}
                                {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Pilih tanggal</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                </div>
              </div>
              <div className="pt-2">
                 <AIConfirmationDialog
                    featureName="Tantangan Karyawan"
                    featureDescription="Anda akan membuat satu set tantangan penjualan berjenjang untuk karyawan berdasarkan anggaran dan periode yang Anda tentukan."
                    feeSettings={feeSettings}
                    onConfirm={handleGenerateChallenges}
                    onSuccess={setGeneratedChallenges}
                 >
                    <Button className="w-full" disabled={!feeSettings}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Buat dengan Chika AI
                    </Button>
                </AIConfirmationDialog>
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
                        <Trophy className='w-4 h-4 text-primary'/>
                        {challenge.tier}
                      </CardTitle>
                      <CardDescription>{challenge.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-2">
                        <div>
                            <p className="text-xs text-muted-foreground">Target Omset</p>
                            <p className="font-semibold text-lg">Rp {challenge.target.toLocaleString('id-ID')}</p>
                        </div>
                         <div>
                            <p className="text-xs text-muted-foreground">Hadiah</p>
                            <p className="font-semibold text-accent">{challenge.reward}</p>
                        </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
                <CardFooter className='flex justify-end p-6'>
                    <Button onClick={handleSaveChallenges} disabled={isSaving}>
                        {isSaving ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Simpan & Aktifkan
                    </Button>
                </CardFooter>
            </Card>
          )}
      </div>
    </div>
  );
}
