import { NextRequest, NextResponse } from 'next/server';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { adminApp } from '@/lib/firebase-admin';

interface AdminRecommendationInput {
  businessDescription: string;
  totalRevenueLastWeek: number;
  totalRevenueLastMonth: number;
  topSellingProducts: string[];
  worstSellingProducts: string[];
}

interface AdminRecommendationOutput {
  weeklyRecommendation: string;
  monthlyRecommendation: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // It's good practice to validate the input from the client
    const { businessDescription, totalRevenueLastWeek, totalRevenueLastMonth, topSellingProducts, worstSellingProducts } = body;
    if (typeof businessDescription !== 'string' || typeof totalRevenueLastWeek !== 'number' || typeof totalRevenueLastMonth !== 'number' || !Array.isArray(topSellingProducts) || !Array.isArray(worstSellingProducts)) {
        return NextResponse.json({ error: 'Invalid input parameters' }, { status: 400 });
    }

    const functions = getFunctions(adminApp);
    const callAdminRecommendation = httpsCallable<AdminRecommendationInput, AdminRecommendationOutput>(functions, 'adminRecommendationFlow');

    const result = await callAdminRecommendation({
        businessDescription,
        totalRevenueLastWeek,
        totalRevenueLastMonth,
        topSellingProducts,
        worstSellingProducts,
    });

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in recommendations API:', error);
    // You might want to log the error or handle it in a more sophisticated way
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
