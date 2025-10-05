import {genkit} from 'genkit';
import {openai} from 'genkit/plugins/openai';

// Safety guards:
// - This file MUST only be imported on the server. If it's imported from client code
//   (e.g. accidentally from a React component), throw early to avoid leaking secrets.
// - Ensure the OPENAI_API_KEY is present in production environments.
if (typeof window !== 'undefined') {
  throw new Error('Importing server-only AI configuration from client-side code is not allowed. Ensure `src/ai/genkit.ts` is only imported from server code (API routes, server components, or server functions).');
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  if (process.env.NODE_ENV === 'production') {
    // Fail fast in production if key missing.
    throw new Error('OPENAI_API_KEY is not set in the server environment. Configure it in your production environment variables/secret manager.');
  } else {
    // In development warn (dev helper `src/ai/dev.ts` uses dotenv to load .env)
    // eslint-disable-next-line no-console
    console.warn('Warning: OPENAI_API_KEY is not set. AI flows may fail until you set this environment variable.');
  }
}

// Configure Genkit globally by creating a single configured instance.
// This ensures all AI flows use this configuration by default.
export const ai = genkit({
  plugins: [openai({apiKey})],
});
