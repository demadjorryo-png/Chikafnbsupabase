import {genkit} from 'genkit';
import {openai} from 'genkit/plugins/openai';

// Configure Genkit globally by creating a single configured instance.
// This ensures all AI flows use this configuration by default.
export const ai = genkit({
  plugins: [openai({apiKey: process.env.OPENAI_API_KEY})],
});
