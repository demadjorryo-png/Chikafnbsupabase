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
import { stores, transactions, products } from '@/lib/data';
import { TrendingUp, DollarSign, Package, Sparkles, Loader, ShoppingBag, History, Target, CheckCircle, FileDown, Calendar as CalendarIcon, TrendingDown } from 'lucide-react';
import { subMonths, format, startOfMonth, endOfMonth, isWithinInterval, formatISO, addDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { getAdminRecommendations } from '@/ai/flows/admin-recommendation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const chartConfig = {
  revenue: {
    label: 'Pendapatan',
    color: 'hsl(var(--primary))',
  },
};

type AppliedStrategy = {
  id: string;
  type: 'weekly' | 'monthly';
  recommendation: string;
  appliedDate: string;
  status: 'active' | 'completed';
};

export default function AdminOverview() {
  const [recommendations, setRecommendations] = React.useState<{ weeklyRecommendation: string; monthlyRecommendation: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [appliedStrategies, setAppliedStrategies] = React.useState<AppliedStrategy[]>([]);
  const [exportDate, setExportDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [exportStore, setExportStore] = React.useState<string>('all');
  const { toast } = useToast();

  const { monthlyGrowthData, storeStats, topProducts, worstProducts } = React.useMemo(() => {
    // Monthly Growth Data
    const now = new Date();
    const monthlyData: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const targetMonth = subMonths(now, i);
      const start = startOfMonth(targetMonth);
      const end = endOfMonth(targetMonth);
      const monthName = format(targetMonth, 'MMM', { locale: idLocale });
      
      const monthlyRevenue = transactions
        .filter(t => isWithinInterval(new Date(t.createdAt), { start, end }))
        .reduce((sum, t) => sum + t.totalAmount, 0);
        
      monthlyData.push({ month: monthName, revenue: monthlyRevenue });
    }

    // Store Stats
    const stats = stores.map(store => {
      const storeTransactions = transactions.filter(t => t.storeId === store.id);
      const totalRevenue = storeTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
      
      const totalCost = storeTransactions.reduce((sum, t) => {
        return sum + t.items.reduce((itemSum, item) => {
          const product = products.find(p => p.id === item.productId);
          return itemSum + ((product?.costPrice || 0) * item.quantity);
        }, 0);
      }, 0);

      const grossProfit = totalRevenue - totalCost;

      return {
        ...store,
        totalRevenue,
        grossProfit,
      };
    });

    // Top and Worst Products
    const productSales: Record<string, number> = {};
    transactions.forEach(t => {
        t.items.forEach(item => {
            if (!productSales[item.productName]) {
                productSales[item.productName] = 0;
            }
            productSales[item.productName] += item.quantity;
        });
    });

    const sortedProducts = Object.entries(productSales).sort(([, a], [, b]) => b - a);
    const top = sortedProducts.slice(0, 3).map(([name]) => name);
    const worst = sortedProducts.slice(-3).map(([name]) => name);


    return { monthlyGrowthData: monthlyData, storeStats: stats, topProducts: top, worstProducts: worst };
  }, []);

  const handleGenerateRecommendations = async () => {
    setIsLoading(true);
    setRecommendations(null);
    try {
        const result = await getAdminRecommendations({
            totalRevenueLastWeek: 5000000, // Dummy data for now
            totalRevenueLastMonth: 20000000, // Dummy data for now
            topSellingProducts: topProducts,
            worstSellingProducts: worstProducts,
        });
        setRecommendations(result);
    } catch (error) {
        console.error("Error generating recommendations:", error);
    } finally {
        setIsLoading(false);
    }
  }

  const handleApplyStrategy = (type: 'weekly' | 'monthly', recommendation: string) => {
    const newStrategy: AppliedStrategy = {
      id: `strat_${Date.now()}`,
      type,
      recommendation,
      appliedDate: formatISO(new Date()),
      status: 'active',
    };
    setAppliedStrategies(prev => [...prev, newStrategy]);
    toast({
        title: 'Strategi Diterapkan!',
        description: `Strategi ${type} telah ditambahkan ke daftar lacak.`,
    });
  };

  const handleCompleteStrategy = (id: string) => {
    setAppliedStrategies(prev => prev.filter(s => s.id !== id));
     toast({
        title: 'Strategi Selesai!',
        description: 'Strategi telah ditandai sebagai selesai.',
    });
  };

  const handleExport = () => {
    toast({
        title: "Exporting Data (Simulation)",
        description: `Preparing to export data for ${stores.find(s => s.id === exportStore)?.name || 'All Stores'} from ${format(exportDate?.from!, 'PPP')} to ${format(exportDate?.to!, 'PPP')}.`,
    })
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline tracking-wider">Pertumbuhan Pendapatan Bulanan</CardTitle>
          <CardDescription>Total pendapatan dari semua toko selama 6 bulan terakhir.</CardDescription>
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
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {storeStats.map(store => (
             <Card key={store.id}>
                <CardHeader>
                    <CardTitle className="font-headline tracking-wider">{store.name}</CardTitle>
                    <CardDescription>{store.location}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 rounded-md border p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <DollarSign className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Omset</p>
                            <p className="text-2xl font-bold">Rp {store.totalRevenue.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-md border p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Estimasi Laba Kotor</p>
                            <p className="text-2xl font-bold">Rp {store.grossProfit.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline tracking-wider"><TrendingUp className="text-primary"/>Produk Terlaris</CardTitle>
                <CardDescription>Bulan ini, berdasarkan unit terjual</CardDescription>
            </CardHeader>
            <CardContent>
                <ol className="list-decimal list-inside space-y-2">
                    {topProducts.map((product, index) => (
                        <li key={index} className="text-sm font-medium">{product}</li>
                    ))}
                </ol>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline tracking-wider"><TrendingDown className="text-destructive"/>Produk Kurang Laris</CardTitle>
                <CardDescription>Bulan ini, berdasarkan unit terjual</CardDescription>
            </CardHeader>
            <CardContent>
                <ol className="list-decimal list-inside space-y-2">
                    {worstProducts.map((product, index) => (
                        <li key={index} className="text-sm font-medium">{product}</li>
                    ))}
                </ol>
            </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle className="font-headline tracking-wider">Rekomendasi Bisnis Chika AI</CardTitle>
          <CardDescription>Dapatkan saran strategis mingguan dan bulanan untuk mendorong pertumbuhan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGenerateRecommendations} disabled={isLoading}>
            {isLoading ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Buat Rekomendasi Baru
          </Button>

          {recommendations && (
             <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <AlertTitle className="font-semibold text-accent flex items-center gap-2"><Sparkles className="h-4 w-4" />Rekomendasi Mingguan</AlertTitle>
                    </CardHeader>
                    <CardContent>
                        <AlertDescription>{recommendations.weeklyRecommendation}</AlertDescription>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" size="sm" onClick={() => handleApplyStrategy('weekly', recommendations.weeklyRecommendation)}><Target className="mr-2 h-4 w-4" /> Terapkan Strategi</Button>
                    </CardFooter>
                </Card>
                 <Card>
                    <CardHeader>
                        <AlertTitle className="font-semibold text-primary flex items-center gap-2"><ShoppingBag className="h-4 w-4" />Rekomendasi Bulanan</AlertTitle>
                    </CardHeader>
                    <CardContent>
                        <AlertDescription>{recommendations.monthlyRecommendation}</AlertDescription>
                    </CardContent>
                     <CardFooter>
                        <Button variant="outline" size="sm" onClick={() => handleApplyStrategy('monthly', recommendations.monthlyRecommendation)}><Target className="mr-2 h-4 w-4" /> Terapkan Strategi</Button>
                    </CardFooter>
                </Card>
             </div>
          )}
        </CardContent>
      </Card>
      
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
                    <CardTitle className="text-base capitalize">{strategy.type} Strategy</CardTitle>
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
            <CardDescription>Unduh data transaksi dalam format CSV untuk analisis lebih lanjut.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <div className="grid gap-2 w-full sm:w-auto">
                <Label>Pilih Toko</Label>
                <Select value={exportStore} onValueChange={setExportStore}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Pilih Toko" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Toko</SelectItem>
                        {stores.map(store => (
                            <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
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
            <div className="w-full sm:w-auto self-end">
                 <Button onClick={handleExport} className="w-full">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export Data
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
