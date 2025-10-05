#!/usr/bin/env node
/**
 * scripts/check-ai-setup.ts
 * - Loads .env (for local dev)
 * - Verifies OPENAI_API_KEY is present
 * - Attempts to dynamically import and initialize genkit + openai plugin (no network calls)
 *
 * Run locally with: npx tsx scripts/check-ai-setup.ts
 */

import { config } from 'dotenv';
config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('ERROR: OPENAI_API_KEY is not set in the environment.');
  console.error('Set OPENAI_API_KEY in your .env (development) or in your hosting provider secrets (production).');
  process.exit(2);
}

(async () => {
  try {
    // Dynamic import so this script is server-only and doesn't run in client builds.
    const genkitMod = await import('genkit');
    const openaiMod = await import('genkit/plugins/openai');

    // Initialize genkit with the key, but do not call any flows.
    // This only verifies that the packages can be imported and an instance can be constructed.
    const ai = (genkitMod as any).genkit({ plugins: [ (openaiMod as any).openai({ apiKey }) ] });

    if (!ai) {
      throw new Error('genkit returned a falsy instance');
    }

    console.log('OK: OPENAI_API_KEY is set and genkit/openai initialized locally (no network calls performed).');
    process.exit(0);
  } catch (err: any) {
    console.error('ERROR: Failed to import or initialize genkit/openai plugin.');
    console.error(err?.message ?? err);
    process.exit(3);
  }
})();
