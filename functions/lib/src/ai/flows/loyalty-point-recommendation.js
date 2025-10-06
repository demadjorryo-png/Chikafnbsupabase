"use strict";
'use server';
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoyaltyPointRecommendation = getLoyaltyPointRecommendation;
/**
 * @fileOverview A loyalty point recommendation AI agent.
 *
 * - getLoyaltyPointRecommendation - A function that suggests the optimal way for a customer to redeem loyalty points.
 * - LoyaltyPointRecommendationInput - The input type for the getLoyaltyPointRecommendation function.
 * - LoyaltyPointRecommendationOutput - The return type for the getLoyaltyPointRecommendation function.
 */
const genkit_1 = require("@/ai/genkit");
const genkit_2 = require("genkit");
const LoyaltyPointRecommendationInputSchema = genkit_2.z.object({
    loyaltyPoints: genkit_2.z
        .number()
        .describe('The number of loyalty points the customer has.'),
    totalPurchaseAmount: genkit_2.z
        .number()
        .describe('The total purchase amount of the current transaction.'),
    availableRedemptionOptions: genkit_2.z.array(genkit_2.z.object({
        description: genkit_2.z.string().describe('A description of the redemption option.'),
        pointsRequired: genkit_2.z.number().describe('The number of points required for this option.'),
        value: genkit_2.z.number().describe('The value of this redemption option.'),
    })).describe('The available redemption options for the customer.'),
});
const LoyaltyPointRecommendationOutputSchema = genkit_2.z.object({
    recommendation: genkit_2.z
        .string()
        .describe('A recommendation for the optimal way for the customer to redeem their loyalty points, considering their current points, purchase amount, and available redemption options.'),
});
async function getLoyaltyPointRecommendation(input) {
    return loyaltyPointRecommendationFlow(input);
}
const prompt = genkit_1.ai.definePrompt({
    name: 'loyaltyPointRecommendationPrompt',
    input: { schema: LoyaltyPointRecommendationInputSchema },
    output: { schema: LoyaltyPointRecommendationOutputSchema },
    prompt: `You are an expert in loyalty programs and customer engagement. A customer has {{loyaltyPoints}} loyalty points and is making a purchase of Rp {{totalPurchaseAmount}}. Here are the available redemption options:

{{#each availableRedemptionOptions}}
- {{description}} ({{pointsRequired}} points, Value: Rp {{value}})
{{/each}}

Based on this information, recommend the optimal way for the customer to redeem their points to maximize their benefit and encourage redemption. The recommendation should be a single sentence in Indonesian.

Recommendation: `,
    config: {
        model: 'openai/gpt-4o-mini',
    },
});
const loyaltyPointRecommendationFlow = genkit_1.ai.defineFlow({
    name: 'loyaltyPointRecommendationFlow',
    inputSchema: LoyaltyPointRecommendationInputSchema,
    outputSchema: LoyaltyPointRecommendationOutputSchema,
}, async (input) => {
    const { output } = await prompt(input);
    return output;
});
//# sourceMappingURL=loyalty-point-recommendation.js.map