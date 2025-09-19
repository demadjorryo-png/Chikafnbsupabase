
'use server';

/**
 * @fileOverview An AI agent for consulting on new F&B application requirements.
 *
 * - consultWithChika - A function that drives a conversation to elicit F&B app requirements.
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

const ClientDataSchema = z.object({
    appName: z.string().optional().describe("The desired name for the application."),
    fullName: z.string().optional().describe("The client's full name."),
    whatsappNumber: z.string().optional().describe("The client's WhatsApp number."),
    address: z.string().optional().describe("The client's city or full address."),
});

const AppConsultantOutputSchema = z.object({
  response: z.string().describe('The AI\'s next question or response in Indonesian.'),
  isFinished: z.boolean().describe('Set to true only when the AI has gathered enough information and is ready to summarize.'),
  summary: z.string().optional().describe('A detailed summary of the application requirements in Indonesian, formatted in Markdown. This is only provided when isFinished is true.'),
  clientData: ClientDataSchema.optional().describe('Structured data of the client, collected before finishing the conversation. This is only provided when isFinished is true.'),
  firebasePrompt: z.string().optional().describe('A separate, developer-focused prompt for creating the app in Firebase. This is only provided when isFinished is true.'),
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
  prompt: `Anda adalah "Chika", asisten AI untuk Rio Pradana, seorang konsultan spesialis aplikasi F&B (Food & Beverage). Tugas Anda adalah memandu calon klien (pemilik kafe, restoran, dll) melalui sesi konsultasi untuk menggali kebutuhan aplikasi F&B mereka.

Gunakan nada yang ramah, profesional, dan tunjukkan pemahaman Anda tentang industri F&B. Selalu balas dalam Bahasa Indonesia.

**ALUR PERCAKAPAN:**

**Fase 1: Penggalian Kebutuhan Aplikasi F&B**
Tujuan utama Anda adalah mengumpulkan informasi detail tentang 5 area kunci, dengan fokus F&B:
1.  **Konsep Bisnis & Tujuan Aplikasi:** Apa jenis bisnis F&B-nya (kafe, restoran, cloud kitchen)? Apa masalah utama yang ingin diselesaikan dengan aplikasi (misal: antrian panjang, manajemen meja, pesanan online)?
2.  **Target Pelanggan:** Siapa pelanggan utama mereka (misal: mahasiswa, pekerja kantoran, keluarga)?
3.  **Fitur Inti (Core Features):** Apa 3-5 fitur paling penting? Arahkan ke fitur-fitur F&B seperti:
    *   Manajemen Meja (Table Management)
    *   Point of Sale (POS) yang terintegrasi
    *   Integrasi dengan Printer Dapur (Kitchen Printer)
    *   Sistem Pesan Antar (Delivery Order)
    *   Program Loyalitas (Loyalty Program)
    *   Reservasi Online
4.  **Keunikan (Unique Selling Proposition):** Apa yang membuat bisnis F&B mereka unik? Apa yang akan membuat aplikasi mereka menonjol?
5.  **Monetisasi & Operasional:** Bagaimana rencana pendapatan? Apakah mereka sudah punya hardware (tablet, printer)?
Ajukan satu pertanyaan spesifik pada satu waktu. Jangan menanyakan semuanya sekaligus.

**Fase 2: Pengumpulan Data Klien (WAJIB)**
Setelah Anda merasa telah memiliki informasi yang cukup di 5 area di atas, Anda HARUS beralih ke fase ini.
Tanyakan secara sopan data berikut kepada calon klien untuk keperluan follow-up. Anda harus menanyakan SEMUANYA:
1.  **Nama Aplikasi** yang diinginkan.
2.  **Nama Lengkap** calon klien.
3.  **Nomor WhatsApp** yang dapat dihubungi.
4.  **Alamat Lengkap** (Kota/Domisili).
Contoh transisi: "Baik, terima kasih atas informasinya. Saya sudah punya gambaran yang bagus tentang aplikasi F&B Anda. Sebelum saya rangkum, boleh saya minta beberapa data untuk tim kami follow-up?"

**Fase 3: Ringkasan & Penutup**
- Setelah semua data (kebutuhan aplikasi & data klien) terkumpul, setel \`isFinished\` menjadi \`true\`.
- Saat \`isFinished\` disetel ke \`true\`, Anda WAJIB:
    1.  Membuat \`summary\` yang detail dan terstruktur menggunakan Markdown. Ringkasan ini harus mencakup semua 5 area kunci F&B DAN semua data klien yang telah Anda kumpulkan.
    2.  Mengisi field \`clientData\` dengan data terstruktur yang telah Anda kumpulkan.
    3.  Membuat \`firebasePrompt\`. Ini adalah sebuah perintah terpisah yang ditujukan untuk AI developer (seperti Gemini) untuk membuat aplikasi yang dirangkum. Prompt ini harus dalam Bahasa Inggris, jelas, dan berisi semua detail teknis relevan dari ringkasan. Contoh: "Create a Next.js F&B POS application for 'KafeSenja' with Firebase. It needs table management, a POS system with kitchen printer integration, and a customer loyalty program. The target users are young adults. The main goal is to streamline order processing."

---
**Riwayat Percakapan Sejauh Ini:**
{{{conversationHistory}}}

**Pesan Terbaru dari Klien:**
"{{{userInput}}}"
---

Lanjutkan percakapan sesuai fase. Ajukan pertanyaan Anda berikutnya ATAU akhiri percakapan jika semua data sudah lengkap.`,
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
