"use strict";
'use server';
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPromotionRecommendations = getPromotionRecommendations;
/**
 * @fileOverview An AI agent for generating loyalty promotion recommendations.
 *
 * - getPromotionRecommendations - A function that suggests new or updated loyalty promotions.
 * - PromotionRecommendationInput - The input type for thePromotionRecommendationInput function.
 * - PromotionRecommendationOutput - The return type for the getPromotionRecommendations function.
 */
const genkit_1 = require("@/ai/genkit");
const genkit_2 = require("genkit");
const PromotionRecommendationInputSchema = genkit_2.z.object({
    businessDescription: genkit_2.z.string().describe('A brief description of the business (e.g., "kafe", "vape store").'),
    activeStoreName: genkit_2.z.string().describe('The name of the store for context.'),
    currentRedemptionOptions: genkit_2.z.array(genkit_2.z.object({
        description: genkit_2.z.string(),
        pointsRequired: genkit_2.z.number(),
        isActive: genkit_2.z.boolean(),
    })).describe('A list of the current loyalty redemption options.'),
    topSellingProducts: genkit_2.z.array(genkit_2.z.string()).describe('A list of the best-selling products this month.'),
    worstSellingProducts: genkit_2.z.array(genkit_2.z.string()).describe('A list of the worst-selling products this month.'),
});
const RecommendationSchema = genkit_2.z.object({
    title: genkit_2.z.string().describe('A short, catchy title for the recommendation in Indonesian.'),
    description: genkit_2.z.string().describe('A concise, actionable recommendation in Indonesian. This will be the promo description.'),
    justification: genkit_2.z.string().describe('A brief explanation of why this recommendation is being made, in Indonesian.'),
    pointsRequired: genkit_2.z.number().describe('The suggested number of points required for this new promotion.'),
    value: genkit_2.z.number().describe('The suggested value (in Rupiah) of this new promotion, if applicable (e.g., for a discount). For free items, this can be 0.'),
});
const PromotionRecommendationOutputSchema = genkit_2.z.object({
    recommendations: genkit_2.z.array(RecommendationSchema).describe('A list of 2-3 generated promotion recommendations.'),
});
async function getPromotionRecommendations(input) {
    return promotionRecommendationFlow(input);
}
const promptText = `Anda adalah Chika AI, seorang ahli strategi loyalitas untuk sebuah bisnis.

Tugas Anda adalah menganalisis data untuk sebuah bisnis dan menghasilkan 2-3 rekomendasi promosi loyalitas yang kreatif dan dapat ditindaklanjuti. Rekomendasi harus dalam Bahasa Indonesia.

PENTING: Konteks bisnis ini adalah sebuah **{{businessDescription}}**. Pastikan semua rekomendasi Anda relevan dengan jenis bisnis ini. Hindari menyarankan produk atau promo yang tidak sesuai (misalnya, jangan sarankan kopi untuk toko vape, atau sebaliknya).

Data Saat Ini:
- Promo Penukaran Poin Aktif:
{{#each currentRedemptionOptions}}
  - {{description}} ({{pointsRequired}} poin) - Status: {{#if isActive}}Aktif{{else}}Tidak Aktif{{/if}}
{{/each}}
- Produk Terlaris Bulan Ini: {{#each topSellingProducts}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Produk Kurang Laris Bulan Ini: {{#each worstSellingProducts}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Berdasarkan data dan konteks bisnis ini, berikan rekomendasi yang berfokus pada:
1.  **Promo Baru yang Menarik**: Usulkan opsi penukaran baru yang mungkin menarik bagi pelanggan.
2.  **Meningkatkan Penjualan Produk Kurang Laris**: Usulkan promo yang melibatkan produk yang kurang laku.
3.  **Mengoptimalkan Promo yang Ada**: Sarankan untuk menonaktifkan atau mengubah promo yang mungkin kurang efektif.

Setiap rekomendasi HARUS memiliki:
- 'title': Judul yang menarik dan relevan dengan **{{businessDescription}}**.
- 'description': Deskripsi promo yang akan dilihat pelanggan.
- 'justification': Alasan singkat mengapa ini ide yang bagus untuk bisnis ini.
- 'pointsRequired': Jumlah poin yang Anda sarankan untuk promo ini.
- 'value': Nilai promo dalam Rupiah (misal, jika diskon Rp 25.000, value-nya 25000). Jika promo berupa barang gratis (seperti merchandise), value bisa 0.`;
const promotionRecommendationFlow = genkit_1.ai.defineFlow({
    name: 'promotionRecommendationFlow',
    inputSchema: PromotionRecommendationInputSchema,
    outputSchema: PromotionRecommendationOutputSchema,
}, async (input) => {
    const { output } = await genkit_1.ai.generate({
        model: 'openai/gpt-4o-mini',
        prompt: promptText,
        config: {
            maxOutputTokens: 2048,
            temperature: 0.7,
        },
        output: {
            schema: PromotionRecommendationOutputSchema,
        },
    });
    if (!output) {
        throw new Error('AI did not return a valid recommendation.');
    }
    return output;
});
//# sourceMappingURL=promotion-recommendation.js.map