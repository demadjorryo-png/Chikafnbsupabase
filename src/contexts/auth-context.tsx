
'use client';

import * as React from 'react';
import type { User, Store } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { stores as staticStores } from '@/lib/data';
import { getPradanaTokenBalance } from '@/lib/app-settings';

interface AuthContextType {
  currentUser: User | null;
  activeStore: Store | null;
  pradanaTokenBalance: number;
  isLoading: boolean;
  login: (userId: string, password: string) => Promise<void>;
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
      const balance = await getPradanaTokenBalance();
      setPradanaTokenBalance(balance);
  }, []);


  const handleUserSession = React.useCallback(async (firebaseUser: import('firebase/auth').User | null) => {
    if (firebaseUser) {
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
          
          refreshPradanaTokenBalance();
          
          // In single-store mode, always use the first store from static data.
          const singleStore = staticStores[0] || null;

          if (singleStore) {
            setCurrentUser(userData);
            setActiveStore(singleStore);
            sessionStorage.setItem('activeStoreId', singleStore.id); // Still useful for reference
          } else {
             throw new Error('No store configured in the application.');
          }

        } else {
          throw new Error('User data not found in database.');
        }
      } catch (error: any) {
        console.error("Session handling error:", error);
        toast({ variant: 'destructive', title: 'Session Error', description: error.message });
        await signOut(auth);
        setCurrentUser(null);
        setActiveStore(null);
        sessionStorage.removeItem('activeStoreId');
      }
    } else {
      setCurrentUser(null);
      setActiveStore(null);
    }
    setIsLoading(false);
  }, [toast, refreshPradanaTokenBalance]);


  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleUserSession);
    return () => unsubscribe();
  }, [handleUserSession]);


  const login = async (userId: string, password: string) => {
    const email = `${userId}@era5758.co.id`;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      await signOut(auth);
      throw new Error("Data pengguna tidak ditemukan di database.");
    }

    const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;

    if (userData.status === 'inactive') {
      await signOut(auth);
      throw new Error("Akun Anda saat ini nonaktif. Silakan hubungi admin.");
    }
    
    // In single-store mode, we always use the first store.
    const store = staticStores[0];
    if (!store) {
      throw new Error("Tidak ada toko yang dikonfigurasi dalam aplikasi.");
    }
    
    const balance = await getPradanaTokenBalance();
    setPradanaTokenBalance(balance);
    
    setCurrentUser(userData);
    setActiveStore(store);
    sessionStorage.setItem('activeStoreId', store.id);
    
    setIsLoading(false);

    toast({
        title: 'Login Berhasil!',
        description: `Selamat datang, ${userData.name}.`,
    });
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setActiveStore(null);
    setPradanaTokenBalance(0);
    sessionStorage.removeItem('activeStoreId');
    toast({
      title: 'Logout Berhasil',
      description: 'Anda telah berhasil keluar.',
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
