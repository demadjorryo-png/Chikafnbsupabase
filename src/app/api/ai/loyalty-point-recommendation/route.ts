import { NextRequest, NextResponse } from 'next/server';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { admin } from '@/lib/firebase-admin';

interface RedemptionOption {
  description: string;
  pointsRequired: number;
  isActive: boolean;
}

interface LoyaltyPointRecommendationInput {
  loyaltyPoints: number;
  totalPurchaseAmount: number;
  availableRedemptionOptions: RedemptionOption[];
}

interface LoyaltyPointRecommendationOutput {
  recommendation: string;
}

export async function POST(request: NextRequest) {
  const input: LoyaltyPointRecommendationInput = await request.json();

  const { loyaltyPoints, totalPurchaseAmount, availableRedemptionOptions } = input;

  if (loyaltyPoints === undefined || totalPurchaseAmount === undefined || !availableRedemptionOptions) {
    return NextResponse.json({ error: 'Missing required input parameters' }, { status: 400 });
  }

  try {
  const functions = getFunctions(admin);
    const callLoyaltyPointRecommendation = httpsCallable<LoyaltyPointRecommendationInput, LoyaltyPointRecommendationOutput>(functions, 'loyaltyPointRecommendationFlow');
    
    const result = await callLoyaltyPointRecommendation(input);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error calling loyaltyPointRecommendationFlow Cloud Function:', error);
    return NextResponse.json({ error: 'Failed to get loyalty point recommendation' }, { status: 500 });
  }
}
