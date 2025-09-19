
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
  currentTime: z.string().describe('The current time in HH:mm format (e.g., "14:30").'),
  notificationStyle: z.enum(['fakta', 'pantun']).describe('The desired creative style for the notification. "fakta" for a fun fact, "pantun" for a creative poem.'),
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

Struktur pesan harus rapi dan sopan:
1.  Mulailah dengan sapaan berdasarkan waktu. Gunakan {{currentTime}} sebagai acuan (Pagi: 05-10, Siang: 11-14, Sore: 15-18, Malam: 19-04).
2.  Sapa pelanggan dengan ramah, gunakan panggilan "Kak" sebelum namanya. Contoh: *Selamat Pagi, Kak {{customerName}}!*
3.  Beritahu bahwa pesanan mereka di *[Nama Toko]* sudah siap.
4.  Di bagian tengah, tambahkan sentuhan kreatif berdasarkan "Gaya Notifikasi" yaitu **{{notificationStyle}}**.
    - Jika gayanya 'fakta', **BUAT HANYA SATU FAKTA MENARIK** yang berhubungan dengan salah satu item.
    - Jika gayanya 'pantun', **BUAT HANYA SATU PANTUN UNIK** yang berhubungan dengan salah satu item.
    Bungkus bagian kreatif ini dalam format kutipan agar menonjol.
5.  Tutup dengan ajakan untuk mengambil pesanan dan ucapan terima kasih.

Detail Pesanan:
- Waktu Saat Ini: {{currentTime}}
- Nama Pelanggan: {{customerName}}
- Nama Toko: {{storeName}}
- Item yang Dipesan: {{#each itemsOrdered}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Gaya Notifikasi: {{notificationStyle}}

Contoh output yang baik untuk gaya 'fakta' dan waktu 14:30:
*Selamat Siang, Kak Budi!*

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
