import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
            <div className="mb-4">
                <Image 
                    src="https://era5758.co.id/wp-content/uploads/2024/07/logo-bkpn-1-scaled.png" 
                    alt="Bekupon Logo" 
                    width={80} 
                    height={80} 
                    className="rounded-full"
                />
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
