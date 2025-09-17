'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader, Sparkles } from 'lucide-react';
import type { Customer } from '@/lib/types';
import { getLoyaltyPointRecommendation } from '@/ai/flows/loyalty-point-recommendation';
import { redemptionOptions } from '@/lib/data';

type LoyaltyRecommendationProps = {
  customer: Customer;
  totalPurchaseAmount: number;
};

export function LoyaltyRecommendation({
  customer,
  totalPurchaseAmount,
}: LoyaltyRecommendationProps) {
  const [recommendation, setRecommendation] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleGetRecommendation = async () => {
    setIsLoading(true);
    setRecommendation('');
    try {
      // Filter for active redemption options only
      const activeRedemptionOptions = redemptionOptions.filter(o => o.isActive);

      const result = await getLoyaltyPointRecommendation({
        loyaltyPoints: customer.loyaltyPoints,
        totalPurchaseAmount,
        availableRedemptionOptions: activeRedemptionOptions,
      });
      setRecommendation(result.recommendation);
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
        <span>Get AI Point Recommendation</span>
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
