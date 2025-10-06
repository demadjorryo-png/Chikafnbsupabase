import { NextRequest, NextResponse } from 'next/server';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { admin } from '@/lib/firebase-admin';

interface PromotionRecommendationInput {
  businessDescription: string;
  activeStoreName: string;
  currentRedemptionOptions: Array<{ description: string; pointsRequired: number; isActive: boolean; }>;
  topSellingProducts: string[];
  worstSellingProducts: string[];
}

interface RecommendationSchema {
  title: string;
  description: string;
  justification: string;
  pointsRequired: number;
  value: number;
}

interface PromotionRecommendationOutput {
  recommendations: RecommendationSchema[];
}

export async function POST(request: NextRequest) {
  const input: PromotionRecommendationInput = await request.json();

  const { businessDescription, activeStoreName, currentRedemptionOptions, topSellingProducts, worstSellingProducts } = input;

  if (!businessDescription || !activeStoreName || !currentRedemptionOptions || !topSellingProducts || !worstSellingProducts) {
    return NextResponse.json({ error: 'Missing required input parameters' }, { status: 400 });
  }

  try {
  const functions = getFunctions(admin);
    const callPromotionRecommendation = httpsCallable<PromotionRecommendationInput, PromotionRecommendationOutput>(functions, 'promotionRecommendationFlow');
    
    const result = await callPromotionRecommendation(input);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error calling promotionRecommendationFlow Cloud Function:', error);
    return NextResponse.json({ error: 'Failed to get promotion recommendations' }, { status: 500 });
  }
}
