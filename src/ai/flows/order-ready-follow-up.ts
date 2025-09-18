
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
      'A friendly and concise message in Indonesian to inform the customer their order is ready, including a fun fact, quote, or pantun about one of the items.'
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

Tugas Anda adalah membuat pesan notifikasi WhatsApp yang terstruktur dan menarik untuk memberitahu pelanggan bahwa pesanan mereka sudah siap untuk diambil. Pesan harus dalam Bahasa Indonesia dan menggunakan format Markdown WhatsApp (misalnya, *teks tebal*).

Struktur pesan harus rapi:
1.  Sapa pelanggan dengan ramah (*Halo [Nama Pelanggan]!*).
2.  Beritahu bahwa pesanan mereka di *[Nama Toko]* sudah siap.
3.  Di bagian tengah, tambahkan sentuhan kreatif: **satu fakta menarik, kutipan, atau pantun unik** yang berhubungan dengan SALAH SATU item yang dipesan. Bungkus bagian ini dalam format kutipan (misalnya, dengan garis bawah atau tanda kutip) agar menonjol.
4.  Tutup dengan ajakan untuk mengambil pesanan dan ucapan terima kasih.

Detail Pesanan:
- Nama Pelanggan: {{customerName}}
- Nama Toko: {{storeName}}
- Item yang Dipesan: {{#each itemsOrdered}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Contoh output yang baik:
*Halo Budi!*

Pesanan Anda di *Toko Chika* sudah siap diambil di kasir.

> _Tahukah Anda? Kopi adalah minuman kedua yang paling banyak dikonsumsi di dunia setelah air!_

Silakan segera diambil ya. Terima kasih!

Buat pesan yang jelas, menyenangkan, dan profesional.`,
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
