'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Cog } from 'lucide-react';

export default function Settings() {

  return (
    <Card>
        <CardHeader>
        <CardTitle className="font-headline tracking-wider">
            Settings
        </CardTitle>
        <CardDescription>
            Manage your application settings here.
        </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center text-muted-foreground">
                <Cog className="h-16 w-16" />
                <p className="text-lg font-semibold">Under Construction</p>
                <p>This settings page is currently under development. Check back soon!</p>
            </div>
        </CardContent>
    </Card>
  );
}
