
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
import { TrendingUp, DollarSign, Sparkles, ShoppingBag, Target, CheckCircle, Calendar as CalendarIcon, TrendingDown, FileText, FileSpreadsheet } from 'lucide-react';
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
import { supabase } from '@/lib/supabase'; // Mengganti Firebase dengan Supabase
import type { AppliedStrategy, TransactionItem } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useDashboard } from '@/contexts/dashboard-context';
import Papa from 'papaparse';
import { AIConfirmationDialog } from '@/components/dashboard/ai-confirmation-dialog';

interface AdminRecommendationInput {
  businessDescription: string;
  totalRevenueLastWeek: number;
  totalRevenueLastMonth: number;
  topSellingProducts: string[];
  worstSellingProducts: string[];
}

interface AdminRecommendationOutput {
  weeklyRecommendation: string;
  monthlyRecommendation: string;
}


const chartConfig = {
  revenue: {
    label: 'Pendapatan',
    color: 'hsl(var(--primary))',
  },
};

export default function AdminOverview() {
  const { activeStore } = useAuth();
  const { dashboardData } = useDashboard();
  const { transactions, products, feeSettings } = dashboardData;
  const [recommendations, setRecommendations] = React.useState<AdminRecommendationOutput | null>(null);
  const [appliedStrategies, setAppliedStrategies] = React.useState<AppliedStrategy[]>([]);
  const [exportDate, setExportDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { toast } = useToast();

  React.useEffect(() => {
    if (!activeStore) return;
    const fetchStrategies = async () => {
      try {
        const { data, error } = await supabase
          .from('applied_strategies')
          .select('*')
          .eq('store_id', activeStore.id);

        if (error) {
          throw error;
        }

        setAppliedStrategies(data as AppliedStrategy[]);
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

    const calculateProductSales = (txs: typeof transactions) => {
      const sales: Record<string, number> = {};
      txs.forEach(t => {
        t.items.forEach((item: TransactionItem) => {
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
  }, [transactions, products]);

  const handleGenerateRecommendations = async (): Promise<AdminRecommendationOutput> => {
    const thisMonthRevenue = monthlyGrowthData[monthlyGrowthData.length - 1]?.revenue || 0;
    const lastMonthRevenue = monthlyGrowthData[monthlyGrowthData.length - 2]?.revenue || 0;

    const inputData: AdminRecommendationInput = {
      businessDescription: activeStore?.businessDescription || 'Toko',
      totalRevenueLastWeek: thisMonthRevenue / 4,
      totalRevenueLastMonth: lastMonthRevenue,
      topSellingProducts: topProductsThisMonth.map(([name]) => name),
      worstSellingProducts: worstProductsThisMonth.map(([name]) => name),
    };

    const response = await fetch('/api/ai/admin-recommendation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inputData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch recommendations');
    }

    return response.json();
  }

  const handleApplyStrategy = async (type: 'weekly' | 'monthly', recommendation: string) => {
    if (!activeStore) return;
    const newStrategyData = {
      store_id: activeStore.id,
      type,
      recommendation,
      applied_date: formatISO(new Date()), // Supabase expects snake_case and ISO string for dates
      status: 'active' as const,
    };

    try {
      const { data, error } = await supabase
        .from('applied_strategies')
        .insert([newStrategyData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setAppliedStrategies(prev => [...prev, data as AppliedStrategy]);
      toast({
        title: 'Strategi Diterapkan!',
        description: `Strategi ${type} telah ditambahkan ke daftar lacak.`,
      });
    } catch (error) {
      console.error("Error applying strategy:", error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menerapkan Strategi',
        description: 'Terjadi kesalahan saat menyimpan data ke Supabase.'
      });
    }
  };

  const handleCompleteStrategy = async (id: string) => {
    if (!activeStore) return;
    try {
      const { error } = await supabase
        .from('applied_strategies')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

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
        description: 'Terjadi kesalahan saat menghapus data dari Supabase.'
      });
    }
  };

  const handleExport = async (formatType: 'PDF' | 'Excel') => {
    if (!exportDate?.from || !exportDate?.to || !transactions.length) {
      toast({
        variant: 'destructive',
        title: 'Tidak Ada Data',
        description: 'Pilih rentang tanggal yang valid dan pastikan ada transaksi.',
      });
      return;
    }

    const fromDate = new Date(exportDate.from.setHours(0, 0, 0, 0));
    const toDate = new Date(exportDate.to.setHours(23, 59, 59, 999));

    const filteredTransactions = transactions.filter(t =>
      isWithinInterval(new Date(t.createdAt), { start: fromDate, end: toDate })
    );

    if (filteredTransactions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Tidak Ada Transaksi',
        description: 'Tidak ada data transaksi pada rentang tanggal yang dipilih.',
      });
      return;
    }

    const dateRangeStr = `${format(fromDate, 'yyyy-MM-dd')} to ${format(toDate, 'yyyy-MM-dd')}`;
    const filename = `Laporan_Penjualan_${activeStore?.name}_${dateRangeStr}`.replace(/\s+/g, '_');

    if (formatType === 'Excel') {
      const dataForCsv = filteredTransactions.flatMap(tx =>
        tx.items.map(item => ({
          'ID Transaksi': tx.id,
          'Tanggal': format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm:ss'),
          'Nama Pelanggan': tx.customerName,
          'Metode Pembayaran': tx.paymentMethod,
          'Nama Produk': item.productName,
          'Jumlah': item.quantity,
          'Harga Satuan': item.price,
          'Total Item': item.quantity * item.price,
          'Subtotal Transaksi': tx.subtotal,
          'Diskon Transaksi': tx.discountAmount,
          'Total Transaksi': tx.totalAmount
        }))
      );

      const csv = Papa.unparse(dataForCsv);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

    } else if (formatType === 'PDF') {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text(`Laporan Penjualan - ${activeStore?.name}`, 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Periode: ${format(fromDate, 'd MMMM yyyy', { locale: idLocale })} - ${format(toDate, 'd MMMM yyyy', { locale: idLocale })}`, 14, 30);

      const totalRevenue = filteredTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
      const totalDiscounts = filteredTransactions.reduce((sum, tx) => sum + tx.discountAmount, 0);

      autoTable(doc, {
        startY: 40,
        head: [['Ringkasan']],
        body: [
          [`Total Transaksi`, filteredTransactions.length],
          [`Total Pendapatan`, `Rp ${totalRevenue.toLocaleString('id-ID')}`],
          [`Total Diskon`, `Rp ${totalDiscounts.toLocaleString('id-ID')}`],
        ],
        theme: 'grid'
      });

      const tableData = filteredTransactions.map(tx => [
        format(new Date(tx.createdAt), 'dd/MM/yy HH:mm'),
        tx.customerName,
        tx.items.map(i => `${i.quantity}x ${i.productName}`).join('\n'),
        `Rp ${tx.totalAmount.toLocaleString('id-ID')}`,
      ]);

      autoTable(doc, {
        startY: (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10,
        head: [['Tanggal', 'Pelanggan', 'Item', 'Total']],
        body: tableData,
        headStyles: { fillColor: [41, 128, 185] },
      });

      doc.save(`${filename}.pdf`);
    }

    toast({
      title: "Export Berhasil!",
      description: `Data penjualan telah diexport ke format ${formatType}.`,
    });
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
            <CardDescription>Ringkasan performa toko {activeStore?.name} secara keseluruhan.</CardDescription>
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
            <AIConfirmationDialog
              featureName="Rekomendasi Admin"
              featureDescription="Chika AI akan menganalisis data kinerja toko Anda untuk memberikan rekomendasi mingguan dan bulanan."
              feeSettings={feeSettings}
              onConfirm={handleGenerateRecommendations}
              onSuccess={setRecommendations}
            >
              <Button disabled={!feeSettings}>
                <Sparkles className="mr-2 h-4 w-4" />
                Buat Rekomendasi Baru
              </Button>
            </AIConfirmationDialog>

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
                  <CardDescription>Diterapkan pada: {format(new Date(strategy.applied_date), 'd MMMM yyyy')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{strategy.recommendation}</p>
                  <div className="mt-4 rounded-lg border bg-secondary/30 p-4">
                    <h4 className="font-semibold text-sm mb-2">Detail Pertumbuhan (Placeholder)</h4>
                    <p className="text-xs text-muted-foreground mb-2">Grafik ini akan menunjukkan metrik relevan sejak strategi diterapkan.</p>
                    <ChartContainer config={{}} className="h-[150px] w-full">
                      <BarChart accessibilityLayer data={[{ 'name': 'Before', value: 100 }, { 'name': 'After', value: 120 }]}>
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <ChartTooltipContent />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
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
          <CardDescription>Unduh data transaksi dari toko {activeStore?.name} untuk analisis lebih lanjut.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
          <div className="grid w-full grid-cols-2 gap-4 sm:w-auto">
            <div className="grid gap-2">
              <Label>Tanggal Awal</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !exportDate?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {exportDate?.from ? format(exportDate.from, "LLL dd, y") : <span>Pilih tanggal</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={exportDate?.from}
                    onSelect={(date) => setExportDate(prev => ({ from: date, to: prev?.to }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>Tanggal Akhir</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !exportDate?.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {exportDate?.to ? format(exportDate.to, "LLL dd, y") : <span>Pilih tanggal</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={exportDate?.to}
                    onSelect={(date) => setExportDate(prev => ({ from: prev?.from, to: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
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
