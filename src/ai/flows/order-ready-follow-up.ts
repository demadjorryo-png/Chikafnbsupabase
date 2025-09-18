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
  itemsOrdered: z.array(z.string()).describe('A list of product names included in the order.'),
});
export type OrderReadyFollowUpInput = z.infer<typeof OrderReadyFollowUpInputSchema>;

const OrderReadyFollowUpOutputSchema = z.object({
  followUpMessage: z
    .string()
    .describe(
      'A friendly and concise message in Indonesian to inform the customer their order is ready, including a fun fact about one of the items.'
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
  prompt: `Anda adalah Chika AI, asisten virtual yang ramah dan cerdas untuk Kasir POS Chika.

Tugas Anda adalah membuat pesan singkat untuk memberitahu pelanggan bahwa pesanan mereka sudah siap untuk diambil di kasir. Pesan harus dalam Bahasa Indonesia.

Sebagai sentuhan kreatif, sertakan **satu fakta menarik, kutipan, atau trivia unik** yang berhubungan dengan SALAH SATU item yang dipesan. Buatlah terdengar natural dan tidak kaku.

Detail Pesanan:
- Nama Pelanggan: {{customerName}}
- Nama Toko: {{storeName}}
- Item yang Dipesan: {{#each itemsOrdered}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Contoh: Jika item adalah "Kopi", fakta menariknya bisa tentang sejarah kopi. Jika itemnya adalah "T-Shirt", bisa tentang kapas.

Buat pesan yang jelas, to-the-point, dan sedikit menyenangkan.`,
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
