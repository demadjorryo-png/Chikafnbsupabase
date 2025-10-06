"use strict";
'use server';
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReceiptPromo = getReceiptPromo;
/**
 * @fileOverview An AI agent for generating short promotional text for receipts.
 *
 * - getReceiptPromo - A function that creates a catchy, one-sentence promo line.
 * - ReceiptPromoInput - The input type for the getReceiptPromo function.
 * - ReceiptPromoOutput - The return type for the getReceiptPromo function.
 */
const genkit_1 = require("@/ai/genkit");
const genkit_2 = require("genkit");
const ReceiptPromoInputSchema = genkit_2.z.object({
    activePromotions: genkit_2.z.array(genkit_2.z.string()).describe('A list of currently active loyalty redemption descriptions.'),
    activeStoreName: genkit_2.z.string().describe('The name of the store for context.'),
});
const ReceiptPromoOutputSchema = genkit_2.z.object({
    promoText: genkit_2.z.string().describe('A single, short, and catchy promotional sentence in Indonesian.'),
});
async function getReceiptPromo(input) {
    return receiptPromoFlow(input);
}
const promptText = `Anda adalah Chika AI, seorang copywriter kreatif untuk kafe/restoran.

Tugas Anda adalah membuat satu kalimat promosi yang singkat, menarik, dan cocok untuk dicetak di bagian bawah struk belanja.

Gunakan daftar promo aktif berikut sebagai inspirasi utama. Pilih salah satu yang paling menarik untuk dijadikan headline.

Promo Aktif Saat Ini:
{{#if activePromotions}}
{{#each activePromotions}}
- {{{this}}}
{{/each}}
{{else}}
- Tidak ada promo aktif saat ini.
{{/if}

Contoh output yang baik:
- "Tukar 100 poin Anda & dapatkan potongan Rp 25.000 hari ini!"
- "Dapatkan Liquid Gratis hanya dengan 500 poin!"
- "Kumpulkan terus poinnya dan tukar dengan Merchandise Eksklusif!"

Buat satu kalimat promo yang paling menarik dalam Bahasa Indonesia.`;
const receiptPromoFlow = genkit_1.ai.defineFlow({
    name: 'receiptPromoFlow',
    inputSchema: ReceiptPromoInputSchema,
    outputSchema: ReceiptPromoOutputSchema,
}, async (input) => {
    const { output } = await genkit_1.ai.generate({
        model: 'openai/gpt-4o-mini',
        prompt: promptText,
        output: {
            schema: ReceiptPromoOutputSchema,
        },
    });
    if (!output) {
        throw new Error('AI did not return a valid promo text.');
    }
    return output;
});
//# sourceMappingURL=receipt-promo-generator.js.map