
'use server';

/**
 * @fileOverview A Text-to-Speech (TTS) AI agent.
 *
 * - convertTextToSpeech - A function that converts text into playable audio.
 * - TextToSpeechInput - The input type for the convertTextToSpeech function.
 * - TextToSpeechOutput - The return type for the convertTextToSpeech function.
 */
import { ai } from '../genkit';
import { z } from 'genkit';
import wav from 'wav';
import { googleAI } from '@genkit-ai/google-genai';


export const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to convert to speech.'),
  gender: z
    .enum(['male', 'female'])
    .optional()
    .describe('The preferred gender of the voice. Defaults to female.'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

export const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio as a WAV Data URI.'),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;


export async function convertTextToSpeech(
  input: TextToSpeechInput
): Promise<TextToSpeechOutput> {
  return textToSpeechFlow(input);
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: any[] = [];
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

export const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async ({ text, gender = 'female' }) => {
    // Note: The specific model and voice names might need to be updated
    // based on the available models in your Genkit configuration.
    const ttsModel = googleAI.model('text-to-speech-2-prebuilt');

    const { response } = ai.generateStream({
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
    
    // The media URL is a data URI with base64 encoded PCM audio.
    // We need to convert it to a proper WAV format to be playable in browsers.
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    return {
      audioDataUri: 'data:audio/wav;base64,' + (await toWav(audioBuffer, 1, 24000)),
    };
  }
);
