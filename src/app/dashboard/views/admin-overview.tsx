'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { stores, transactions, products } from '@/lib/data';
import { TrendingUp, DollarSign, Package, Sparkles, Loader, ShoppingBag } from 'lucide-react';
import { subMonths, format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { getAdminRecommendations } from '@/ai/flows/admin-recommendation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const chartConfig = {
  revenue: {
    label: 'Pendapatan',
    color: 'hsl(var(--primary))',
  },
};

export default function AdminOverview() {
  const [recommendations, setRecommendations] = React.useState<{ weeklyRecommendation: string; monthlyRecommendation: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

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
      
      <div className="grid gap-6 md:grid-cols-2">
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

       <Card>
        <CardHeader>
          <CardTitle className="font-headline tracking-wider">Rekomendasi Bisnis</CardTitle>
          <CardDescription>Dapatkan saran strategis mingguan dan bulanan dari Chika AI untuk mendorong pertumbuhan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGenerateRecommendations} disabled={isLoading}>
            {isLoading ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Buat Rekomendasi dengan Chika AI
          </Button>

          {recommendations && (
             <div className="grid gap-6 md:grid-cols-2">
                <Alert className="border-accent bg-accent/10">
                    <Sparkles className="h-4 w-4 !text-accent" />
                    <AlertTitle className="font-semibold text-accent">Rekomendasi Mingguan</AlertTitle>
                    <AlertDescription>{recommendations.weeklyRecommendation}</AlertDescription>
                </Alert>
                 <Alert className="border-primary bg-primary/10">
                    <ShoppingBag className="h-4 w-4 !text-primary" />
                    <AlertTitle className="font-semibold text-primary">Rekomendasi Bulanan</AlertTitle>
                    <AlertDescription>{recommendations.monthlyRecommendation}</AlertDescription>
                </Alert>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
