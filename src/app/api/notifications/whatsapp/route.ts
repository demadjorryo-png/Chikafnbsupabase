
import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppNotification, WhatsAppNotificationInput } from '@/ai/flows/whatsapp-notification';

/**
 * API route to send a WhatsApp notification.
 * This acts as a secure proxy between the client-side and the server-side Genkit flow.
 */
export async function POST(req: NextRequest) {
  try {
    const body: WhatsAppNotificationInput = await req.json();

    const { target, message } = body;

    // Basic validation
    if (!target || !message) {
      return NextResponse.json({ error: 'Missing target or message in request body' }, { status: 400 });
    }
    
    // Call the server-side AI flow
    const result = await sendWhatsAppNotification(body);

    if (result.success) {
      return NextResponse.json({ message: 'Notification sent successfully' }, { status: 200 });
    } else {
      console.error('WhatsApp notification flow failed:', result.message);
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

  } catch (err: any) {
    console.error('API Error in /api/notifications/whatsapp:', err?.message ?? err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
