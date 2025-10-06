import { NextRequest, NextResponse } from 'next/server';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { admin } from '@/lib/firebase-admin';

interface BusinessAnalystInput {
  conversationHistory: string;
  userInput: string;
  businessType?: 'fnb' | 'retail'; // Tambahkan businessType
}

interface BusinessAnalystOutput {
  response: string;
  shouldEscalateToAdmin: boolean;
  escalationMessage?: string;
}

export async function POST(request: NextRequest) {
  const input: BusinessAnalystInput = await request.json();

  const { conversationHistory, userInput, businessType } = input;

  if (!conversationHistory || !userInput) {
    return NextResponse.json({ error: 'Missing required input parameters' }, { status: 400 });
  }

  try {
  const functions = getFunctions(admin);
    const callBusinessAnalyst = httpsCallable<BusinessAnalystInput, BusinessAnalystOutput>(functions, 'askChika');
    
    const result = await callBusinessAnalyst(input);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error calling askChika Cloud Function:', error);
    return NextResponse.json({ error: 'Failed to get business analyst response' }, { status: 500 });
  }
}
