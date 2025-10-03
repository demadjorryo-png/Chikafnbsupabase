
'use client';

import * as React from 'react';
import type { User, Store } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

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

  const handleLogout = React.useCallback(async () => {
    await signOut(auth);
    setCurrentUser(null);
    setActiveStore(null);
    try {
        sessionStorage.removeItem('activeStoreId');
    } catch (e) {
        console.warn("Could not clear session storage:", e);
    }
  }, []);

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
          let sessionStoreId: string | null = null;
          try {
            sessionStoreId = sessionStorage.getItem('activeStoreId');
          } catch(e) {
            console.error("Session storage is not available.");
            throw new Error("Penyimpanan sesi browser tidak tersedia. Silakan aktifkan.");
          }
          
          if (!sessionStoreId) {
             console.log("No active store in session, logging out and redirecting.");
             await handleLogout();
             router.push('/login');
             return; // Stop execution
          }

          const storeDocRef = doc(db, 'stores', sessionStoreId);
          const storeDoc = await getDoc(storeDocRef);

          if (!storeDoc.exists()) {
            throw new Error(`Toko dengan ID '${sessionStoreId}' tidak ditemukan.`);
          }

          const storeData = { id: storeDoc.id, ...storeDoc.data() } as Store;

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
        await handleLogout();
      } finally {
        setIsLoading(false);
      }
    } else {
      await handleLogout();
      setIsLoading(false);
    }
  }, [toast, router, handleLogout]);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleUserSession);
    return () => unsubscribe();
  }, [handleUserSession]);

  const login = async (email: string, password: string, storeId?: string) => {
    if (!storeId && !email.toLowerCase().includes('riopradana')) {
        const userDocRef = doc(db, 'users', email.split('@')[0]);
        const userDocQuery = await getDoc(userDocRef).catch(() => null);

        if (userDocQuery && userDocQuery.exists() && userDocQuery.data().role !== 'superadmin') {
            throw new Error('Silakan pilih toko terlebih dahulu.');
        }
    }

    const { user } = await signInWithEmailAndPassword(auth, email, password);
    await user.getIdTokenResult(true); 

    if (storeId) {
        sessionStorage.setItem('activeStoreId', storeId);
    }

    toast({
      title: 'Login Berhasil!',
      description: `Selamat datang kembali.`,
    });
  };

  const logout = async () => {
    await handleLogout();
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
