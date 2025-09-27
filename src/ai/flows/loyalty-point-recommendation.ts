'use server';

/**
 * @fileOverview A loyalty point recommendation AI agent.
 *
 * - getLoyaltyPointRecommendation - A function that suggests the optimal way for a customer to redeem loyalty points.
 * - LoyaltyPointRecommendationInput - The input type for the getLoyaltyPointRecommendation function.
 * - LoyaltyPointRecommendationOutput - The return type for the getLoyaltyPointRecommendation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LoyaltyPointRecommendationInputSchema = z.object({
  loyaltyPoints: z
    .number()
    .describe('The number of loyalty points the customer has.'),
  totalPurchaseAmount: z
    .number()
    .describe('The total purchase amount of the current transaction.'),
  availableRedemptionOptions: z.array(
    z.object({
      description: z.string().describe('A description of the redemption option.'),
      pointsRequired: z.number().describe('The number of points required for this option.'),
      value: z.number().describe('The value of this redemption option.'),
    })
  ).describe('The available redemption options for the customer.'),
});
export type LoyaltyPointRecommendationInput = z.infer<
  typeof LoyaltyPointRecommendationInputSchema
>;

const LoyaltyPointRecommendationOutputSchema = z.object({
  recommendation: z
    .string()
    .describe(
      'A recommendation for the optimal way for the customer to redeem their loyalty points, considering their current points, purchase amount, and available redemption options.'
    ),
});
export type LoyaltyPointRecommendationOutput = z.infer<
  typeof LoyaltyPointRecommendationOutputSchema
>;

export async function getLoyaltyPointRecommendation(
  input: LoyaltyPointRecommendationInput
): Promise<LoyaltyPointRecommendationOutput> {
  return loyaltyPointRecommendationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'loyaltyPointRecommendationPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: {schema: LoyaltyPointRecommendationInputSchema},
  output: {schema: LoyaltyPointRecommendationOutputSchema},
  prompt: `You are an expert in loyalty programs and customer engagement. A customer has {{loyaltyPoints}} loyalty points and is making a purchase of Rp {{totalPurchaseAmount}}. Here are the available redemption options:

{{#each availableRedemptionOptions}}
- {{description}} ({{pointsRequired}} points, Value: Rp {{value}})
{{/each}}

Based on this information, recommend the optimal way for the customer to redeem their points to maximize their benefit and encourage redemption. The recommendation should be a single sentence in Indonesian.

Recommendation: `,
});

const loyaltyPointRecommendationFlow = ai.defineFlow(
  {
    name: 'loyaltyPointRecommendationFlow',
    inputSchema: LoyaltyPointRecommendationInputSchema,
    outputSchema: LoyaltyPointRecommendationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
