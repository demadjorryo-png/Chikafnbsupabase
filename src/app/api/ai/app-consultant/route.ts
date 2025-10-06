import { NextRequest, NextResponse } from 'next/server';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { admin } from '@/lib/firebase-admin';

interface AppConsultantInput {
  conversationHistory: string;
  userInput: string;
  businessType?: 'fnb' | 'retail';
}

interface AppConsultantOutput {
  response: string;
  shouldEscalateToAdmin: boolean;
  escalationMessage?: string;
}

export async function POST(request: NextRequest) {
  const input: AppConsultantInput = await request.json();

  const { conversationHistory, userInput, businessType } = input;

  if (!conversationHistory || !userInput) {
    return NextResponse.json({ error: 'Missing required input parameters' }, { status: 400 });
  }

  try {
  const functions = getFunctions(admin);
    const callAppConsultant = httpsCallable<AppConsultantInput, AppConsultantOutput>(functions, 'consultWithChika');
    
    const result = await callAppConsultant(input);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error calling consultWithChika Cloud Function:', error);
    return NextResponse.json({ error: 'Failed to get app consultant response' }, { status: 500 });
  }
}
