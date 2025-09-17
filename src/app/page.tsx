import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

function VapeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 20v-6h12v6H6z" />
      <path d="M18 14V6" />
      <path d="M6 14V9" />
      <path d="M14 6h-4" />
      <path d="M12 6V4" />
    </svg>
  );
}


export default function WelcomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
                <VapeIcon className="h-12 w-12" />
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
