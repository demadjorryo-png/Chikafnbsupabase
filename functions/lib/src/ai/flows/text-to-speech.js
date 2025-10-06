"use strict";
'use server';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertTextToSpeech = convertTextToSpeech;
/**
 * @fileOverview A Text-to-Speech (TTS) AI agent.
 *
 * - convertTextToSpeech - A function that converts text into playable audio.
 * - TextToSpeechInput - The input type for the convertTextToSpeech function.
 * - TextToSpeechOutput - The return type for the convertTextToSpeech function.
 */
const genkit_1 = require("@/ai/genkit");
const genkit_2 = require("genkit");
const wav_1 = __importDefault(require("wav"));
const google_genai_1 = require("@genkit-ai/google-genai");
const TextToSpeechInputSchema = genkit_2.z.object({
    text: genkit_2.z.string().describe('The text to convert to speech.'),
    gender: genkit_2.z
        .enum(['male', 'female'])
        .optional()
        .describe('The preferred gender of the voice. Defaults to female.'),
});
const TextToSpeechOutputSchema = genkit_2.z.object({
    audioDataUri: genkit_2.z.string().describe('The generated audio as a WAV Data URI.'),
});
async function convertTextToSpeech(input) {
    return textToSpeechFlow(input);
}
async function toWav(pcmData, channels = 1, rate = 24000, sampleWidth = 2) {
    return new Promise((resolve, reject) => {
        const writer = new wav_1.default.Writer({
            channels,
            sampleRate: rate,
            bitDepth: sampleWidth * 8,
        });
        const bufs = [];
        writer.on('error', reject);
        writer.on('data', function (d) {
            bufs.push(d);
        });
        writer.on('end', function () {
            resolve(Buffer.concat(bufs).toString('base64'));
        });
        writer.write(pcmData);
        writer.end();
    });
}
const textToSpeechFlow = genkit_1.ai.defineFlow({
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
}, async ({ text, gender = 'female' }) => {
    const ttsModel = google_genai_1.googleAI.model('text-to-speech');
    const { response } = genkit_1.ai.generateStream({
        model: ttsModel,
        prompt: text,
        config: {
            voice: gender === 'male' ? 'en-US-Standard-D' : 'en-US-Standard-C',
        },
    });
    const { media } = await response;
    if (!media) {
        throw new Error('No audio media returned from text-to-speech flow.');
    }
    const audioBuffer = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
    return {
        audioDataUri: 'data:audio/wav;base64,' + (await toWav(audioBuffer, 1, 24000)),
    };
});
//# sourceMappingURL=text-to-speech.js.map