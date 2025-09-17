'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { stores } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Building } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/lib/types';

export function FloatingStoreIndicator() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get('storeId');
  const userId = searchParams.get('userId');
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      if (userId) {
        if (userId === 'admin001') {
          const { users: mockUsers } = await import('@/lib/data');
          setCurrentUser(mockUsers.find(u => u.id === 'admin001') || null);
        } else {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            setCurrentUser({ id: userDoc.id, ...userDoc.data() } as User);
          }
        }
      }
    };
    fetchUser();
  }, [userId]);

  const activeStore = stores.find(s => s.id === storeId);

  // Don't show for admin role
  if (!activeStore || !currentUser || currentUser.role === 'admin') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge variant="secondary" className="flex items-center gap-2 py-2 px-3 shadow-lg border-primary/20">
        <Building className="h-4 w-4" />
        <span className="font-semibold">Toko: {activeStore.name}</span>
      </Badge>
    </div>
  );
}
