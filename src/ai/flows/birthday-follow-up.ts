'use server';

/**
 * @fileOverview An AI agent for generating birthday follow-up messages.
 *
 * - getBirthdayFollowUp - A function that generates a birthday message with a discount.
 * - BirthdayFollowUpInput - The input type for the getBirthdayFollowUp function.
 * - BirthdayFollowUpOutput - The return type for the getBirthdayFollowUp function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BirthdayFollowUpInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  discountPercentage: z
    .number()
    .describe('The discount percentage to offer.'),
});
export type BirthdayFollowUpInput = z.infer<
  typeof BirthdayFollowUpInputSchema
>;

const BirthdayFollowUpOutputSchema = z.object({
  followUpMessage: z
    .string()
    .describe(
      'A friendly and concise birthday follow-up message for the customer in Indonesian.'
    ),
});
export type BirthdayFollowUpOutput = z.infer<
  typeof BirthdayFollowUpOutputSchema
>;

export async function getBirthdayFollowUp(
  input: BirthdayFollowUpInput
): Promise<BirthdayFollowUpOutput> {
  return birthdayFollowUpFlow(input);
}

const prompt = ai.definePrompt({
  name: 'birthdayFollowUpPrompt',
  input: {schema: BirthdayFollowUpInputSchema},
  output: {schema: BirthdayFollowUpOutputSchema},
  prompt: `You are Chika AI, a friendly assistant for Bekupon Vape Store.

Your task is to generate a birthday follow-up message for a customer. The message should be friendly, concise, and in Indonesian. It must wish them a happy birthday and offer a special discount.

Customer Name: {{customerName}}
Discount Percentage: {{discountPercentage}}%

Generate a follow-up message.`,
});

const birthdayFollowUpFlow = ai.defineFlow(
  {
    name: 'birthdayFollowUpFlow',
    inputSchema: BirthdayFollowUpInputSchema,
    outputSchema: BirthdayFollowUpOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
