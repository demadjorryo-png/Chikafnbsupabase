
import { NextRequest, NextResponse } from 'next/server';
import { consultWithChika } from '@/ai/flows/app-consultant';
import { Message } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { conversationHistory, userInput } = await req.json();

    if (!Array.isArray(conversationHistory) || !userInput) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const flowResult = await consultWithChika({
      conversationHistory: conversationHistory.map((m: Message) => `${m.sender === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n'),
      userInput: userInput,
    });

    return NextResponse.json(flowResult);
  } catch (error) {
    console.error('Error in consult API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
