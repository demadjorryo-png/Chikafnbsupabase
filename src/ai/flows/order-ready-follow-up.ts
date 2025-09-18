
'use server';

/**
 * @fileOverview An AI agent for generating order-ready notifications.
 *
 * - getOrderReadyFollowUp - A function that generates a message to inform a customer their order is ready.
 * - OrderReadyFollowUpInput - The input type for the getOrderReadyFollowUp function.
 * - OrderReadyFollowUpOutput - The return type for the getOrderReadyFollowUp function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const OrderReadyFollowUpInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  storeName: z.string().describe('The name of the store where the order was placed.'),
});
export type OrderReadyFollowUpInput = z.infer<typeof OrderReadyFollowUpInputSchema>;

const OrderReadyFollowUpOutputSchema = z.object({
  followUpMessage: z
    .string()
    .describe(
      'A friendly and concise message in Indonesian to inform the customer their order is ready.'
    ),
});
export type OrderReadyFollowUpOutput = z.infer<typeof OrderReadyFollowUpOutputSchema>;

export async function getOrderReadyFollowUp(
  input: OrderReadyFollowUpInput
): Promise<OrderReadyFollowUpOutput> {
  return orderReadyFollowUpFlow(input);
}

const prompt = ai.definePrompt({
  name: 'orderReadyFollowUpPrompt',
  input: { schema: OrderReadyFollowUpInputSchema },
  output: { schema: OrderReadyFollowUpOutputSchema },
  prompt: `Anda adalah Chika AI, asisten virtual untuk Kasir POS Chika.

Tugas Anda adalah membuat pesan singkat dan ramah dalam Bahasa Indonesia untuk memberitahu pelanggan bahwa pesanan mereka sudah siap untuk diambil di kasir.

Detail Pelanggan:
- Nama Pelanggan: {{customerName}}
- Nama Toko: {{storeName}}

Buat pesan yang jelas dan to-the-point.`,
});

const orderReadyFollowUpFlow = ai.defineFlow(
  {
    name: 'orderReadyFollowUpFlow',
    inputSchema: OrderReadyFollowUpInputSchema,
    outputSchema: OrderReadyFollowUpOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
