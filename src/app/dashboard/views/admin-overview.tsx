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
import { transactions as mockTransactions, products as mockProducts, stores as mockStores } from '@/lib/data';
import { TrendingUp, DollarSign, Package, Sparkles, Loader, ShoppingBag, History, Target, CheckCircle, FileDown, Calendar as CalendarIcon, TrendingDown, ClipboardList, Trash2, Send } from 'lucide-react';
import { subMonths, format, startOfMonth, endOfMonth, isWithinInterval, formatISO, addDays, startOfYesterday, formatDistanceToNow } from 'date-fns';
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
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import type { PendingOrder, Store } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PendingOrderFollowUpDialog } from '@/components/dashboard/pending-order-follow-up-dialog';


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
  status: 'active'; // In a real app, this could be more complex
};

type AdminOverviewProps = {
    pendingOrders: PendingOrder[];
    stores: Store[];
};

export default function AdminOverview({ pendingOrders: allPendingOrders, stores }: AdminOverviewProps) {
  const [recommendations, setRecommendations] = React.useState<{ weeklyRecommendation: string; monthlyRecommendation: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [appliedStrategies, setAppliedStrategies] = React.useState<AppliedStrategy[]>([]);
  const [exportDate, setExportDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [exportStore, setExportStore] = React.useState<string>('all');
  const { toast } = useToast();

  const [dateFnsLocale, setDateFnsLocale] = React.useState<any | undefined>(undefined);
   React.useEffect(() => {
    import('date-fns/locale/id').then(locale => setDateFnsLocale(locale.default));
  }, []);

  const [pendingOrders, setPendingOrders] = React.useState<PendingOrder[]>(allPendingOrders);
   React.useEffect(() => {
    setPendingOrders(allPendingOrders);
  }, [allPendingOrders]);
  
  const [orderToDelete, setOrderToDelete] = React.useState<PendingOrder | null>(null);
  const [orderToFollowUp, setOrderToFollowUp] = React.useState<PendingOrder | null>(null);


  React.useEffect(() => {
    const fetchStrategies = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'appliedStrategies'));
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
  }, [toast]);


  const {
    monthlyGrowthData,
    storeStats,
    topProductsThisMonth,
    worstProductsThisMonth,
    topProductsLastMonth,
    worstProductsLastMonth,
  } = React.useMemo(() => {
    const now = new Date();
    const startOfThisMonth = startOfMonth(now);
    const endOfThisMonth = endOfMonth(now);
    const lastMonth = subMonths(now, 1);
    const startOfLastMonth = startOfMonth(lastMonth);
    const endOfLastMonth = endOfMonth(lastMonth);
    
    // Monthly Growth Data
    const monthlyData: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const targetMonth = subMonths(now, i);
      const start = startOfMonth(targetMonth);
      const end = endOfMonth(targetMonth);
      const monthName = format(targetMonth, 'MMM', { locale: idLocale });
      
      const monthlyRevenue = mockTransactions
        .filter(t => isWithinInterval(new Date(t.createdAt), { start, end }))
        .reduce((sum, t) => sum + t.totalAmount, 0);
        
      monthlyData.push({ month: monthName, revenue: monthlyRevenue });
    }

    // Store Stats (Overall)
    const stats = stores.map(store => {
      const storeTransactions = mockTransactions.filter(t => t.storeId === store.id);
      const totalRevenue = storeTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
      
      const totalCost = storeTransactions.reduce((sum, t) => {
        return sum + t.items.reduce((itemSum, item) => {
          const product = mockProducts.find(p => p.id === item.productId);
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
    const thisMonthTransactions = mockTransactions.filter(t => isWithinInterval(new Date(t.createdAt), { start: startOfThisMonth, end: endOfThisMonth }));
    const lastMonthTransactions = mockTransactions.filter(t => isWithinInterval(new Date(t.createdAt), { start: startOfLastMonth, end: endOfLastMonth }));

    const calculateProductSales = (txs: typeof mockTransactions) => {
      const sales: Record<string, number> = {};
      txs.forEach(t => {
          t.items.forEach(item => {
              if (!sales[item.productName]) {
                  sales[item.productName] = 0;
              }
              sales[item.productName] += item.quantity;
          });
      });
      return Object.entries(sales).sort(([, a], [, b]) => b - a);
    };

    const sortedProductsThisMonth = calculateProductSales(thisMonthTransactions);
    const sortedProductsLastMonth = calculateProductSales(lastMonthTransactions);

    const topThisMonth = sortedProductsThisMonth.slice(0, 3);
    const worstThisMonth = sortedProductsThisMonth.slice(-3).reverse();
    const topLastMonth = sortedProductsLastMonth.slice(0, 3);
    const worstLastMonth = sortedProductsLastMonth.slice(-3).reverse();

    return {
      monthlyGrowthData: monthlyData,
      storeStats: stats,
      topProductsThisMonth: topThisMonth,
      worstProductsThisMonth: worstThisMonth,
      topProductsLastMonth: topLastMonth,
      worstProductsLastMonth: worstLastMonth
    };
  }, [stores]);

  const handleGenerateRecommendations = async () => {
    setIsLoading(true);
    setRecommendations(null);
    try {
        const result = await getAdminRecommendations({
            totalRevenueLastWeek: 5000000, // Dummy data for now
            totalRevenueLastMonth: 20000000, // Dummy data for now
            topSellingProducts: topProductsThisMonth.map(([name]) => name),
            worstSellingProducts: worstProductsThisMonth.map(([name]) => name),
        });
        setRecommendations(result);
    } catch (error) {
        console.error("Error generating recommendations:", error);
    } finally {
        setIsLoading(false);
    }
  }

  const handleApplyStrategy = async (type: 'weekly' | 'monthly', recommendation: string) => {
    const newStrategyData = {
      type,
      recommendation,
      appliedDate: formatISO(new Date()),
      status: 'active' as const,
    };

    try {
        const docRef = await addDoc(collection(db, 'appliedStrategies'), newStrategyData);
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
    try {
        await deleteDoc(doc(db, 'appliedStrategies', id));
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

  const handleExport = () => {
    toast({
        title: "Exporting Data (Simulation)",
        description: `Preparing to export data for ${stores.find(s => s.id === exportStore)?.name || 'All Stores'} from ${format(exportDate?.from!, 'PPP')} to ${format(exportDate?.to!, 'PPP')}.`,
    })
  }

  const handleDeletePendingOrder = async () => {
    if (!orderToDelete) return;

    try {
      await deleteDoc(doc(db, 'pendingOrders', orderToDelete.id));
      setPendingOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
      toast({
        title: 'Pesanan Dihapus',
        description: `Pesanan tertunda untuk ${orderToDelete.productName} telah dihapus.`,
      });
    } catch (error) {
      console.error("Error deleting pending order: ", error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus',
        description: 'Terjadi kesalahan saat menghapus pesanan.',
      });
    } finally {
      setOrderToDelete(null);
    }
  };

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
      </div>
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline tracking-wider"><TrendingUp className="text-primary"/>Produk Terlaris</CardTitle>
                <CardDescription>Bulan ini, berdasarkan unit terjual</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {topProductsThisMonth.map(([name, quantity], index) => (
                        <li key={index} className="flex justify-between text-sm font-medium">
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
                        <li key={index} className="flex justify-between text-sm font-medium">
                            <span>{index + 1}. {name}</span>
                            <span className="font-mono">{quantity}x</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline tracking-wider text-muted-foreground"><TrendingUp className="text-primary/50"/>Produk Terlaris (Bulan Lalu)</CardTitle>
                <CardDescription>Bulan lalu, berdasarkan unit terjual</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                    {topProductsLastMonth.map(([name, quantity], index) => (
                        <li key={index} className="flex justify-between text-sm font-medium">
                           <span>{index + 1}. {name}</span>
                           <span className="font-mono">{quantity}x</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline tracking-wider text-muted-foreground"><TrendingDown className="text-destructive/50"/>Produk Kurang Laris (Bulan Lalu)</CardTitle>
                <CardDescription>Bulan lalu, berdasarkan unit terjual</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                    {worstProductsLastMonth.map(([name, quantity], index) => (
                        <li key={index} className="flex justify-between text-sm font-medium">
                            <span>{index + 1}. {name}</span>
                            <span className="font-mono">{quantity}x</span>
                        </li>
                    ))}
                </ul>
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
            <CardTitle className="font-headline tracking-wider">Pesanan Tertunda Terbaru (Semua Toko)</CardTitle>
            <CardDescription>
              Produk yang ditunggu pelanggan di semua cabang.
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Toko</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {pendingOrders.slice(0, 5).map((order) => (
                    <TableRow key={order.id}>
                        <TableCell>
                           <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                <AvatarImage
                                    src={order.customerAvatarUrl}
                                    alt={order.customerName}
                                />
                                <AvatarFallback>
                                    {order.customerName.charAt(0)}
                                </AvatarFallback>
                                </Avatar>
                                <div className="font-medium">{order.customerName}</div>
                            </div>
                        </TableCell>
                        <TableCell>{order.productName}</TableCell>
                        <TableCell>{stores.find(s => s.id === order.storeId)?.name || order.storeId}</TableCell>
                        <TableCell className="text-center font-mono">{order.quantity}</TableCell>
                        <TableCell>
                          {dateFnsLocale && formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: dateFnsLocale })}
                        </TableCell>
                        <TableCell className="text-right">
                           <div className="flex items-center justify-end gap-2">
                             <Button variant="outline" size="sm" className="gap-2" onClick={() => setOrderToFollowUp(order)}>
                                <Send className="h-3 w-3" />
                                Follow Up
                             </Button>
                            <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive h-8 w-8" onClick={() => setOrderToDelete(order)}>
                                <Trash2 className="h-4 w-4"/>
                                <span className="sr-only">Delete order</span>
                            </Button>
                           </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


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
      
      {orderToFollowUp && (
        <PendingOrderFollowUpDialog
          order={orderToFollowUp}
          open={!!orderToFollowUp}
          onOpenChange={() => setOrderToFollowUp(null)}
        />
      )}

      <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus pesanan tertunda untuk{' '}
              <span className="font-bold">{orderToDelete?.productName}</span> dari pelanggan{' '}
              <span className="font-bold">{orderToDelete?.customerName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePendingOrder}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
