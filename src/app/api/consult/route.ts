
import { NextRequest, NextResponse } from 'next/server';
import { consultWithChika } from '@/ai/flows/app-consultant';

export async function POST(req: NextRequest) {
  try {
    const { conversationHistory, userInput } = await req.json();

    if (!Array.isArray(conversationHistory) || !userInput) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // This flow uses a different model and is handled internally.
    const flowResult = await consultWithChika({
      conversationHistory: conversationHistory.map((m) => `${m.sender === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n'),
      userInput: userInput,
    });

    return NextResponse.json(flowResult);
  } catch (error) {
    console.error('Error in consult API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
