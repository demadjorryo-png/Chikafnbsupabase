import {configureGenkit, genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Configure Genkit globally with the desired model and safety settings.
// This ensures all AI flows use this configuration by default.
configureGenkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash',
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

// Export a standard Genkit instance for use in flows.
export const ai = genkit();
