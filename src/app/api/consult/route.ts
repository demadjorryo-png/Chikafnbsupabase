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

export async function POST(req: NextRequest) {
  try {
    const { conversationHistory, userInput, businessType } = await req.json();

    if (!conversationHistory || !userInput) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

  const functions = getFunctions(admin);
    const callConsultWithChika = httpsCallable<AppConsultantInput, AppConsultantOutput>(functions, 'consultWithChika');

    const result = await callConsultWithChika({
      conversationHistory: conversationHistory,
      userInput: userInput,
      businessType: businessType, // Teruskan businessType jika ada
    });

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error in consult API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
