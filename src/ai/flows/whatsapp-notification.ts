
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
  isGroup: z.boolean().optional().describe('Set to true if sending to a group.'),
  target: z.string().describe('The recipient\'s phone number (e.g., 6281234567890) or group name.'),
  message: z.string().describe('The text message to send.'),
});
export type WhatsAppNotificationInput = z.infer<typeof WhatsAppNotificationInputSchema>;

export async function sendWhatsAppNotification(
  input: WhatsAppNotificationInput
): Promise<{ success: boolean; message: string }> {
  return whatsAppNotificationFlow(input);
}

interface WhaCenterResponse {
  status: 'success' | 'error';
  reason?: string;
}

const whatsAppNotificationFlow = ai.defineFlow(
  {
    name: 'whatsAppNotificationFlow',
    inputSchema: WhatsAppNotificationInputSchema,
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async ({ isGroup, target, message }) => {
    try {
      const { deviceId } = await getWhatsappSettings();

      if (!deviceId) {
        throw new Error('WhatsApp Device ID is not configured in settings.');
      }
      
      const endpoint = isGroup ? 'sendGroup' : 'send';
      const targetParam = isGroup ? 'group' : 'number';

      const webhookUrl = `https://app.whacenter.com/api/${endpoint}?device_id=${deviceId}&${targetParam}=${encodeURIComponent(
        target
      )}&message=${encodeURIComponent(
        message
      )}`;

      const response = await fetch(webhookUrl);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('WhaCenter API Error:', errorBody);
        throw new Error(`WhaCenter API responded with status ${response.status}`);
      }
      
      const responseJson: WhaCenterResponse = await response.json();
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
