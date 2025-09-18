
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
  login: (userId: string, password: string, role: 'admin' | 'cashier', store: Store) => Promise<void>;
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
          
          // Always refresh token balance on session handling for both roles
          refreshPradanaTokenBalance();

          const storeId = sessionStorage.getItem('activeStoreId');
          if (storeId) {
            const storeData = staticStores.find(s => s.id === storeId) || null;
            if (storeData) {
              setCurrentUser(userData);
              setActiveStore(storeData);
            } else {
              await signOut(auth);
              sessionStorage.removeItem('activeStoreId');
              toast({
                  variant: 'destructive',
                  title: 'Sesi Tidak Valid',
                  description: 'Data toko tidak ditemukan. Silakan login kembali.',
              });
            }
          } else {
             await signOut(auth);
             toast({
                variant: 'destructive',
                title: 'Sesi Berakhir',
                description: 'Konteks toko tidak ditemukan. Silakan login kembali.',
             });
          }
        } else {
          throw new Error('User data not found in database.');
        }
      } catch (error) {
        console.error("Session handling error:", error);
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


  const login = async (userId: string, password: string, role: 'admin' | 'cashier', store: Store) => {
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
    
    // Always get token balance on login
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
