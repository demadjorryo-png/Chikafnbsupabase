"use strict";
'use server';
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminRecommendations = getAdminRecommendations;
/**
 * @fileOverview An AI agent for generating business recommendations for admins.
 *
 * - getAdminRecommendations - A function that provides weekly and monthly strategic advice.
 * - AdminRecommendationInput - The input type for the getAdminRecommendations function.
 * - AdminRecommendationOutput - The return type for the getAdminRecommendations function.
 */
const genkit_1 = require("@/ai/genkit");
const genkit_2 = require("genkit");
const AdminRecommendationInputSchema = genkit_2.z.object({
    businessDescription: genkit_2.z.string().describe('A brief description of the business (e.g., "kafe", "vape store").'),
    totalRevenueLastWeek: genkit_2.z.number().describe('Total revenue from the previous week.'),
    totalRevenueLastMonth: genkit_2.z.number().describe('Total revenue from the previous month.'),
    topSellingProducts: genkit_2.z.array(genkit_2.z.string()).describe('A list of the best-selling products.'),
    worstSellingProducts: genkit_2.z.array(genkit_2.z.string()).describe('A list of the worst-selling products.'),
});
const AdminRecommendationOutputSchema = genkit_2.z.object({
    weeklyRecommendation: genkit_2.z.string().describe('A concise, actionable weekly recommendation in Indonesian.'),
    monthlyRecommendation: genkit_2.z.string().describe('A high-level monthly strategic recommendation in Indonesian.'),
});
async function getAdminRecommendations(input) {
    return adminRecommendationFlow(input);
}
const promptText = `Anda adalah Chika AI, seorang analis bisnis ahli untuk Kasir POS Chika. Anda sedang memberikan saran untuk sebuah **{{businessDescription}}**.

Tugas Anda adalah memberikan rekomendasi strategis mingguan dan bulanan untuk admin toko berdasarkan data kinerja berikut. Rekomendasi harus singkat, dapat ditindaklanjuti, relevan dengan jenis bisnis, dan dalam Bahasa Indonesia.

Data Kinerja:
- Total Pendapatan Minggu Lalu: Rp {{totalRevenueLastWeek}}
- Total Pendapatan Bulan Lalu: Rp {{totalRevenueLastMonth}}
{{#if topSellingProducts.length}}
- Produk Terlaris: {{#each topSellingProducts}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{#if worstSellingProducts.length}}
- Produk Kurang Laris: {{#each worstSellingProducts}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
{{else}}
- Produk Kurang Laris: Tidak ada data produk yang berkinerja buruk secara signifikan.
{{/if}}

Berdasarkan data ini:

1.  Buat **rekomendasi mingguan** yang berfokus pada tindakan jangka pendek. Pastikan saran Anda relevan untuk sebuah **{{businessDescription}}**.
    {{#if worstSellingProducts.length}}
    Contoh: Sarankan promosi \'bundling\' untuk produk yang kurang laris dengan produk terlaris, atau adakan acara \'happy hour\' pada hari-hari sepi.\
    {{else}}
    Contoh: Karena semua produk berkinerja baik, sarankan untuk fokus pada peningkatan interaksi pelanggan, seperti meminta ulasan atau menjalankan promosi di media sosial untuk meningkatkan kunjungan.\
    {{/if}}

2.  Buat **rekomendasi bulanan** yang berfokus pada strategi jangka panjang dan relevan untuk sebuah **{{businessDescription}}**.
    {{#if worstSellingProducts.length}}
    Contoh: Sarankan untuk mengurangi stok produk yang kurang laris dan bernegosiasi dengan pemasok untuk harga yang lebih baik pada produk terlaris, atau usulkan program loyalitas baru.\
    {{else}}
    Contoh: Sarankan untuk mengeksplorasi kategori produk baru yang komplementer atau berinvestasi dalam program loyalitas untuk mempertahankan momentum penjualan yang positif.\
    {{/if}}

Pastikan rekomendasi Anda berbeda untuk mingguan dan bulanan. Gunakan nada yang profesional namun memotivasi.`;
const adminRecommendationFlow = genkit_1.ai.defineFlow({
    name: 'adminRecommendationFlow',
    inputSchema: AdminRecommendationInputSchema,
    outputSchema: AdminRecommendationOutputSchema,
}, async (input) => {
    const { output } = await genkit_1.ai.generate({
        model: 'openai/gpt-4o-mini',
        prompt: promptText,
        output: {
            schema: AdminRecommendationOutputSchema,
        },
    });
    if (!output) {
        throw new Error('AI did not return a valid recommendation.');
    }
    return output;
});
//# sourceMappingURL=admin-recommendation.js.map