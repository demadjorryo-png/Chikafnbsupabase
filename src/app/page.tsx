import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud } from 'lucide-react';
import Link from 'next/link';

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Cloud className="h-12 w-12" />
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
