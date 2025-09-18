'use server';

/**
 * @fileOverview A conversational AI business analyst for Kasir POS Chika.
 *
 * - askChika - A function that allows an admin to ask business questions.
 * - ChikaAnalystInput - The input type for the askChika function.
 * - ChikaAnalystOutput - The return type for the askChika function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChikaAnalystInputSchema = z.object({
  question: z.string().describe('The business-related question from the admin.'),
  totalRevenueLastMonth: z.number().describe('Total revenue from the previous full month.'),
  topSellingProducts: z.array(z.string()).describe('A list of the current best-selling products.'),
  worstSellingProducts: z.array(z.string()).describe('A list of the current worst-selling products.'),
  activeStoreName: z.string().describe('The name of the store being analyzed.'),
});
export type ChikaAnalystInput = z.infer<typeof ChikaAnalystInputSchema>;

const ChikaAnalystOutputSchema = z.object({
  answer: z.string().describe('A concise, actionable, and data-driven answer in Indonesian, formatted with Markdown.'),
});
export type ChikaAnalystOutput = z.infer<typeof ChikaAnalystOutputSchema>;

export async function askChika(
  input: ChikaAnalystInput
): Promise<ChikaAnalystOutput> {
  return businessAnalystFlow(input);
}

const prompt = ai.definePrompt({
  name: 'businessAnalystPrompt',
  input: { schema: ChikaAnalystInputSchema },
  output: { schema: ChikaAnalystOutputSchema },
  prompt: `Anda adalah Chika AI, seorang analis bisnis ahli untuk Kasir POS Chika. Anda sedang menganalisis data untuk toko: {{activeStoreName}}.

Tugas Anda adalah menjawab pertanyaan dari admin secara ringkas, cerdas, dan berdasarkan data yang diberikan. Selalu berikan jawaban dalam Bahasa Indonesia.

Gunakan data berikut untuk mendukung analisis Anda:
- Total Pendapatan Bulan Lalu: Rp {{totalRevenueLastMonth}}
- Produk Terlaris Saat Ini: {{#each topSellingProducts}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Produk Kurang Laris Saat Ini: {{#each worstSellingProducts}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Pertanyaan Admin: "{{question}}"

Berikan jawaban yang actionable (dapat ditindaklanjuti). Jika pertanyaan bersifat umum, berikan saran konkret berdasarkan data yang ada. Contoh: Jika admin bertanya cara menaikkan omset, sarankan untuk membuat promo bundling antara produk terlaris dan produk kurang laris.

PENTING: Format jawaban Anda menggunakan Markdown untuk keterbacaan yang lebih baik. Gunakan poin-poin (dengan '-' atau '*') dan teks tebal ('**teks**') untuk menyorot informasi kunci.

Jawaban Analisis Anda:`,
});

const businessAnalystFlow = ai.defineFlow(
  {
    name: 'businessAnalystFlow',
    inputSchema: ChikaAnalystInputSchema,
    outputSchema: ChikaAnalystOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
