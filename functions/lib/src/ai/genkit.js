"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
const genkit_1 = require("genkit");
const google_genai_1 = require("@genkit-ai/google-genai");
const genkitx_openai_1 = require("genkitx-openai");
// Configure Genkit globally by creating a single configured instance.
// This ensures all AI flows use this configuration by default.
exports.ai = (0, genkit_1.genkit)({
    plugins: [
        (0, google_genai_1.googleAI)({
            apiKey: process.env.GOOGLE_GENAI_API_KEY,
        }),
        (0, genkitx_openai_1.openAI)({
            apiKey: process.env.OPENAI_API_KEY,
        }),
    ],
});
//# sourceMappingURL=genkit.js.map