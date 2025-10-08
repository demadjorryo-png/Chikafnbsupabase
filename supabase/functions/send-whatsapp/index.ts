import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Fonnte API details
const WHATSAPP_TOKEN = 'fa254b2588ad7626d647da23be4d6a08'; // Your actual Fonnte token (deviceId)
const WHATSAPP_URL = 'https://api.fonnte.com/send';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { target, message, isGroup = false } = await req.json()

    if (!target || !message) {
      throw new Error('Target and message are required');
    }

    const fonnteHeaders = {
      'Authorization': WHATSAPP_TOKEN,
      'Content-Type': 'application/json',
    };

    const fonnteBody = {
      target: target,
      message: message,
      countryCode: isGroup ? undefined : '62', // Country code only for individual messages
    };

    const response = await fetch(WHATSAPP_URL, {
      method: 'POST',
      headers: fonnteHeaders,
      body: JSON.stringify(fonnteBody),
    });

    const responseData = await response.json();

    if (!response.ok || (responseData.status === false)) {
        console.error('Fonnte API Error:', responseData);
        throw new Error(`Failed to send message: ${responseData.reason || 'Unknown error'}`)
    }

    return new Response(JSON.stringify({ success: true, detail: responseData.detail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Unhandled error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
