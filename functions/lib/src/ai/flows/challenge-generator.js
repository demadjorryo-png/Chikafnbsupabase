"use strict";
'use server';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateChallenges = generateChallenges;
/**
 * @fileOverview An AI agent for generating sales challenges for employees.
 *
 * - generateChallenges - A function that creates sales challenges based on a budget and a specific time period.
 * - ChallengeGeneratorInput - The input type for the generateChallenges function.
 * - ChallengeGeneratorOutput - The return type for the generateChallenges function.
 */
const genkit_1 = require("@/ai/genkit");
const genkit_2 = require("genkit");
const ChallengeGeneratorInputSchema = genkit_2.z.object({
    budget: genkit_2.z.number().describe('The total budget available for challenge rewards for the period.'),
    startDate: genkit_2.z.string().describe('The start date of the challenge period in YYYY-MM-DD format.'),
    endDate: genkit_2.z.string().describe('The end date of the challenge period in YYYY-MM-DD format.'),
    activeStoreName: genkit_2.z.string().describe('The name of the store for context.'),
    businessDescription: genkit_2.z.string().describe('A brief description of the business (e.g., "kafe", "vape store").'),
});
const ChallengeSchema = genkit_2.z.object({
    tier: genkit_2.z.string().describe("The name of the challenge tier (e.g., 'Perunggu', 'Perak', 'Emas') in Indonesian."),
    description: genkit_2.z.string().describe('A brief, motivating description of the challenge in Indonesian.'),
    target: genkit_2.z.number().describe('The total sales revenue (omset) target required to achieve this tier.'),
    reward: genkit_2.z.string().describe('The reward for achieving this tier, in Indonesian (e.g., "Bonus tunai Rp 500.000").'),
});
const ChallengeGeneratorOutputSchema = genkit_2.z.object({
    challenges: genkit_2.z.array(ChallengeSchema).describe('A list of generated sales challenges.'),
    period: genkit_2.z.string().describe('The formatted challenge period string (e.g., "1 Jul - 31 Jul 2024").')
});
async function generateChallenges(input) {
    return challengeGeneratorFlow(input);
}
// We ask the LLM to generate the content, but we format the date ourselves.
// This avoids potential hallucinations in date formatting.
const ChallengeGeneratorGptOutputSchema = genkit_2.z.object({
    challenges: genkit_2.z.array(ChallengeSchema).describe('A list of generated sales challenges.'),
});
const promptText = `Anda adalah Chika AI, seorang ahli dalam merancang program insentif karyawan. Anda membuat tantangan untuk sebuah **{{businessDescription}}** bernama **{{activeStoreName}}**.

Tugas Anda adalah membuat 3-4 tingkatan tantangan penjualan untuk karyawan berdasarkan total anggaran hadiah untuk periode tertentu. Tantangan harus didasarkan pada pencapaian total pendapatan penjualan (omset) dalam Rupiah Indonesia (Rp).

Gunakan Bahasa Indonesia untuk semua output teks.
Nama tingkatan (tier) harus kreatif dan memotivasi, relevan dengan **{{businessDescription}}** (contoh untuk kafe: "Barista Gesit", "Penyeduh Bintang", "Raja Omset").
Deskripsi tantangan harus singkat, memotivasi, dan dalam Bahasa Indonesia.
Target harus realistis namun menantang bagi karyawan toko, dimulai dari dasar yang wajar dan meningkat untuk setiap tingkatan. Pertimbangkan durasi tantangan saat menetapkan target. Periode yang lebih pendek harus memiliki target yang lebih rendah.
Hadiah harus didistribusikan dari anggaran yang disediakan. Tingkat tertinggi harus mendapatkan hadiah terbesar. Hadiahnya bisa berupa bonus tunai.

Periode Tantangan: {{startDate}} hingga {{endDate}}
Total Anggaran Hadiah: Rp {{budget}}

Buat satu set tantangan yang relevan untuk **{{businessDescription}}** dalam Bahasa Indonesia.`;
const challengeGeneratorFlow = genkit_1.ai.defineFlow({
    name: 'challengeGeneratorFlow',
    inputSchema: ChallengeGeneratorInputSchema,
    outputSchema: ChallengeGeneratorOutputSchema,
}, async (input) => {
    const { output } = await genkit_1.ai.generate({
        model: 'openai/gpt-4o-mini',
        prompt: promptText,
        output: {
            schema: ChallengeGeneratorGptOutputSchema,
        },
    });
    if (!output) {
        throw new Error('Failed to generate challenges from AI.');
    }
    // Format the date period server-side for consistency
    const { format: formatDate, parseISO } = await Promise.resolve().then(() => __importStar(require('date-fns')));
    const { id } = await Promise.resolve().then(() => __importStar(require('date-fns/locale')));
    const start = parseISO(input.startDate);
    const end = parseISO(input.endDate);
    let period;
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        period = `${formatDate(start, 'd')} - ${formatDate(end, 'd MMMM yyyy', { locale: id })}`;
    }
    else if (start.getFullYear() === end.getFullYear()) {
        period = `${formatDate(start, 'd MMM', { locale: id })} - ${formatDate(end, 'd MMM yyyy', { locale: id })}`;
    }
    else {
        period = `${formatDate(start, 'd MMM yyyy', { locale: id })} - ${formatDate(end, 'd MMM yyyy', { locale: id })}`;
    }
    return {
        challenges: output.challenges,
        period: period
    };
});
//# sourceMappingURL=challenge-generator.js.map