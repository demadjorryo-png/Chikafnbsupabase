import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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
    // Call Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Supabase URL is not configured.' }, { status: 500 });
    }

    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.getSession();
    let accessToken = tokenData?.session?.access_token;

    if (tokenError || !accessToken) {
        console.warn("Could not get access token for Edge Function call, proceeding without it.", tokenError);
        // Optionally, handle this error more strictly if the Edge Function requires authentication.
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/consult-with-chika`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to call Edge Function');
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error calling consultWithChika Edge Function:', error);
    return NextResponse.json({ error: 'Failed to get app consultant response' }, { status: 500 });
  }
}
