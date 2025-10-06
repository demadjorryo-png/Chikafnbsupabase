import { NextRequest, NextResponse } from 'next/server';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { adminApp } from '@/lib/firebase-admin';

interface ReceiptPromoInput {
  activePromotions: string[];
  activeStoreName: string;
}

interface ReceiptPromoOutput {
  promoText: string;
}

export async function POST(request: NextRequest) {
  const input: ReceiptPromoInput = await request.json();

  const { activePromotions, activeStoreName } = input;

  if (!activePromotions || !activeStoreName) {
    return NextResponse.json({ error: 'Missing required input parameters' }, { status: 400 });
  }

  try {
    const functions = getFunctions(adminApp);
    const callReceiptPromo = httpsCallable<ReceiptPromoInput, ReceiptPromoOutput>(functions, 'receiptPromoFlow');
    
    const result = await callReceiptPromo(input);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error calling receiptPromoFlow Cloud Function:', error);
    return NextResponse.json({ error: 'Failed to generate receipt promo' }, { status: 500 });
  }
}
