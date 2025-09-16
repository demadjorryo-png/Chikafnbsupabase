'use server';

/**
 * @fileOverview An AI agent for generating sales challenges for employees.
 *
 * - generateChallenges - A function that creates sales challenges based on a budget and a specific time period.
 * - ChallengeGeneratorInput - The input type for the generateChallenges function.
 * - ChallengeGeneratorOutput - The return type for the generateChallenges function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChallengeGeneratorInputSchema = z.object({
  budget: z.number().describe('The total budget available for challenge rewards for the period.'),
  startDate: z.string().describe('The start date of the challenge period in YYYY-MM-DD format.'),
  endDate: z.string().describe('The end date of the challenge period in YYYY-MM-DD format.'),
});
export type ChallengeGeneratorInput = z.infer<typeof ChallengeGeneratorInputSchema>;

const ChallengeSchema = z.object({
    tier: z.string().describe("The name of the challenge tier (e.g., 'Bronze', 'Silver', 'Gold')."),
    description: z.string().describe('A brief, motivating description of the challenge.'),
    target: z.number().describe('The total sales revenue (omset) target required to achieve this tier.'),
    reward: z.string().describe('The reward for achieving this tier.'),
});

const ChallengeGeneratorOutputSchema = z.object({
  challenges: z.array(ChallengeSchema).describe('A list of generated sales challenges.'),
  period: z.string().describe('The formatted challenge period string (e.g., "1 Jul - 31 Jul 2024").')
});
export type ChallengeGeneratorOutput = z.infer<typeof ChallengeGeneratorOutputSchema>;

export async function generateChallenges(
  input: ChallengeGeneratorInput
): Promise<ChallengeGeneratorOutput> {
  return challengeGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'challengeGeneratorPrompt',
  input: { schema: ChallengeGeneratorInputSchema },
  output: { schema: ChallengeGeneratorGptOutputSchema },
  prompt: `You are Chika AI, an expert in designing employee incentive programs for a vape store called "Bekupon Vape Store".

Your task is to generate a set of 3-4 tiered sales challenges for employees based on a total reward budget for a specific period. The challenges should be based on achieving a certain total sales revenue (omset) in Indonesian Rupiah (Rp).

The tiers should be creative and motivating (e.g., "Vape Rookie", "Cloud Chaser", "Master Puffer").
The targets should be realistic but challenging for a vape store employee, starting from a reasonable base and increasing for each tier. Consider the duration of the challenge when setting the targets. A shorter period should have a lower target.
The rewards should be distributed from the provided budget. The highest tier should get the biggest reward. The rewards can be cash bonuses.

Challenge Period: {{startDate}} to {{endDate}}
Total Reward Budget: Rp {{budget}}

Generate a set of challenges.`,
});

// We ask the LLM to generate the content, but we format the date ourselves.
// This avoids potential hallucinations in date formatting.
const ChallengeGeneratorGptOutputSchema = z.object({
  challenges: z.array(ChallengeSchema).describe('A list of generated sales challenges.'),
});


const challengeGeneratorFlow = ai.defineFlow(
  {
    name: 'challengeGeneratorFlow',
    inputSchema: ChallengeGeneratorInputSchema,
    outputSchema: ChallengeGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate challenges from AI.');
    }

    // Format the date period server-side for consistency
    const { format: formatDate, parseISO } = await import('date-fns');
    const { id } = await import('date-fns/locale');
    
    const start = parseISO(input.startDate);
    const end = parseISO(input.endDate);
    
    let period;
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      period = `${formatDate(start, 'd')} - ${formatDate(end, 'd MMMM yyyy', { locale: id })}`;
    } else if (start.getFullYear() === end.getFullYear()) {
      period = `${formatDate(start, 'd MMM', { locale: id })} - ${formatDate(end, 'd MMM yyyy', { locale: id })}`;
    } else {
      period = `${formatDate(start, 'd MMM yyyy', { locale: id })} - ${formatDate(end, 'd MMM yyyy', { locale: id })}`;
    }

    return {
      challenges: output.challenges,
      period: period
    };
  }
);
