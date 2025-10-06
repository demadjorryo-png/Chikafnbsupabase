"use strict";
'use server';
Object.defineProperty(exports, "__esModule", { value: true });
exports.askChika = askChika;
/**
 * @fileOverview A conversational AI business analyst for Kasir POS Chika.
 *
 * - askChika - A function that allows an admin to ask business questions.
 * - ChikaAnalystInput - The input type for the askChika function.
 * - ChikaAnalystOutput - The return type for the askChika function.
 */
const genkit_1 = require("@/ai/genkit");
const genkit_2 = require("genkit");
const ChikaAnalystInputSchema = genkit_2.z.object({
    question: genkit_2.z.string().describe('The business-related question from the admin.'),
    totalRevenueLastMonth: genkit_2.z.number().describe('Total revenue from the previous full month.'),
    topSellingProducts: genkit_2.z.array(genkit_2.z.string()).describe('A list of the current best-selling products.'),
    worstSellingProducts: genkit_2.z.array(genkit_2.z.string()).describe('A list of the current worst-selling products.'),
    activeStoreName: genkit_2.z.string().describe('The name of the store being analyzed.'),
});
const ChikaAnalystOutputSchema = genkit_2.z.object({
    answer: genkit_2.z.string().describe('A concise, actionable, and data-driven answer in Indonesian, formatted with Markdown.'),
});
async function askChika(input) {
    return businessAnalystFlow(input);
}
const prompt = genkit_1.ai.definePrompt({
    name: 'businessAnalystPrompt',
    input: { schema: ChikaAnalystInputSchema },
    output: { schema: ChikaAnalystOutputSchema },
    prompt: `Anda adalah Chika AI, seorang analis bisnis ahli yang berspesialisasi dalam industri F&B untuk aplikasi Kasir POS Chika. Anda sedang menganalisis data untuk kafe/restoran: {{activeStoreName}}.

Tugas Anda adalah menjawab pertanyaan dari admin secara ringkas, cerdas, dan berdasarkan data yang diberikan. Selalu berikan jawaban dalam Bahasa Indonesia dan dalam konteks bisnis F&B.

Gunakan data berikut untuk mendukung analisis Anda:
- Total Pendapatan Bulan Lalu: Rp {{totalRevenueLastMonth}}
- Menu Terlaris Saat Ini: {{#each topSellingProducts}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Menu Kurang Laris Saat Ini: {{#each worstSellingProducts}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Pertanyaan Admin: "{{question}}"

Berikan jawaban yang actionable (dapat ditindaklanjuti). Jika pertanyaan bersifat umum, berikan saran konkret berdasarkan data yang ada.
Contoh:
- Jika admin bertanya "cara menaikkan omset", sarankan untuk membuat promo bundling antara kopi terlaris dengan pastry yang kurang laku, atau membuat promo 'happy hour' di jam-jam sepi.
- Jika admin bertanya tentang "produk yang tidak laku", sarankan untuk menganalisis resep, mengurangi porsi, atau menawarkannya sebagai bonus.

PENTING: Format jawaban Anda menggunakan Markdown untuk keterbacaan yang lebih baik. Gunakan poin-poin (dengan '-' atau '*') dan teks tebal ('**teks**') untuk menyorot informasi kunci.

Jawaban Analisis F&B Anda:`,
    config: {
        model: 'openai/gpt-4o-mini',
    },
});
const businessAnalystFlow = genkit_1.ai.defineFlow({
    name: 'businessAnalystFlow',
    inputSchema: ChikaAnalystInputSchema,
    outputSchema: ChikaAnalystOutputSchema,
}, async (input) => {
    var _a;
    try {
        // Defensive: clamp arrays to avoid extremely long prompts / high cost
        const safeInput = Object.assign(Object.assign({}, input), { topSellingProducts: (input.topSellingProducts || []).slice(0, 25), worstSellingProducts: (input.worstSellingProducts || []).slice(0, 25) });
        const { output } = await prompt(safeInput);
        if (!output) {
            // Log and return a structured error so callers can handle it
            console.error('businessAnalystFlow: AI returned empty output', { store: input.activeStoreName });
            throw new Error('AI did not return a result.');
        }
        return output;
    }
    catch (err) {
        // Improve observability; do not leak sensitive details to clients
        console.error('businessAnalystFlow error:', (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err);
        throw new Error('Terjadi kesalahan pada layanan AI. Silakan coba lagi nanti.');
    }
});
//# sourceMappingURL=business-analyst.js.map