import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Configure Genkit globally by creating a single configured instance.
// This ensures all AI flows use this configuration by default.
export const ai = genkit({
  plugins: [googleAI()],
});
