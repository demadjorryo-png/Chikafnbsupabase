import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Configure Genkit globally by creating a single configured instance.
// This ensures all AI flows use this configuration by default.
export const ai = genkit({
  plugins: [googleAI()],
  safetySettings: [
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_NONE',
    },
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_NONE',
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_NONE',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_NONE',
    },
  ],
  logLevel: 'debug', // Optional: for better debugging
});
