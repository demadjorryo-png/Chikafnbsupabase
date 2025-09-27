'use server';

/**
 * @fileOverview An AI agent for generating short promotional text for receipts.
 *
 * - getReceiptPromo - A function that creates a catchy, one-sentence promo line.
 * - ReceiptPromoInput - The input type for the getReceiptPromo function.
 * - ReceiptPromoOutput - The return type for the getReceiptPromo function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ReceiptPromoInputSchema = z.object({
  activePromotions: z.array(z.string()).describe('A list of currently active loyalty redemption descriptions.'),
});
export type ReceiptPromoInput = z.infer<typeof ReceiptPromoInputSchema>;

const ReceiptPromoOutputSchema = z.object({
  promoText: z.string().describe('A single, short, and catchy promotional sentence in Indonesian.'),
});
export type ReceiptPromoOutput = z.infer<typeof ReceiptPromoOutputSchema>;

export async function getReceiptPromo(
  input: ReceiptPromoInput
): Promise<ReceiptPromoOutput> {
  return receiptPromoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'receiptPromoPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: ReceiptPromoInputSchema },
  output: { schema: ReceiptPromoOutputSchema },
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ],
  },
  prompt: `Anda adalah Chika AI, seorang copywriter kreatif untuk "Kasir POS Chika".

Tugas Anda adalah membuat satu kalimat promosi yang singkat, menarik, dan cocok untuk dicetak di bagian bawah struk belanja.

Gunakan daftar promo aktif berikut sebagai inspirasi utama. Pilih salah satu yang paling menarik untuk dijadikan headline.

Promo Aktif Saat Ini:
{{#if activePromotions}}
{{#each activePromotions}}
- {{{this}}}
{{/each}}
{{else}}
- Tidak ada promo aktif saat ini.
{{/if}}

Contoh output yang baik:
- "Tukar 100 poin Anda & dapatkan potongan Rp 25.000 hari ini!"
- "Dapatkan Liquid Gratis hanya dengan 500 poin!"
- "Kumpulkan terus poinnya dan tukar dengan Merchandise Eksklusif!"

Buat satu kalimat promo yang paling menarik dalam Bahasa Indonesia.`,
});

const receiptPromoFlow = ai.defineFlow(
  {
    name: 'receiptPromoFlow',
    inputSchema: ReceiptPromoInputSchema,
    outputSchema: ReceiptPromoOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
