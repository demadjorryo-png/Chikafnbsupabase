import { NextRequest, NextResponse } from 'next/server';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { adminApp } from '@/lib/firebase-admin';

interface OrderReadyFollowUpInput {
  customerName: string;
  storeName: string;
  itemsOrdered: string[];
  currentTime: string;
  notificationStyle: 'fakta' | 'pantun';
}

interface OrderReadyFollowUpOutput {
  followUpMessage: string;
}

export async function POST(request: NextRequest) {
  const input: OrderReadyFollowUpInput = await request.json();

  const { customerName, storeName, itemsOrdered, currentTime, notificationStyle } = input;

  if (!customerName || !storeName || !itemsOrdered || !currentTime || !notificationStyle) {
    return NextResponse.json({ error: 'Missing required input parameters' }, { status: 400 });
  }

  try {
    const functions = getFunctions(adminApp);
    const callOrderReadyFollowUp = httpsCallable<OrderReadyFollowUpInput, OrderReadyFollowUpOutput>(functions, 'orderReadyFollowUpFlow');
    
    const result = await callOrderReadyFollowUp(input);
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error calling orderReadyFollowUpFlow Cloud Function:', error);
    return NextResponse.json({ error: 'Failed to get order ready follow-up message' }, { status: 500 });
  }
}
