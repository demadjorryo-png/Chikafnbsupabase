import { NextRequest, NextResponse } from 'next/server';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { adminApp } from '@/lib/firebase-admin';

interface BirthdayFollowUpInput {
  storeId: string;
  customerName: string;
  birthDate: string; // YYYY-MM-DD
  productName: string;
  discountPercentage: number;
  validUntil: string; // YYYY-MM-DD
}

interface BirthdayFollowUpOutput {
  whatsappMessage: string;
}

export async function POST(request: NextRequest) {
  const input: BirthdayFollowUpInput = await request.json();

  const { storeId, customerName, birthDate, productName, discountPercentage, validUntil } = input;

  if (!storeId || !customerName || !birthDate || !productName || !discountPercentage || !validUntil) {
    return NextResponse.json({ error: 'Missing required input parameters' }, { status: 400 });
  }

  try {
    const functions = getFunctions(adminApp);
    const callBirthdayFollowUp = httpsCallable<BirthdayFollowUpInput, BirthdayFollowUpOutput>(functions, 'birthdayFollowUpFlow');
    
    const result = await callBirthdayFollowUp(input);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error calling birthdayFollowUpFlow Cloud Function:', error);
    return NextResponse.json({ error: 'Failed to generate birthday follow-up message' }, { status: 500 });
  }
}
