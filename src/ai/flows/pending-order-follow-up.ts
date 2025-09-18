'use server';

/**
 * @fileOverview An AI agent for generating follow-up messages for pending orders.
 *
 * - getPendingOrderFollowUp - A function that generates a follow-up message when a product is back in stock.
 * - PendingOrderFollowUpInput - The input type for the getPendingOrderFollowUp function.
 * - PendingOrderFollowUpOutput - The return type for the getPendingOrderFollowUp function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PendingOrderFollowUpInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  productName: z.string().describe('The name of the product that is back in stock.'),
});
export type PendingOrderFollowUpInput = z.infer<
  typeof PendingOrderFollowUpInputSchema
>;

const PendingOrderFollowUpOutputSchema = z.object({
  followUpMessage: z
    .string()
    .describe(
      'A friendly and concise follow-up message for the customer in Indonesian.'
    ),
});
export type PendingOrderFollowUpOutput = z.infer<
  typeof PendingOrderFollowUpOutputSchema
>;

export async function getPendingOrderFollowUp(
  input: PendingOrderFollowUpInput
): Promise<PendingOrderFollowUpOutput> {
  return pendingOrderFollowUpFlow(input);
}

const prompt = ai.definePrompt({
  name: 'pendingOrderFollowUpPrompt',
  input: {schema: PendingOrderFollowUpInputSchema},
  output: {schema: PendingOrderFollowUpOutputSchema},
  prompt: `You are Chika AI, a friendly assistant for Kasir POS Chika. 

Your task is to generate a follow-up message for a customer whose pending order item is now back in stock. The message should be friendly, concise, and in Indonesian.

Customer Name: {{customerName}}
Product Name: {{productName}}

Generate a follow-up message informing the customer that the product is available.`,
});

const pendingOrderFollowUpFlow = ai.defineFlow(
  {
    name: 'pendingOrderFollowUpFlow',
    inputSchema: PendingOrderFollowUpInputSchema,
    outputSchema: PendingOrderFollowUpOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
