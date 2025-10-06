"use strict";
'use server';
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderReadyFollowUp = getOrderReadyFollowUp;
/**
 * @fileOverview An AI agent for generating order-ready notifications.
 *
 * - getOrderReadyFollowUp - A function that generates a message to inform a customer their order is ready.
 * - OrderReadyFollowUpInput - The input type for the getOrderReadyFollowUp function.
 * - OrderReadyFollowUpOutput - The return type for the getOrderReadyFollowUp function.
 */
const genkit_1 = require("@/ai/genkit");
const genkit_2 = require("genkit");
const OrderReadyFollowUpInputSchema = genkit_2.z.object({
    customerName: genkit_2.z.string().describe('The name of the customer.'),
    storeName: genkit_2.z.string().describe('The name of the store where the order was placed.'),
    itemsOrdered: genkit_2.z.array(genkit_2.z.string()).describe('A list of product names included in the order.'),
    currentTime: genkit_2.z.string().describe('The current time in HH:mm format (e.g., "14:30").'),
    notificationStyle: genkit_2.z.enum(['fakta', 'pantun']).describe('The desired creative style for the notification. "fakta" for a fun fact, "pantun" for a creative poem.'),
});
const OrderReadyFollowUpOutputSchema = genkit_2.z.object({
    followUpMessage: genkit_2.z
        .string()
        .describe('A friendly and concise message in Indonesian to inform the customer their order is ready, including a fun fact, quote, or pantun about one of the items.'),
});
const prompt = genkit_1.ai.definePrompt({
    name: 'orderReadyFollowUpPrompt',
    input: { schema: OrderReadyFollowUpInputSchema },
    output: { schema: OrderReadyFollowUpOutputSchema },
    prompt: `Anda adalah Chika AI, asisten virtual yang ramah dan cerdas untuk kafe/restoran: {{activeStoreName}}..

Tugas Anda adalah membuat pesan notifikasi WhatsApp yang terstruktur dan menarik untuk memberitahu pelanggan bahwa pesanan mereka sudah siap untuk diambil. Pesan harus dalam Bahasa Indonesia dan menggunakan format Markdown WhatsApp (misalnya, *teks tebal*).

Struktur pesan harus rapi dan sopan:
1.  Mulailah dengan sapaan berdasarkan waktu. Gunakan {{currentTime}} sebagai acuan (Pagi: 05-10, Siang: 11-14, Sore: 15-18, Malam: 19-04).
2.  Sapa pelanggan dengan ramah, gunakan panggilan "Kak" sebelum namanya. Contoh: *Selamat Pagi, Kak {{customerName}}!*
3.  Beritahu bahwa pesanan mereka di *{{storeName}}* sudah siap.
4.  Di bagian tengah, Anda HARUS menyertakan satu sentuhan kreatif berdasarkan "Gaya Notifikasi" (**{{notificationStyle}}**). Bagian ini wajib ada.
    - Jika gayanya 'fakta': Berikan SATU fakta menarik tentang salah satu item pesanan ({{itemsOrdered}}). Jika tidak ada fakta spesifik, berikan fakta umum tentang makanan/minuman.
    - Jika gayanya 'pantun': Buat SATU pantun unik tentang salah satu item pesanan ({{itemsOrdered}}).
    Bungkus bagian kreatif ini dalam format kutipan Markdown. Contoh: \`> _Fakta menarik Anda di sini..._\`
5.  Tutup dengan ajakan untuk mengambil pesanan dan ucapan terima kasih.

Detail Pesanan:
- Waktu Saat Ini: {{currentTime}}
- Nama Pelanggan: {{customerName}}
- Nama Toko: {{storeName}}
- Item yang Dipesan: {{#each itemsOrdered}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Gaya Notifikasi: {{notificationStyle}}

Contoh output yang baik untuk gaya 'fakta' dan waktu 14:30:
*Selamat Siang, Kak Budi!*

Pesanan Anda di *Kafe Chika* sudah siap diambil di kasir.

> _Tahukah Anda? Kopi adalah minuman kedua yang paling banyak dikonsumsi di dunia setelah air!_

Silakan segera diambil ya. Terima kasih!

Buat pesan yang jelas, menyenangkan, dan profesional.`,
    config: {
        model: 'openai/gpt-4o-mini',
    },
});
const orderReadyFollowUpFlow = genkit_1.ai.defineFlow({
    name: 'orderReadyFollowUpFlow',
    inputSchema: OrderReadyFollowUpInputSchema,
    outputSchema: OrderReadyFollowUpOutputSchema,
}, async (input) => {
    const { output } = await prompt(input);
    return output;
});
function getGreeting(time) {
    const hour = parseInt(time.split(':')[0], 10);
    if (hour >= 5 && hour < 11)
        return 'Selamat Pagi';
    if (hour >= 11 && hour < 15)
        return 'Selamat Siang';
    if (hour >= 15 && hour < 19)
        return 'Selamat Sore';
    return 'Selamat Malam';
}
async function getOrderReadyFollowUp(input) {
    try {
        let attempts = 0;
        const maxAttempts = 5;
        let delay = 2000;
        while (attempts < maxAttempts) {
            try {
                return await orderReadyFollowUpFlow(input);
            }
            catch (error) {
                attempts++;
                const jitter = Math.floor(Math.random() * 1000);
                const retryDelay = delay + jitter;
                console.warn(`Attempt ${attempts} failed for order ready flow. Retrying in ${retryDelay / 1000}s...`, error);
                if (attempts >= maxAttempts) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                delay *= 2;
            }
        }
        throw new Error('All attempts failed');
    }
    catch (finalError) {
        console.error('All AI attempts failed. Generating a fallback message.', finalError);
        const greeting = getGreeting(input.currentTime);
        const fallbackMessage = `*${greeting}, Kak ${input.customerName}!*\
\
Pesanan Anda di *${input.storeName}* sudah siap diambil di kasir.\
\
Silakan segera diambil ya. Terima kasih!`;
        return {
            followUpMessage: fallbackMessage,
        };
    }
}
//# sourceMappingURL=order-ready-follow-up.js.map