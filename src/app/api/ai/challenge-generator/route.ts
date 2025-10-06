import { NextRequest, NextResponse } from 'next/server';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { admin } from '@/lib/firebase-admin';

interface ChallengeGeneratorInput {
  budget: number;
  startDate: string;
  endDate: string;
  activeStoreName: string;
  businessDescription: string;
}

interface ChallengeSchema {
    tier: string;
    description: string;
    target: number;
    reward: string;
}

interface ChallengeGeneratorOutput {
  challenges: ChallengeSchema[];
  period: string;
}

export async function POST(request: NextRequest) {
  const input: ChallengeGeneratorInput = await request.json();

  if (!input.budget || !input.startDate || !input.endDate || !input.activeStoreName || !input.businessDescription) {
    return NextResponse.json({ error: 'Missing required input parameters' }, { status: 400 });
  }

  try {
  const functions = getFunctions(admin);
    const callChallengeGenerator = httpsCallable<ChallengeGeneratorInput, ChallengeGeneratorOutput>(functions, 'challengeGeneratorFlow');
    
    const result = await callChallengeGenerator(input);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error calling challengeGeneratorFlow Cloud Function:', error);
    return NextResponse.json({ error: 'Failed to generate challenges' }, { status: 500 });
  }
}
