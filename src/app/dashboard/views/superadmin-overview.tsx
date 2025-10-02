
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Building2, Users, DollarSign, ShoppingCart, Crown } from 'lucide-react';
import type { PlatformStats } from '@/lib/platform-stats';
import { getPlatformStats } from '@/lib/platform-stats';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from '@/contexts/dashboard-context';


const chartConfig = {
  revenue: {
    label: 'Pendapatan',
    color: 'hsl(var(--primary))',
  },
};

export default function SuperAdminOverview() {
    const { stores, users, isLoading: isContextLoading } = useDashboard();
    const [platformData, setPlatformData] = React.useState<PlatformStats | null>(null);
    const [isDataLoading, setIsDataLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchPlatformData = async () => {
            if (isContextLoading) return;
            setIsDataLoading(true);
            try {
                const stats = await getPlatformStats();
                setPlatformData(stats);
            } catch (error) {
                console.error("Error fetching platform-wide data:", error);
            } finally {
                setIsDataLoading(false);
            }
        };

        fetchPlatformData();
    }, [isContextLoading]);
    
    if (isContextLoading || isDataLoading) {
        return <SuperAdminOverviewSkeleton />
    }
    
    if (!platformData) {
        return <Card><CardHeader><CardTitle>Data statistik tidak tersedia</CardTitle><CardDescription>Pastikan Cloud Function untuk agregasi data sudah berjalan dan menyimpan hasilnya di dokumen 'platform/stats'.</CardDescription></CardHeader></Card>
    }

    return (
        <div className="grid gap-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Toko</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(stores || []).length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(users || []).length}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Rp {platformData.totalRevenue.toLocaleString('id-ID')}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{platformData.totalTransactions.toLocaleString('id-ID')}</div>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="font-headline tracking-wider">Pertumbuhan Pendapatan Platform</CardTitle>
                        <CardDescription>Total pendapatan seluruh toko selama 6 bulan terakhir.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={platformData.monthlyGrowthData}>
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
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="font-headline tracking-wider flex items-center gap-2">
                           <Crown className="text-primary" /> Toko Performa Terbaik
                        </CardTitle>
                        <CardDescription>Berdasarkan total pendapatan.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Toko</TableHead>
                                    <TableHead className="text-right">Total Pendapatan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {platformData.topStores.map(({ storeName, totalRevenue }, index) => (
                                <TableRow key={storeName}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold w-4">{index + 1}.</span>
                                            <div className="font-medium">{storeName}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                    Rp {totalRevenue.toLocaleString('id-ID')}
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function SuperAdminOverviewSkeleton() {
    return (
        <div className="grid gap-6">
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({length: 4}).map((_, i) => (
                     <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-7 w-1/3" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2 mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                         <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <Skeleton className="h-6 w-2/3 mb-2" />
                        <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent>
                        {Array.from({ length: 5 }).map((_, i) => (
                             <div key={i} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-5 w-24" />
                                </div>
                                <Skeleton className="h-5 w-20" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
