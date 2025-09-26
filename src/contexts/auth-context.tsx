
'use client';

import * as React from 'react';
import type { User, Store } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: User | null;
  activeStore: Store | null;
  pradanaTokenBalance: number;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
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
            setPradanaTokenBalance(storeDoc.data().pradanaTokenBalance || 0);
        }
    } catch (error) {
        console.error("Error refreshing token balance:", error);
    }
  }, [activeStore]);

  const handleUserSession = React.useCallback(async (firebaseUser: import('firebase/auth').User | null) => {
    if (firebaseUser) {
      try {
        const idTokenResult = await firebaseUser.getIdTokenResult(true);
        const claims = idTokenResult.claims;
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
           throw new Error("User document not found in Firestore.");
        }
        
        const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
        
        if (userData.status === 'inactive') {
            throw new Error('Akun Anda tidak aktif. Silakan hubungi admin.');
        }

        const storeId = claims.storeId as string | undefined;

        if (storeId) {
          const storeDocRef = doc(db, 'stores', storeId);
          const storeDocSnap = await getDoc(storeDocRef);
          if (storeDocSnap.exists()) {
              const storeData = { id: storeDocSnap.id, ...storeDocSnap.data() } as Store;
              setCurrentUser(userData);
              setActiveStore(storeData);
              setPradanaTokenBalance(storeData.pradanaTokenBalance || 0);
          } else {
               throw new Error(`Toko dengan ID ${storeId} tidak ditemukan.`);
          }
        } else if (claims.role === 'admin') {
            // Admin might not have a storeId claim, find store via adminUids
            const storesQuery = query(collection(db, 'stores'), where('adminUids', 'array-contains', firebaseUser.uid));
            const storesSnapshot = await getDocs(storesQuery);
            if (!storesSnapshot.empty) {
                // For simplicity, assign the first store found. 
                // A multi-store admin would need a store-switcher UI.
                const storeDoc = storesSnapshot.docs[0];
                const storeData = { id: storeDoc.id, ...storeDoc.data() } as Store;
                setCurrentUser(userData);
                setActiveStore(storeData);
                setPradanaTokenBalance(storeData.pradanaTokenBalance || 0);
            } else {
                throw new Error('Anda adalah admin, tetapi tidak terdaftar di toko manapun.');
            }
        } else if (claims.role === 'superadmin') {
            setCurrentUser(userData);
            setActiveStore(null);
        } else {
            throw new Error('Tidak dapat menemukan toko yang terkait dengan akun Anda (missing storeId claim).');
        }

      } catch (error: any) {
        console.error("Kesalahan saat menangani sesi:", error);
        toast({ variant: 'destructive', title: 'Error Sesi', description: error.message });
        await signOut(auth);
        setCurrentUser(null);
        setActiveStore(null);
      }
    } else {
      setCurrentUser(null);
      setActiveStore(null);
    }
    setIsLoading(false);
  }, [toast]);


  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleUserSession);
    return () => unsubscribe();
  }, [handleUserSession]);


  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest
     toast({
        title: 'Login Berhasil!',
        description: `Selamat datang kembali.`,
    });
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setActiveStore(null);
    setPradanaTokenBalance(0);
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
