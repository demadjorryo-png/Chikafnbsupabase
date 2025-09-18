
'use server';
/**
 * @fileOverview A utility flow for sending WhatsApp notifications via WhaCenter webhook.
 *
 * - sendWhatsAppNotification - A function that sends a message to a phone number.
 * - WhatsAppNotificationInput - The input type for the sendWhatsAppNotification function.
 */

import { ai } from '@/ai/genkit';
import { getWhatsappSettings } from '@/lib/whatsapp-settings';
import { z } from 'genkit';

const WhatsAppNotificationInputSchema = z.object({
  phoneNumber: z.string().describe('The recipient\'s phone number in international format (e.g., 6281234567890).'),
  message: z.string().describe('The text message to send.'),
});
export type WhatsAppNotificationInput = z.infer<typeof WhatsAppNotificationInputSchema>;

export async function sendWhatsAppNotification(
  input: WhatsAppNotificationInput
): Promise<{ success: boolean; message: string }> {
  return whatsAppNotificationFlow(input);
}

const whatsAppNotificationFlow = ai.defineFlow(
  {
    name: 'whatsAppNotificationFlow',
    inputSchema: WhatsAppNotificationInputSchema,
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async ({ phoneNumber, message }) => {
    try {
      const { deviceId } = await getWhatsappSettings();

      if (!deviceId) {
        throw new Error('WhatsApp Device ID is not configured in settings.');
      }

      const webhookUrl = `https://app.whacenter.com/api/send?device_id=${deviceId}&number=${phoneNumber}&message=${encodeURIComponent(
        message
      )}`;

      const response = await fetch(webhookUrl);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('WhaCenter API Error:', errorBody);
        throw new Error(`WhaCenter API responded with status ${response.status}`);
      }
      
      const responseJson: any = await response.json();
      if(responseJson.status === 'error'){
        console.error('WhaCenter API Error:', responseJson.reason);
        throw new Error(responseJson.reason);
      }

      return { success: true, message: 'Notification sent successfully.' };
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, message: errorMessage };
    }
  }
);
