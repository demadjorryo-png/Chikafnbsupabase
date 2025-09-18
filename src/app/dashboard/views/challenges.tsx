
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
import { Loader, Sparkles, Trophy, Calendar as CalendarIcon } from 'lucide-react';
import { generateChallenges } from '@/ai/flows/challenge-generator';
import type { ChallengeGeneratorOutput } from '@/ai/flows/challenge-generator';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/auth-context';
import { deductAiUsageFee } from '@/lib/app-settings';

export default function Challenges() {
  const [budget, setBudget] = React.useState(500000);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [generatedChallenges, setGeneratedChallenges] =
    React.useState<ChallengeGeneratorOutput | null>(null);
  const { toast } = useToast();
  const { pradanaTokenBalance, refreshPradanaTokenBalance } = useAuth();


  const handleGenerateChallenges = async () => {
    if (budget <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Budget',
        description: 'Please enter a budget greater than zero.',
      });
      return;
    }
    if (!date?.from || !date?.to) {
        toast({
            variant: 'destructive',
            title: 'Invalid Date',
            description: 'Please select a start and end date.',
        });
        return;
    }

    try {
      await deductAiUsageFee(pradanaTokenBalance, toast);
    } catch (error) {
      return; // Stop if not enough tokens
    }

    setIsLoading(true);
    setGeneratedChallenges(null);
    try {
      const result = await generateChallenges({ 
          budget,
          startDate: format(date.from, 'yyyy-MM-dd'),
          endDate: format(date.to, 'yyyy-MM-dd'),
       });
      setGeneratedChallenges(result);
      refreshPradanaTokenBalance();
      toast({
        title: 'Challenges Generated!',
        description: `Chika AI has successfully created new challenges for the period ${result.period}.`,
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
            Set a reward budget and a date range. Chika AI will create motivating sales
            challenges based on total revenue (omset) for that period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-4">
             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="budget">Reward Budget (Rp)</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    placeholder="e.g., 1000000"
                    step="50000"
                  />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="date">Challenge Period</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                            date.to ? (
                                <>
                                {format(date.from, "LLL dd, y")} -{" "}
                                {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Pick a date</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                </div>
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
              Generate with Chika AI (0.1 Token)
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
              Active challenges for the period: <span className='font-semibold'>{generatedChallenges.period}</span>
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
