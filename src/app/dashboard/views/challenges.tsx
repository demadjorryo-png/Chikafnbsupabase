'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader, Sparkles, Trophy } from 'lucide-react';
import { generateChallenges } from '@/ai/flows/challenge-generator';
import type { ChallengeGeneratorOutput } from '@/ai/flows/challenge-generator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export default function Challenges() {
  const [budget, setBudget] = React.useState(500000);
  const [isLoading, setIsLoading] = React.useState(false);
  const [generatedChallenges, setGeneratedChallenges] =
    React.useState<ChallengeGeneratorOutput | null>(null);
  const { toast } = useToast();

  const handleGenerateChallenges = async () => {
    if (budget <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Budget',
        description: 'Please enter a budget greater than zero.',
      });
      return;
    }
    setIsLoading(true);
    setGeneratedChallenges(null);
    try {
      const result = await generateChallenges({ budget });
      setGeneratedChallenges(result);
      toast({
        title: 'Challenges Generated!',
        description: 'Chika AI has successfully created new challenges.',
      });
    } catch (error) {
      console.error('Error generating challenges:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'Could not generate challenges. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline tracking-wider">
            Generate Employee Challenges
          </CardTitle>
          <CardDescription>
            Set a monthly reward budget and let Chika AI create motivating sales
            challenges for your employees based on total revenue (omset).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Monthly Reward Budget (Rp)</Label>
              <Input
                id="budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                placeholder="e.g., 1000000"
                step="50000"
              />
            </div>
            <Button
              onClick={handleGenerateChallenges}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate with Chika AI
            </Button>
          </div>
        </CardContent>
      </Card>
      {generatedChallenges && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline tracking-wider">
              Generated Challenges
            </CardTitle>
            <CardDescription>
              These are the active challenges for this period.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {generatedChallenges.challenges.map((challenge, index) => (
              <Card key={index} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-primary" />
                    <span>{challenge.tier}</span>
                  </CardTitle>
                  <CardDescription>{challenge.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Target Omset
                      </p>
                      <p className="text-xl font-bold">
                        Rp {challenge.target.toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Reward
                      </p>
                      <p className="text-lg font-semibold text-accent">
                        {challenge.reward}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
          <CardFooter>
            <Button>Save & Activate Challenges</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
