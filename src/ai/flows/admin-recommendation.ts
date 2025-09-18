'use server';

/**
 * @fileOverview An AI agent for generating business recommendations for admins.
 *
 * - getAdminRecommendations - A function that provides weekly and monthly strategic advice.
 * - AdminRecommendationInput - The input type for the getAdminRecommendations function.
 * - AdminRecommendationOutput - The return type for the getAdminRecommendations function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AdminRecommendationInputSchema = z.object({
  totalRevenueLastWeek: z.number().describe('Total revenue from the previous week.'),
  totalRevenueLastMonth: z.number().describe('Total revenue from the previous month.'),
  topSellingProducts: z.array(z.string()).describe('A list of the best-selling products.'),
  worstSellingProducts: z.array(z.string()).describe('A list of the worst-selling products.'),
});
export type AdminRecommendationInput = z.infer<typeof AdminRecommendationInputSchema>;

const AdminRecommendationOutputSchema = z.object({
  weeklyRecommendation: z.string().describe('A concise, actionable weekly recommendation in Indonesian.'),
  monthlyRecommendation: z.string().describe('A high-level monthly strategic recommendation in Indonesian.'),
});
export type AdminRecommendationOutput = z.infer<typeof AdminRecommendationOutputSchema>;

export async function getAdminRecommendations(
  input: AdminRecommendationInput
): Promise<AdminRecommendationOutput> {
  return adminRecommendationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adminRecommendationPrompt',
  input: { schema: AdminRecommendationInputSchema },
  output: { schema: AdminRecommendationOutputSchema },
  prompt: `Anda adalah Chika AI, seorang analis bisnis ahli untuk Kasir POS Chika.

Tugas Anda adalah memberikan rekomendasi strategis mingguan dan bulanan untuk admin toko berdasarkan data kinerja berikut. Rekomendasi harus singkat, dapat ditindaklanjuti, dan dalam Bahasa Indonesia.

Data Kinerja:
- Total Pendapatan Minggu Lalu: Rp {{totalRevenueLastWeek}}
- Total Pendapatan Bulan Lalu: Rp {{totalRevenueLastMonth}}
- Produk Terlaris: {{#each topSellingProducts}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Produk Kurang Laris: {{#each worstSellingProducts}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Berdasarkan data ini:
1.  Buat **rekomendasi mingguan** yang berfokus pada tindakan jangka pendek. Contoh: Sarankan promosi 'bundling' untuk produk yang kurang laris dengan produk terlaris, atau adakan acara 'happy hour' pada hari-hari sepi.
2.  Buat **rekomendasi bulanan** yang berfokus pada strategi jangka panjang. Contoh: Sarankan untuk mengurangi stok produk yang kurang laris dan bernegosiasi dengan pemasok untuk harga yang lebih baik pada produk terlaris, atau usulkan program loyalitas baru.

Gunakan nada yang profesional namun memotivasi.`,
});

const adminRecommendationFlow = ai.defineFlow(
  {
    name: 'adminRecommendationFlow',
    inputSchema: AdminRecommendationInputSchema,
    outputSchema: AdminRecommendationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
