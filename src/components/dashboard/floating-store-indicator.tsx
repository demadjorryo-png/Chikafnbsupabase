'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { stores } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Building } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function FloatingStoreIndicator() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get('storeId');
  
  // This component should only render if a storeId is present in the URL (i.e., for cashiers)
  if (!storeId) {
    return null;
  }

  const activeStore = stores.find(s => s.id === storeId);

  if (!activeStore) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 non-printable">
      <Badge variant="secondary" className="flex items-center gap-2 py-2 px-3 shadow-lg border-primary/20">
        <Building className="h-4 w-4" />
        <span className="font-semibold">Toko: {activeStore.name}</span>
      </Badge>
    </div>
  );
}
