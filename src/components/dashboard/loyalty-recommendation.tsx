

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader, Sparkles } from 'lucide-react';
import type { Customer, RedemptionOption } from '@/lib/types';
import { getLoyaltyPointRecommendation } from '@/ai/flows/loyalty-point-recommendation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { deductAiUsageFee } from '@/lib/app-settings';
import type { TransactionFeeSettings } from '@/lib/app-settings';

type LoyaltyRecommendationProps = {
  customer: Customer;
  totalPurchaseAmount: number;
  feeSettings: TransactionFeeSettings;
};

export function LoyaltyRecommendation({
  customer,
  totalPurchaseAmount,
  feeSettings
}: LoyaltyRecommendationProps) {
  const [recommendation, setRecommendation] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [redemptionOptions, setRedemptionOptions] = React.useState<RedemptionOption[]>([]);
  const { toast } = useToast();
  const { currentUser, activeStore, pradanaTokenBalance, refreshPradanaTokenBalance } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  React.useEffect(() => {
    const fetchRedemptionOptions = async () => {
        try {
            const q = query(collection(db, 'redemptionOptions'), where('isActive', '==', true));
            const querySnapshot = await getDocs(q);
            const options = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RedemptionOption));
            setRedemptionOptions(options);
        } catch (error) {
            console.error("Failed to fetch redemption options for AI", error);
            toast({ variant: 'destructive', title: 'Gagal memuat data promo aktif.'});
        }
    }
    fetchRedemptionOptions();
  }, [toast]);


  const handleGetRecommendation = async () => {
    if (isAdmin && activeStore) {
      try {
        await deductAiUsageFee(pradanaTokenBalance, feeSettings, activeStore.id, toast);
      } catch (error) {
        return; // Stop if not enough tokens
      }
    }

    setIsLoading(true);
    setRecommendation('');
    if (redemptionOptions.length === 0) {
        toast({ variant: 'destructive', title: 'Tidak Ada Promo Aktif', description: 'Tidak ada promo penukaran poin yang dapat direkomendasikan saat ini.' });
        setIsLoading(false);
        return;
    }
    try {
      const result = await getLoyaltyPointRecommendation({
        loyaltyPoints: customer.loyaltyPoints,
        totalPurchaseAmount,
        availableRedemptionOptions: redemptionOptions,
      });
      setRecommendation(result.recommendation);
      if (isAdmin) {
        refreshPradanaTokenBalance();
      }
    } catch (error) {
      console.error('Error getting loyalty recommendation:', error);
      setRecommendation('Maaf, terjadi kesalahan saat mengambil rekomendasi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
        onClick={handleGetRecommendation}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        <span>Get AI Point Recommendation {isAdmin && `(${feeSettings.aiUsageFee} Token)`}</span>
      </Button>

      {recommendation && (
        <Alert className="border-accent bg-accent/10">
            <Sparkles className="h-4 w-4 !text-accent" />
          <AlertTitle className="font-semibold text-accent">AI Suggestion</AlertTitle>
          <AlertDescription>{recommendation}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
