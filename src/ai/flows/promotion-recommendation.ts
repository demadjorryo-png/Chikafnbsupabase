'use server';

/**
 * @fileOverview An AI agent for generating loyalty promotion recommendations.
 *
 * - getPromotionRecommendations - A function that suggests new or updated loyalty promotions.
 * - PromotionRecommendationInput - The input type for the getPromotionRecommendations function.
 * - PromotionRecommendationOutput - The return type for the getPromotionRecommendations function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { RedemptionOption } from '@/lib/types';

const PromotionRecommendationInputSchema = z.object({
  currentRedemptionOptions: z.array(
    z.object({
      description: z.string(),
      pointsRequired: z.number(),
      isActive: z.boolean(),
    })
  ).describe('A list of the current loyalty redemption options.'),
  topSellingProducts: z.array(z.string()).describe('A list of the best-selling products this month.'),
  worstSellingProducts: z.array(z.string()).describe('A list of the worst-selling products this month.'),
});
export type PromotionRecommendationInput = z.infer<typeof PromotionRecommendationInputSchema>;

const RecommendationSchema = z.object({
  title: z.string().describe('A short, catchy title for the recommendation in Indonesian.'),
  description: z.string().describe('A concise, actionable recommendation in Indonesian.'),
  justification: z.string().describe('A brief explanation of why this recommendation is being made, in Indonesian.'),
});

const PromotionRecommendationOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema).describe('A list of 2-3 generated promotion recommendations.'),
});
export type PromotionRecommendationOutput = z.infer<typeof PromotionRecommendationOutputSchema>;


export async function getPromotionRecommendations(
  input: PromotionRecommendationInput
): Promise<PromotionRecommendationOutput> {
  return promotionRecommendationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'promotionRecommendationPrompt',
  input: { schema: PromotionRecommendationInputSchema },
  output: { schema: PromotionRecommendationOutputSchema },
  prompt: `Anda adalah Chika AI, seorang ahli strategi loyalitas untuk Bekupon Vape Store.

Tugas Anda adalah menganalisis data promo saat ini dan kinerja produk untuk menghasilkan 2-3 rekomendasi promosi loyalitas yang kreatif dan dapat ditindaklanjuti. Rekomendasi harus dalam Bahasa Indonesia.

Data Saat Ini:
- Promo Penukaran Poin:
{{#each currentRedemptionOptions}}
  - {{description}} ({{pointsRequired}} poin) - Status: {{#if isActive}}Aktif{{else}}Tidak Aktif{{/if}}
{{/each}}
- Produk Terlaris Bulan Ini: {{#each topSellingProducts}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Produk Kurang Laris Bulan Ini: {{#each worstSellingProducts}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Berdasarkan data ini, berikan rekomendasi yang berfokus pada:
1.  **Promo Baru yang Menarik**: Usulkan opsi penukaran baru yang mungkin menarik bagi pelanggan. Contoh: "Buat promo 'Pilih Liquid Favoritmu' seharga 500 poin" atau "Tawarkan merchandise edisi terbatas untuk 1500 poin."
2.  **Meningkatkan Penjualan Produk Kurang Laris**: Usulkan promo yang melibatkan produk yang kurang laku. Contoh: "Adakan promo 'Diskon 50% untuk produk {{worstSellingProducts.[0]}}' hanya dengan 100 poin."
3.  **Mengoptimalkan Promo yang Ada**: Sarankan untuk menonaktifkan atau mengubah promo yang mungkin kurang efektif.

Setiap rekomendasi harus memiliki judul, deskripsi (tindakan yang disarankan), dan justifikasi (alasan mengapa ini ide yang bagus).`,
});

const promotionRecommendationFlow = ai.defineFlow(
  {
    name: 'promotionRecommendationFlow',
    inputSchema: PromotionRecommendationInputSchema,
    outputSchema: PromotionRecommendationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
