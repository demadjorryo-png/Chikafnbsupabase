
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
import type { TransactionFeeSettings } from '@/lib/app-settings';
import { AIConfirmationDialog } from './ai-confirmation-dialog';
import { useAuth } from '@/contexts/auth-context';

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
  const { activeStore } = useAuth();
  const [recommendation, setRecommendation] = React.useState('');
  const [redemptionOptions, setRedemptionOptions] = React.useState<RedemptionOption[]>([]);
  const { toast } = useToast();
  
  React.useEffect(() => {
    if (!activeStore) return;
    const fetchRedemptionOptions = async () => {
        try {
            const q = query(collection(db, 'stores', activeStore.id, 'redemptionOptions'), where('isActive', '==', true));
            const querySnapshot = await getDocs(q);
            const options = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RedemptionOption));
            setRedemptionOptions(options);
        } catch (error) {
            console.error("Failed to fetch redemption options for AI", error);
            toast({ variant: 'destructive', title: 'Gagal memuat data promo aktif.'});
        }
    }
    fetchRedemptionOptions();
  }, [toast, activeStore]);


  const handleGetRecommendation = async () => {
    if (redemptionOptions.length === 0) {
        toast({ variant: 'destructive', title: 'Tidak Ada Promo Aktif', description: 'Tidak ada promo penukaran poin yang dapat direkomendasikan saat ini.' });
        throw new Error('No active redemption options');
    }
    setRecommendation('');
    return getLoyaltyPointRecommendation({
      loyaltyPoints: customer.loyaltyPoints,
      totalPurchaseAmount,
      availableRedemptionOptions: redemptionOptions,
    });
  };

  return (
    <div className="space-y-2">
      <AIConfirmationDialog
        featureName="Rekomendasi Poin"
        featureDescription="Chika AI akan menganalisis poin pelanggan dan total belanja untuk memberikan saran penukaran poin terbaik."
        feeSettings={feeSettings}
        onConfirm={handleGetRecommendation}
        onSuccess={(result) => setRecommendation(result.recommendation)}
      >
        <Button
          variant="outline"
          className="w-full border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          <span>Rekomendasi Poin AI</span>
        </Button>
      </AIConfirmationDialog>

      {recommendation && (
        <Alert className="border-accent bg-accent/10">
            <Sparkles className="h-4 w-4 !text-accent" />
          <AlertTitle className="font-semibold text-accent">Saran AI</AlertTitle>
          <AlertDescription>{recommendation}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
