
'use server';
/**
 * @fileOverview A Text-to-Speech (TTS) AI agent.
 *
 * - convertTextToSpeech - A function that converts text into playable audio.
 * - TextToSpeechInput - The input type for the convertTextToSpeech function.
 * - TextToSpeechOutput - The return type for the convertTextToSpeech function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import wav from 'wav';

const MALE_VOICES = ['Achernar', 'Zephyr'];
const FEMALE_VOICES = ['Enceladus', 'Vindemiatrix'];

const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to convert to speech.'),
  gender: z.enum(['male', 'female']).optional().describe('The preferred gender of the voice. Defaults to female.'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
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

    let bufs: any[] = [];
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

const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async ({ text, gender = 'female' }) => {
    
    // Randomly select a voice based on the specified gender
    const voiceList = gender === 'male' ? MALE_VOICES : FEMALE_VOICES;
    const voiceName = voiceList[Math.floor(Math.random() * voiceList.length)];
    
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
      prompt: text,
    });

    if (!media) {
      throw new Error('No audio media was returned from the AI model.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    const wavBase64 = await toWav(audioBuffer);

    return {
      audioDataUri: 'data:audio/wav;base64,' + wavBase64,
    };
  }
);
