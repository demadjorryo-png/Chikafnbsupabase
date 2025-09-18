'use server';

/**
 * @fileOverview An AI agent for consulting on new application requirements.
 *
 * - consultWithChika - A function that drives a conversation to elicit app requirements.
 * - AppConsultantInput - The input type for the function.
 * - AppConsultantOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AppConsultantInputSchema = z.object({
  conversationHistory: z.string().describe('The ongoing conversation history between the AI and the user.'),
  userInput: z.string().describe('The latest message from the user.'),
});
export type AppConsultantInput = z.infer<typeof AppConsultantInputSchema>;

const AppConsultantOutputSchema = z.object({
  response: z.string().describe('The AI\'s next question or response in Indonesian.'),
  isFinished: z.boolean().describe('Set to true only when the AI has gathered enough information and is ready to summarize.'),
  summary: z.string().optional().describe('A detailed summary of the application requirements in Indonesian, formatted in Markdown. This is only provided when isFinished is true.'),
});
export type AppConsultantOutput = z.infer<typeof AppConsultantOutputSchema>;

export async function consultWithChika(
  input: AppConsultantInput
): Promise<AppConsultantOutput> {
  return appConsultantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'appConsultantPrompt',
  input: { schema: AppConsultantInputSchema },
  output: { schema: AppConsultantOutputSchema },
  prompt: `Anda adalah "Chika", seorang konsultan produk digital dan analis bisnis yang sangat berpengalaman. Tugas Anda adalah memandu calon klien melalui sesi konsultasi untuk menggali kebutuhan aplikasi mereka.

Gunakan nada yang ramah, profesional, dan antusias. Selalu balas dalam Bahasa Indonesia.

Tujuan utama Anda adalah mengumpulkan informasi detail tentang 5 area kunci:
1.  **Tujuan Aplikasi:** Apa masalah utama yang ingin diselesaikan? Apa tujuan bisnisnya?
2.  **Target Pengguna:** Siapa pengguna utama aplikasi ini? Apa karakteristik mereka?
3.  **Fitur Inti (Core Features):** Apa 3-5 fitur paling penting yang harus ada di versi pertama?
4.  **Keunikan (Unique Selling Proposition):** Apa yang membuat aplikasi ini berbeda dari yang sudah ada?
5.  **Monetisasi (Jika ada):** Bagaimana rencana aplikasi ini untuk menghasilkan pendapatan?

**ATURAN MAIN:**
- Ajukan satu pertanyaan spesifik pada satu waktu. Jangan menanyakan semuanya sekaligus.
- Gunakan riwayat percakapan untuk memahami konteks dan hindari menanyakan hal yang sama.
- Jika pengguna menjawab dengan singkat, ajukan pertanyaan lanjutan untuk menggali lebih dalam.
- Setelah Anda merasa telah memiliki informasi yang cukup di semua 5 area, setel `isFinished` menjadi `true`.
- Saat `isFinished` disetel ke `true`, Anda WAJIB membuat `summary` yang detail dan terstruktur menggunakan Markdown. Ringkasan ini harus mencakup semua 5 area kunci yang telah Anda gali.

---
**Riwayat Percakapan Sejauh Ini:**
{{{conversationHistory}}}

**Pesan Terbaru dari Klien:**
"{{{userInput}}}"
---

Lanjutkan percakapan. Ajukan pertanyaan Anda berikutnya ATAU akhiri percakapan jika sudah cukup data.`,
});

const appConsultantFlow = ai.defineFlow(
  {
    name: 'appConsultantFlow',
    inputSchema: AppConsultantInputSchema,
    outputSchema: AppConsultantOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
