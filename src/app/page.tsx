import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bird } from 'lucide-react';
import Link from 'next/link';

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                <Bird className="h-8 w-8" />
            </div>
          <CardTitle className="font-headline text-4xl tracking-wider">
            BEKUPON BASECAMP
          </CardTitle>
          <CardDescription>
            Aplikasi POS & CRM untuk "Bekupon Vape Store"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" passHref>
            <Button className="w-full font-headline text-lg tracking-wider" size="lg">
              Masuk
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
