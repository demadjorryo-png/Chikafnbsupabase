'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { redemptionOptions as initialRedemptionOptions, users, products, transactions } from '@/lib/data';
import type { RedemptionOption, User, Transaction } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, CheckCircle, XCircle, Sparkles, Loader, Target, Save } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSearchParams } from 'next/navigation';
import { getPromotionRecommendations } from '@/ai/flows/promotion-recommendation';
import type { PromotionRecommendationOutput } from '@/ai/flows/promotion-recommendation';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { pointEarningSettings, updatePointEarningSettings } from '@/lib/point-earning-settings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


export default function Promotions() {
  const [redemptionOptions, setRedemptionOptions] = React.useState(initialRedemptionOptions);
  const [recommendations, setRecommendations] = React.useState<PromotionRecommendationOutput | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const userId = searchParams.get('userId');
  const currentUser = users.find((u) => u.id === userId);
  const isAdmin = currentUser?.role === 'admin';

  const [rpPerPoint, setRpPerPoint] = React.useState(pointEarningSettings.rpPerPoint);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [promotionToDelete, setPromotionToDelete] = React.useState<RedemptionOption | null>(null);

  const handleDeleteClick = (option: RedemptionOption) => {
    setPromotionToDelete(option);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!promotionToDelete) return;
    
    setRedemptionOptions(prev => prev.filter(p => p.id !== promotionToDelete.id));

    toast({
      title: 'Promosi Dihapus!',
      description: `Promo "${promotionToDelete.description}" telah berhasil dihapus.`,
    });

    setIsDeleteDialogOpen(false);
    setPromotionToDelete(null);
  };


  const handleSavePointEarning = () => {
    updatePointEarningSettings({ rpPerPoint });
    toast({
      title: 'Pengaturan Disimpan!',
      description: `Sekarang, pelanggan akan mendapatkan 1 poin untuk setiap pembelanjaan Rp ${rpPerPoint.toLocaleString('id-ID')}.`,
    });
  };

  const toggleStatus = (id: string) => {
    setRedemptionOptions((prevOptions) =>
      prevOptions.map((option) =>
        option.id === id ? { ...option, isActive: !option.isActive } : option
      )
    );
     toast({
        title: 'Status Updated',
        description: `Promotion status has been successfully changed.`,
    });
  };

  const handleGenerateRecommendations = async () => {
    setIsLoading(true);
    setRecommendations(null);

    const now = new Date();
    const startOfThisMonth = startOfMonth(now);
    const endOfThisMonth = endOfMonth(now);
    const thisMonthTransactions = transactions.filter(t => isWithinInterval(new Date(t.createdAt), { start: startOfThisMonth, end: endOfThisMonth }));
    
    const calculateProductSales = (txs: Transaction[]) => {
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
    const topProducts = sortedProductsThisMonth.slice(0, 3).map(([name]) => name);
    const worstProducts = sortedProductsThisMonth.slice(-3).reverse().map(([name]) => name);

    try {
      const result = await getPromotionRecommendations({
        currentRedemptionOptions: redemptionOptions.map(o => ({
            description: o.description,
            pointsRequired: o.pointsRequired,
            isActive: o.isActive,
        })),
        topSellingProducts: topProducts,
        worstSellingProducts: worstProducts,
      });
      setRecommendations(result);
    } catch (error) {
      console.error('Error generating promotion recommendations:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'Could not generate recommendations. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (title: string) => {
    toast({
        title: 'Strategy Marked for Implementation!',
        description: `The "${title}" strategy has been noted. You can now create the promotion manually.`,
    });
  }

  return (
    <>
    <div className="grid gap-6">
       {isAdmin && (
         <Card>
            <CardHeader>
                <CardTitle className="font-headline tracking-wider">Pengaturan Perolehan Poin</CardTitle>
                <CardDescription>Atur berapa total belanja (dalam Rupiah) yang diperlukan untuk mendapatkan 1 poin loyalitas.</CardDescription>
            </CardHeader>
            <CardContent className="max-w-sm space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="rp-per-point">Belanja (Rp) untuk 1 Poin</Label>
                    <Input 
                        id="rp-per-point"
                        type="number"
                        value={rpPerPoint}
                        onChange={(e) => setRpPerPoint(Number(e.target.value))}
                        step="1000"
                    />
                </div>
                 <Button onClick={handleSavePointEarning}>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Pengaturan
                </Button>
            </CardContent>
         </Card>
      )}
      {isAdmin && (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline tracking-wider">Rekomendasi Promo Chika AI</CardTitle>
                <CardDescription>Dapatkan ide promo loyalitas baru berdasarkan data penjualan terkini.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleGenerateRecommendations} disabled={isLoading}>
                    {isLoading ? (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Buat Rekomendasi Baru
                </Button>
                {recommendations && (
                    <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {recommendations.recommendations.map((rec, index) => (
                            <Card key={index}>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2 text-accent"><Sparkles className="h-4 w-4" />{rec.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                     <p className="text-sm">{rec.description}</p>
                                     <p className="text-xs text-muted-foreground italic">"{rec.justification}"</p>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="outline" size="sm" onClick={() => handleApply(rec.title)}>
                                        <Target className="mr-2 h-4 w-4" />
                                        Terapkan
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="font-headline tracking-wider">
                Promo Penukaran Poin Tetap
              </CardTitle>
              <CardDescription>
                {isAdmin
                  ? 'Kelola promo penukaran poin loyalitas yang aktif.'
                  : 'Lihat promo penukaran poin loyalitas yang sedang aktif.'}
              </CardDescription>
            </div>
            {isAdmin && (
              <Button size="sm" className="gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Tambah Promo
                </span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Points Required</TableHead>
                <TableHead className="text-right">Value (Rp)</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {redemptionOptions.map((option) => (
                <TableRow key={option.id}>
                  <TableCell className="font-medium">{option.description}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={option.isActive ? 'default' : 'destructive'}>
                      {option.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {option.pointsRequired.toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {option.value.toLocaleString('id-ID')}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => toggleStatus(option.id)}>
                            {option.isActive ? (
                              <XCircle className="mr-2 h-4 w-4" />
                            ) : (
                              <CheckCircle className="mr-2 h-4 w-4" />
                            )}
                            <span>{option.isActive ? 'Deactivate' : 'Activate'}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(option)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the promotion: <br />
              <span className="font-bold">"{promotionToDelete?.description}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
