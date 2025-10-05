import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {openAI} from 'genkitx-openai';

// Configure Genkit globally by creating a single configured instance.
// This ensures all AI flows use this configuration by default.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
    openAI({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  ],
});
