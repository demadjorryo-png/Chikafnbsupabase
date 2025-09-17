'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { redemptionOptions as initialRedemptionOptions, users } from '@/lib/data';
import type { RedemptionOption, User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, CheckCircle, XCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSearchParams } from 'next/navigation';

export default function Promotions() {
  const [redemptionOptions, setRedemptionOptions] = React.useState(initialRedemptionOptions);
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const currentUser = users.find((u) => u.id === userId);
  const isAdmin = currentUser?.role === 'admin';

  const toggleStatus = (id: string) => {
    setRedemptionOptions((prevOptions) =>
      prevOptions.map((option) =>
        option.id === id ? { ...option, isActive: !option.isActive } : option
      )
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-headline tracking-wider">
              Loyalty Promotions
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? 'Manage active loyalty point redemption promotions.'
                : 'View currently active loyalty point redemption promotions.'}
            </CardDescription>
          </div>
          {isAdmin && (
            <Button size="sm" className="gap-1" disabled>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Add Promotion
              </span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Points Required</TableHead>
              <TableHead className="text-right">Value (Rp)</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {redemptionOptions.map((option) => (
              <TableRow key={option.id}>
                <TableCell className="font-medium">{option.description}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={option.isActive ? 'default' : 'destructive'}>
                    {option.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {option.pointsRequired.toLocaleString('id-ID')}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {option.value.toLocaleString('id-ID')}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => toggleStatus(option.id)}>
                          {option.isActive ? (
                            <XCircle className="mr-2 h-4 w-4" />
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          <span>{option.isActive ? 'Deactivate' : 'Activate'}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" disabled>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
