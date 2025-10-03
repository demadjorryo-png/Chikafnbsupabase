
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar,
  BarChart,
} from 'recharts';
import { TrendingUp, DollarSign, Sparkles, Loader, ShoppingBag, Target, CheckCircle, FileDown, Calendar as CalendarIcon, TrendingDown, FileText, FileSpreadsheet } from 'lucide-react';
import { subMonths, format, startOfMonth, endOfMonth, isWithinInterval, formatISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import type { AppliedStrategy, Product, Transaction } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useDashboard } from '@/contexts/dashboard-context';
import { deductAiUsageFee } from '@/lib/app-settings';

const chartConfig = {
  revenue: {
    label: 'Pendapatan',
    color: 'hsl(var(--primary))',
  },
};

interface AdminOverviewProps {
    transactions: Transaction[];
    products: Product[];
}

export default function AdminOverview({ transactions, products }: AdminOverviewProps) {
  const { activeStore, pradanaTokenBalance, refreshPradanaTokenBalance } = useAuth();
  const { dashboardData, feeSettings, refreshData } = useDashboard();
  const [recommendations, setRecommendations] = React.useState<{ weeklyRecommendation: string; monthlyRecommendation: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [appliedStrategies, setAppliedStrategies] = React.useState<AppliedStrategy[]>([]);
  const [exportDate, setExportDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  
  const { toast } = useToast();

  const [dateFnsLocale, setDateFnsLocale] = React.useState<any | undefined>(undefined);
   React.useEffect(() => {
    import('date-fns/locale/id').then(locale => setDateFnsLocale(locale.default));
  }, []);

  React.useEffect(() => {
    if (!activeStore) return;
    const fetchStrategies = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'stores', activeStore.id, 'appliedStrategies'));
            const strategies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppliedStrategy));
            setAppliedStrategies(strategies);
        } catch (error) {
            console.error("Error fetching applied strategies:", error);
            toast({
                variant: 'destructive',
                title: 'Gagal memuat strategi',
                description: 'Tidak dapat mengambil data strategi yang sedang berjalan.'
            });
        }
    };
    fetchStrategies();
  }, [activeStore, toast]);


  const {
    monthlyGrowthData,
    storeMetrics,
    topProductsThisMonth,
    worstProductsThisMonth,
  } = React.useMemo(() => {
    const now = new Date();
    
    const monthlyData: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const targetMonth = subMonths(now, i);
      const start = startOfMonth(targetMonth);
      const end = endOfMonth(targetMonth);
      const monthName = format(targetMonth, 'MMM', { locale: idLocale });
      
      const monthlyRevenue = (transactions || [])
        .filter(t => isWithinInterval(new Date(t.createdAt), { start, end }))
        .reduce((sum, t) => sum + t.totalAmount, 0);
        
      monthlyData.push({ month: monthName, revenue: monthlyRevenue });
    }

    const totalRevenue = (transactions || []).reduce((sum, t) => sum + t.totalAmount, 0);
    
    const totalCost = (transactions || []).reduce((sum, t) => {
      return sum + t.items.reduce((itemSum, item) => {
        const product = (products || []).find(p => p.id === item.productId);
        return itemSum + ((product?.costPrice || 0) * item.quantity);
      }, 0);
    }, 0);

    const grossProfit = totalRevenue - totalCost;

    const thisMonthTransactions = (transactions || []).filter(t => isWithinInterval(new Date(t.createdAt), { start: startOfMonth(now), end: endOfMonth(now) }));

    const calculateProductSales = (txs: any[]) => {
      const sales: Record<string, number> = {};
      txs.forEach(t => {
          t.items.forEach((item: { productName: string; quantity: number; }) => {
              if (!sales[item.productName]) {
                  sales[item.productName] = 0;
              }
              sales[item.productName] += item.quantity;
          });
      });
      return Object.entries(sales).sort(([, a], [, b]) => b - a);
    };

    const sortedProductsThisMonth = calculateProductSales(thisMonthTransactions);

    return {
      monthlyGrowthData: monthlyData,
      storeMetrics: { totalRevenue, grossProfit },
      topProductsThisMonth: sortedProductsThisMonth.slice(0, 3),
      worstProductsThisMonth: sortedProductsThisMonth.slice(-3).reverse(),
    };
  }, [transactions, products, idLocale]);

  const handleGenerateRecommendations = async () => {
    if (!activeStore || !feeSettings) return;
    try {
      await deductAiUsageFee(pradanaTokenBalance, feeSettings, activeStore.id, toast);
    } catch (error) {
      return;
    }
    
    setIsLoading(true);
    setRecommendations(null);
    const thisMonthRevenue = monthlyGrowthData[monthlyGrowthData.length - 1]?.revenue || 0;
    const lastMonthRevenue = monthlyGrowthData[monthlyGrowthData.length - 2]?.revenue || 0;

    try {
        const response = await fetch('/api/recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                totalRevenueLastWeek: thisMonthRevenue / 4,
                totalRevenueLastMonth: lastMonthRevenue,
                topSellingProducts: topProductsThisMonth.map(([name]) => name),
                worstSellingProducts: worstProductsThisMonth.map(([name]) => name),
            }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        setRecommendations(result);
        refreshPradanaTokenBalance();
    } catch (error) {
        console.error("Error generating recommendations:", error);
        toast({ variant: 'destructive', title: 'Gagal Mendapatkan Rekomendasi', description: 'Terjadi kesalahan saat berkomunikasi dengan AI.' });
    } finally {
        setIsLoading(false);
    }
  }

  const handleApplyStrategy = async (type: 'weekly' | 'monthly', recommendation: string) => {
    if (!activeStore) return;
    const newStrategyData = {
      type,
      recommendation,
      appliedDate: formatISO(new Date()),
      status: 'active' as const,
    };

    try {
        const docRef = await addDoc(collection(db, 'stores', activeStore.id, 'appliedStrategies'), newStrategyData);
        setAppliedStrategies(prev => [...prev, { id: docRef.id, ...newStrategyData }]);
        toast({
            title: 'Strategi Diterapkan!',
            description: `Strategi ${type} telah ditambahkan ke daftar lacak.`,
        });
    } catch (error) {
        console.error("Error applying strategy:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Menerapkan Strategi',
            description: 'Terjadi kesalahan saat menyimpan data ke Firestore.'
        });
    }
  };

  const handleCompleteStrategy = async (id: string) => {
    if (!activeStore) return;
    try {
        await deleteDoc(doc(db, 'stores', activeStore.id, 'appliedStrategies', id));
        setAppliedStrategies(prev => prev.filter(s => s.id !== id));
        toast({
            title: 'Strategi Selesai!',
            description: 'Strategi telah ditandai sebagai selesai dan dihapus dari daftar lacak.',
        });
    } catch (error) {
        console.error("Error completing strategy:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Menyelesaikan Strategi',
            description: 'Terjadi kesalahan saat menghapus data dari Firestore.'
        });
    }
  };

  const handleExport = (formatType: 'PDF' | 'Excel') => {
    toast({
        title: "Exporting Data (Simulation)",
        description: `Mempersiapkan export data ${formatType} untuk ${activeStore?.name} dari ${format(exportDate?.from!, 'PPP')} ke ${format(exportDate?.to!, 'PPP')}.`,
    })
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline tracking-wider">Pertumbuhan Pendapatan Bulanan</CardTitle>
          <CardDescription>Total pendapatan toko ini selama 6 bulan terakhir.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyGrowthData}>
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${Number(value) / 1000000} Jt`} />
              <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                  }}
                  formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Pendapatan']}
                />
              <Legend />
              <Line type="monotone" dataKey="revenue" name={chartConfig.revenue.label} stroke={chartConfig.revenue.color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline tracking-wider">Metrik Kinerja Toko</CardTitle>
                <CardDescription>Ringkasan performa toko ${activeStore?.name} secara keseluruhan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4 rounded-md border p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <DollarSign className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Omset (Semua Waktu)</p>
                        <p className="text-2xl font-bold">Rp {storeMetrics.totalRevenue.toLocaleString('id-ID')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 rounded-md border p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Estimasi Laba Kotor</p>
                        <p className="text-2xl font-bold">Rp {storeMetrics.grossProfit.toLocaleString('id-ID')}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="font-headline tracking-wider">Rekomendasi Bisnis Chika AI</CardTitle>
                <CardDescription>Dapatkan saran strategis mingguan dan bulanan untuk mendorong pertumbuhan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={handleGenerateRecommendations} disabled={isLoading || !feeSettings}>
                    {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {feeSettings ? `Buat Rekomendasi Baru (${feeSettings.aiUsageFee} Token)` : 'Memuat...'}
                </Button>

                {recommendations && (
                    <div className="space-y-4 pt-2">
                        <Card className="bg-background/50">
                            <CardHeader className='pb-2'>
                                <CardTitle className="font-semibold text-accent flex items-center gap-2"><Sparkles className="h-4 w-4" />Rekomendasi Mingguan</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p>{recommendations.weeklyRecommendation}</p>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" size="sm" onClick={() => handleApplyStrategy('weekly', recommendations.weeklyRecommendation)}><Target className="mr-2 h-4 w-4" /> Terapkan</Button>
                            </CardFooter>
                        </Card>
                        <Card className="bg-background/50">
                            <CardHeader className='pb-2'>
                                <CardTitle className="font-semibold text-primary flex items-center gap-2"><ShoppingBag className="h-4 w-4" />Rekomendasi Bulanan</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p>{recommendations.monthlyRecommendation}</p>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" size="sm" onClick={() => handleApplyStrategy('monthly', recommendations.monthlyRecommendation)}><Target className="mr-2 h-4 w-4" /> Terapkan</Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

       <div className="grid gap-6 md:grid-cols-2">
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline tracking-wider"><TrendingUp className="text-primary"/>Produk Terlaris</CardTitle>
                <CardDescription>Bulan ini, berdasarkan unit terjual</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {topProductsThisMonth.map(([name, quantity], index) => (
                        <li key={name} className="flex justify-between text-sm font-medium">
                            <span>{index + 1}. {name}</span>
                            <span className="font-mono">{quantity}x</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline tracking-wider"><TrendingDown className="text-destructive"/>Produk Kurang Laris</CardTitle>
                <CardDescription>Bulan ini, berdasarkan unit terjual</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {worstProductsThisMonth.map(([name, quantity], index) => (
                        <li key={name} className="flex justify-between text-sm font-medium">
                            <span>{index + 1}. {name}</span>
                            <span className="font-mono">{quantity}x</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
      </div>

       {appliedStrategies.length > 0 && (
         <Card>
            <CardHeader>
              <CardTitle className="font-headline tracking-wider">Strategi yang Sedang Berjalan</CardTitle>
              <CardDescription>Lacak efektivitas strategi yang sedang Anda terapkan.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {appliedStrategies.map(strategy => (
                <Card key={strategy.id} className="border-l-4 border-primary">
                  <CardHeader>
                    <CardTitle className="text-base capitalize">Strategi {strategy.type}</CardTitle>
                     <CardDescription>Diterapkan pada: {format(new Date(strategy.appliedDate), 'd MMMM yyyy')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{strategy.recommendation}</p>
                     <div className="mt-4 rounded-lg border bg-secondary/30 p-4">
                        <h4 className="font-semibold text-sm mb-2">Detail Pertumbuhan (Placeholder)</h4>
                        <p className="text-xs text-muted-foreground mb-2">Grafik ini akan menunjukkan metrik relevan sejak strategi diterapkan.</p>
                         <ChartContainer config={{}} className="h-[150px] w-full">
                            <BarChart accessibilityLayer data={[{'name': 'Before', value: 100}, {'name': 'After', value: 120}]}>
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false}/>
                                <ChartTooltipContent />
                                <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </div>
                  </CardContent>
                   <CardFooter className="flex justify-between">
                     <Button size="sm" variant="ghost" disabled>Lihat Pertumbuhan</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleCompleteStrategy(strategy.id)}><CheckCircle className="mr-2 h-4 w-4" /> Tandai Selesai</Button>
                  </CardFooter>
                </Card>
              ))}
            </CardContent>
          </Card>
      )}

      <Card>
        <CardHeader>
            <CardTitle className="font-headline tracking-wider">Export Data Penjualan</CardTitle>
            <CardDescription>Unduh data transaksi dari toko ${activeStore?.name} untuk analisis lebih lanjut.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <div className="grid gap-2 w-full sm:w-auto">
                <Label>Pilih Periode</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-full sm:w-[300px] justify-start text-left font-normal",
                        !exportDate && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {exportDate?.from ? (
                        exportDate.to ? (
                            <>
                            {format(exportDate.from, "LLL dd, y")} -{" "}
                            {format(exportDate.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(exportDate.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Pick a date</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={exportDate?.from}
                        selected={exportDate}
                        onSelect={setExportDate}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="flex w-full sm:w-auto self-end gap-2">
                 <Button onClick={() => handleExport('PDF')} className="w-full">
                    <FileText className="mr-2 h-4 w-4" />
                    Export PDF
                </Button>
                 <Button onClick={() => handleExport('Excel')} className="w-full" variant="outline">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export Excel
                </Button>
            </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
