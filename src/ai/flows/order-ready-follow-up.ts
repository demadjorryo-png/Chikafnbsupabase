
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// ... (schema definitions remain the same) ...

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

const prompt = ai.definePrompt({
  name: 'orderReadyFollowUpPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: OrderReadyFollowUpInputSchema },
  output: { schema: OrderReadyFollowUpOutputSchema },
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ],
  },
  prompt: `Anda adalah Chika AI, asisten virtual yang ramah dan cerdas untuk Kasir POS Chika.\n\nTugas Anda adalah membuat pesan notifikasi WhatsApp yang terstruktur dan menarik untuk memberitahu pelanggan bahwa pesanan mereka sudah siap untuk diambil. Pesan harus dalam Bahasa Indonesia dan menggunakan format Markdown WhatsApp (misalnya, *teks tebal*).\n\nStruktur pesan harus rapi dan sopan:\n1.  Mulailah dengan sapaan berdasarkan waktu. Gunakan {{currentTime}} sebagai acuan (Pagi: 05-10, Siang: 11-14, Sore: 15-18, Malam: 19-04).\n2.  Sapa pelanggan dengan ramah, gunakan panggilan "Kak" sebelum namanya. Contoh: *Selamat Pagi, Kak {{customerName}}!*\n3.  Beritahu bahwa pesanan mereka di *[Nama Toko]* sudah siap.\n4.  Di bagian tengah, tambahkan sentuhan kreatif berdasarkan "Gaya Notifikasi" yaitu **{{notificationStyle}}**.\n    - Jika gayanya 'fakta', **BUAT HANYA SATU FAKTA MENARIK** yang berhubungan dengan salah satu item.\n    - Jika gayanya 'pantun', **BUAT HANYA SATU PANTUN UNIK** yang berhubungan dengan salah satu item.\n    Bungkus bagian kreatif ini dalam format kutipan agar menonjol.\n5.  Tutup dengan ajakan untuk mengambil pesanan dan ucapan terima kasih.\n\nDetail Pesanan:\n- Waktu Saat Ini: {{currentTime}}\n- Nama Pelanggan: {{customerName}}\n- Nama Toko: {{storeName}}\n- Item yang Dipesan: {{#each itemsOrdered}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}\n- Gaya Notifikasi: {{notificationStyle}}\n\nContoh output yang baik untuk gaya 'fakta' dan waktu 14:30:\n*Selamat Siang, Kak Budi!*\n\nPesanan Anda di *Toko Chika* sudah siap diambil di kasir.\n\n> _Tahukah Anda? Kopi adalah minuman kedua yang paling banyak dikonsumsi di dunia setelah air!_\n\nSilakan segera diambil ya. Terima kasih!\n\nBuat pesan yang jelas, menyenangkan, dan profesional.`,
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

function getGreeting(time: string): string {
    const hour = parseInt(time.split(':')[0], 10);
    if (hour >= 5 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 19) return 'Selamat Sore';
    return 'Selamat Malam';
}

export async function getOrderReadyFollowUp(
  input: OrderReadyFollowUpInput
): Promise<OrderReadyFollowUpOutput> {
  try {
    let attempts = 0;
    const maxAttempts = 5;
    let delay = 2000;

    while (attempts < maxAttempts) {
      try {
        return await orderReadyFollowUpFlow(input);
      } catch (error) {
        attempts++;
        const jitter = Math.floor(Math.random() * 1000);
        const retryDelay = delay + jitter;
        
        console.warn(`Attempt ${attempts} failed for order ready flow. Retrying in ${retryDelay / 1000}s...`, error);
        
        if (attempts >= maxAttempts) {
          throw error; // Re-throw after final attempt fails
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        delay *= 2;
      }
    }
    // This part is unreachable due to the throw in the loop, but required by TypeScript
    throw new Error('All attempts failed');

  } catch (finalError) {
    console.error('All AI attempts failed. Generating a fallback message.', finalError);

    const greeting = getGreeting(input.currentTime);
    const fallbackMessage = 
`*${greeting}, Kak ${input.customerName}!*\
\
Pesanan Anda di *${input.storeName}* sudah siap diambil di kasir.\
\
Silakan segera diambil ya. Terima kasih!`;

    return {
      followUpMessage: fallbackMessage,
    };
  }
}
