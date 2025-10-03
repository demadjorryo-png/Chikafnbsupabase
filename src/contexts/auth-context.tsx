
'use client';

import * as React from 'react';
import type { User, Store } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: User | null;
  activeStore: Store | null;
  pradanaTokenBalance: number;
  isLoading: boolean;
  login: (email: string, password: string, storeId?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPradanaTokenBalance: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [activeStore, setActiveStore] = React.useState<Store | null>(null);
  const [pradanaTokenBalance, setPradanaTokenBalance] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  const refreshPradanaTokenBalance = React.useCallback(async () => {
    if (!activeStore) return;
    try {
      const storeDocRef = doc(db, 'stores', activeStore.id);
      const storeDoc = await getDoc(storeDocRef);
      if (storeDoc.exists()) {
        setPradanaTokenBalance(storeDoc.data()?.pradanaTokenBalance || 0);
      }
    } catch (error) {
      console.error("Error refreshing token balance:", error);
    }
  }, [activeStore]);

  const handleUserSession = React.useCallback(async (user: import('firebase/auth').User | null) => {
    setIsLoading(true);
    if (user) {
      try {
        const idTokenResult = await user.getIdTokenResult();
        const claims = idTokenResult.claims;
        const role = claims.role || 'cashier';

        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          throw new Error(`User document not found in Firestore for UID: ${user.uid}`);
        }
        
        const userData = { id: userDoc.id, ...userDoc.data() } as User;

        if (userData.status === 'inactive') {
          throw new Error('Akun Anda tidak aktif. Silakan hubungi administrator.');
        }

        setCurrentUser(userData);

        if (role === 'superadmin') {
          setActiveStore(null);
          setPradanaTokenBalance(0);
        } else {
          // For admin and cashier, get the active store from session storage
          const sessionStoreId = sessionStorage.getItem('activeStoreId');
          if (!sessionStoreId) {
             throw new Error('Sesi toko tidak ditemukan. Silakan login kembali.');
          }

          const storeDocRef = doc(db, 'stores', sessionStoreId);
          const storeDoc = await getDoc(storeDocRef);

          if (!storeDoc.exists()) {
            throw new Error(`Toko dengan ID '${sessionStoreId}' tidak ditemukan.`);
          }

          const storeData = { id: storeDoc.id, ...storeDoc.data() } as Store;

          // Security check: ensure cashier/admin belongs to the store
          if (role === 'cashier' && userData.storeId !== storeData.id) {
              throw new Error('Anda tidak diizinkan mengakses toko ini.');
          }
           if (role === 'admin' && !storeData.adminUids.includes(user.uid)) {
              throw new Error('Anda bukan admin di toko ini.');
          }

          setActiveStore(storeData);
          setPradanaTokenBalance(storeData.pradanaTokenBalance || 0);
        }
      } catch (error: any) {
        console.error("Error handling user session:", error);
        toast({ variant: 'destructive', title: 'Error Sesi', description: error.message });
        await signOut(auth);
        setCurrentUser(null);
        setActiveStore(null);
        sessionStorage.removeItem('activeStoreId');
      } finally {
        setIsLoading(false);
      }
    } else {
      setCurrentUser(null);
      setActiveStore(null);
      setIsLoading(false);
      sessionStorage.removeItem('activeStoreId');
    }
  }, [toast]);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleUserSession);
    return () => unsubscribe();
  }, [handleUserSession]);

  const login = async (email: string, password: string, storeId?: string) => {
    if (!storeId && !email.toLowerCase().includes('riopradana')) {
        const userDocQuery = await getDoc(doc(db, 'users', email.split('@')[0]));
        if (userDocQuery.exists() && userDocQuery.data().role !== 'superadmin') {
            throw new Error('Silakan pilih toko terlebih dahulu.');
        }
    }

    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const idTokenResult = await user.getIdTokenResult(true); // Force refresh claims
    const userRole = idTokenResult.claims.role;

    if (userRole === 'superadmin') {
        sessionStorage.removeItem('activeStoreId');
    } else if (storeId) {
        sessionStorage.setItem('activeStoreId', storeId);
    } else {
        await signOut(auth);
        throw new Error('Toko harus dipilih untuk peran admin atau kasir.');
    }

    toast({
      title: 'Login Berhasil!',
      description: `Selamat datang kembali.`,
    });
    // The onAuthStateChanged listener will handle the rest
  };

  const logout = async () => {
    await signOut(auth);
    sessionStorage.removeItem('activeStoreId');
    toast({
      title: 'Logout Berhasil',
      description: 'Anda telah keluar.',
    });
  };

  const value = { currentUser, activeStore, pradanaTokenBalance, isLoading, login, logout, refreshPradanaTokenBalance };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
