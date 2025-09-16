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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { salesData, products, customers, pendingOrders as allPendingOrders, stores, users, transactions } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DollarSign, Package, Users, TrendingUp, Gift, Sparkles, Loader, Building, UserCheck, Send, Trophy } from 'lucide-react';
import { format, formatDistanceToNow, startOfWeek, endOfWeek, eachDayOfInterval, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getBirthdayFollowUp } from '@/ai/flows/birthday-follow-up';
import type { Customer, Transaction, User } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--primary))',
  },
};

function BirthdayFollowUpDialog({ customer, open, onOpenChange }: { customer: Customer, open: boolean, onOpenChange: (open: boolean) => void }) {
    const [discount, setDiscount] = React.useState(15);
    const [message, setMessage] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        setMessage('');
        try {
            const result = await getBirthdayFollowUp({
                customerName: customer.name,
                discountPercentage: discount,
                birthDate: customer.birthDate,
            });
            setMessage(result.followUpMessage);
        } catch (error) {
            console.error("Error generating birthday message:", error);
            setMessage("Gagal membuat pesan. Coba lagi.");
        } finally {
            setIsLoading(false);
        }
    }
    
    const formattedPhone = customer.phone.startsWith('0') 
        ? `62${customer.phone.substring(1)}` 
        : customer.phone;
    
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;


    React.useEffect(() => {
        if (open) {
            setMessage('');
            setDiscount(15);
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate Birthday Message for {customer.name}</DialogTitle>
                    <DialogDescription>
                        Set a discount and let Chika AI create a personalized birthday message.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="discount">Discount Percentage (%)</Label>
                        <Input 
                            id="discount"
                            type="number"
                            value={discount}
                            onChange={(e) => setDiscount(Number(e.target.value))}
                            placeholder="e.g., 15"
                        />
                    </div>
                     <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
                        {isLoading ? (
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                             <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Generate with Chika AI
                    </Button>
                    {message && (
                        <div className="space-y-2">
                             <Alert className="border-accent bg-accent/10">
                                <Sparkles className="h-4 w-4 !text-accent" />
                                <AlertTitle className="font-semibold text-accent">Generated Message</AlertTitle>
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                             <Link href={whatsappUrl} target="_blank" className="w-full">
                                <Button className="w-full" variant="secondary">
                                    <Send className="mr-2 h-4 w-4" />
                                    Kirim via WhatsApp
                                </Button>
                             </Link>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}


export default function Overview({ storeId }: { storeId: string }) {
  const storeTransactions = transactions.filter(t => t.storeId === storeId);
  const pendingOrders = allPendingOrders.filter(p => p.storeId === storeId);
  const totalRevenue = storeTransactions.reduce((acc, curr) => acc + curr.totalAmount, 0);

  const topCustomers = [...customers]
    .sort((a, b) => b.loyaltyPoints - a.loyaltyPoints)
    .slice(0, 3);
  
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [birthdayCustomers, setBirthdayCustomers] = React.useState<Customer[]>([]);

  const storeUsers = users.filter(u => u.storeId === storeId);
  const storeAdmins = storeUsers.filter(u => u.role === 'admin');
  const storeCashiers = storeUsers.filter(u => u.role === 'cashier');

  const employeeSales = React.useMemo(() => {
    const sales: Record<string, { user: User; totalOmset: number }> = {};

    transactions.forEach(t => {
      const user = users.find(u => u.id === t.staffId);
      if (user) {
        if (!sales[user.id]) {
          sales[user.id] = { user, totalOmset: 0 };
        }
        sales[user.id].totalOmset += t.totalAmount;
      }
    });

    return Object.values(sales).sort((a, b) => b.totalOmset - a.totalOmset);
  }, []);

  const weeklySalesData = React.useMemo(() => {
    const today = new Date();
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });
    
    const daysInWeek = eachDayOfInterval({
        start: startOfThisWeek,
        end: endOfThisWeek,
    });

    const dailyRevenue = daysInWeek.map(day => {
        const dailyTransactions = storeTransactions.filter(t => format(new Date(t.createdAt), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
        const revenue = dailyTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
        return {
            date: format(day, 'E'), 
            revenue: revenue,
        };
    });

    return dailyRevenue;
  }, [storeTransactions]);


  React.useEffect(() => {
    const currentMonth = new Date().getMonth(); 
    const filteredCustomers = customers.filter(customer => {
        const [year, month] = customer.birthDate.split('-').map(Number);
        return month -1 === currentMonth;
    });
    setBirthdayCustomers(filteredCustomers);
  }, []);

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue (Store)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {totalRevenue.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground">
              Total revenue for this store
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Customer (Global)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topCustomers[0]?.name || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {topCustomers[0]?.loyaltyPoints || 0} points
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Saturday</div>
            <p className="text-xs text-muted-foreground">
              Highest traffic and sales
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
         <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-headline tracking-wider">
              Employee Leaderboard
            </CardTitle>
            <CardDescription>
              Top performing employees based on total sales.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Total Omset</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeSales.slice(0, 5).map(({ user, totalOmset }, index) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="font-bold w-4">{index + 1}.</span>
                        <div className="font-medium">{user.name}</div>
                        {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      Rp {totalOmset.toLocaleString('id-ID')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-headline tracking-wider">
              Weekly Sales Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart
                data={weeklySalesData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <YAxis
                  tickFormatter={(value) => `Rp${Number(value) / 1000000} Jt`}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                 <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
                  content={<ChartTooltipContent 
                    formatter={(value) => `Rp ${Number(value).toLocaleString('id-ID')}`}
                  />}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
            <CardTitle className="font-headline tracking-wider">This Month's Birthdays</CardTitle>
            <CardDescription>
              Wish them a happy birthday with a special promo!
            </CardDescription>
        </CardHeader>
        <CardContent>
           {birthdayCustomers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Birth Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {birthdayCustomers.map((customer) => {
                    const [year, month, day] = customer.birthDate.split('-').map(Number);
                    const birthDate = new Date(year, month - 1, day);
                    return (
                        <TableRow key={customer.id}>
                            <TableCell>
                               <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                    <AvatarImage
                                        src={customer.avatarUrl}
                                        alt={customer.name}
                                    />
                                    <AvatarFallback>
                                        {customer.name.charAt(0)}
                                    </AvatarFallback>
                                    </Avatar>
                                    <div className="font-medium">{customer.name}</div>
                                </div>
                            </TableCell>
                            <TableCell>{birthDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long' })}</TableCell>
                            <TableCell className="text-right">
                                <Button size="sm" variant="outline" onClick={() => setSelectedCustomer(customer)}>
                                    <Gift className="mr-2 h-4 w-4"/>
                                    Send Wish
                                </Button>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
          </Table>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No customer birthdays this month.</p>
            )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="font-headline tracking-wider">Recent Pending Orders</CardTitle>
            <CardDescription>
              Products awaited by customers. Follow up when stock is available.
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Date Requested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {pendingOrders.map((order) => (
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
                        <TableCell className="text-right">{formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedCustomer && (
        <BirthdayFollowUpDialog 
            customer={selectedCustomer}
            open={!!selectedCustomer}
            onOpenChange={(open) => {
                if(!open) {
                    setSelectedCustomer(null)
                }
            }}
        />
      )}
    </div>
  );
}
