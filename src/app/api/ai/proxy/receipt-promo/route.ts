import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface ReceiptPromoInput {
  activePromotions: string[];
  activeStoreName: string;
}

interface ReceiptPromoOutput {
  promoText: string;
}

// Very small example of a server-side proxy endpoint that forwards requests to
// a specific AI flow. This endpoint includes basic in-memory rate limiting and
// simple logging. Adapt/replace with production-appropriate rate limiters and
// authentication (e.g., Supabase auth token checks) as needed.

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

const ipRequestLog = new Map<string, { count: number; windowStart: number }>();

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    // Basic rate limiting
    const now = Date.now();
    const entry = ipRequestLog.get(ip) || { count: 0, windowStart: now };
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      entry.count = 0;
      entry.windowStart = now;
    }
    entry.count += 1;
    ipRequestLog.set(ip, entry);

    if (entry.count > MAX_REQUESTS_PER_WINDOW) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json();
    const input: ReceiptPromoInput = body?.input;
    if (!input) {
      return NextResponse.json({ error: 'Missing input in request body' }, { status: 400 });
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

    const response = await fetch(`${supabaseUrl}/functions/v1/receipt-promo-flow`, {
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

    // Optionally log or persist an audit record here (don't log secrets)
    // e.info('AI proxy used by', ip, 'flow=receiptPromo');

    return NextResponse.json(result);
  } catch (err: unknown) {
    let message = 'Internal Server Error';
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      message = (err as { message: string }).message;
    }
    console.error('AI proxy error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
