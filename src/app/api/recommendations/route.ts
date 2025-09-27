
import { NextRequest, NextResponse } from 'next/server';
import { getAdminRecommendations } from '@/ai/flows/admin-recommendation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // It's good practice to validate the input from the client
    const { totalRevenueLastWeek, totalRevenueLastMonth, topSellingProducts, worstSellingProducts } = body;
    if (typeof totalRevenueLastWeek !== 'number' || typeof totalRevenueLastMonth !== 'number' || !Array.isArray(topSellingProducts) || !Array.isArray(worstSellingProducts)) {
        return NextResponse.json({ error: 'Invalid input parameters' }, { status: 400 });
    }

    const recommendations = await getAdminRecommendations({
        totalRevenueLastWeek,
        totalRevenueLastMonth,
        topSellingProducts,
        worstSellingProducts,
    });

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Error in recommendations API:', error);
    // You might want to log the error or handle it in a more sophisticated way
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
