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

export async function POST(req: NextRequest) {
  try {
    const { conversationHistory, userInput, businessType } = await req.json();

    if (!conversationHistory || !userInput) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

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
      body: JSON.stringify({
        conversationHistory,
        userInput,
        businessType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to call Edge Function');
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in consult API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
