
'use client';

import * as React from 'react';
import type { User, Store } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { stores as staticStores } from '@/lib/data';

interface AuthContextType {
  currentUser: User | null;
  activeStore: Store | null;
  isLoading: boolean;
  login: (userId: string, password: string, role: 'admin' | 'cashier', store?: Store) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [activeStore, setActiveStore] = React.useState<Store | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  const handleUserSession = React.useCallback(async (firebaseUser: import('firebase/auth').User | null) => {
    if (firebaseUser) {
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
          setCurrentUser(userData);

          const storeId = sessionStorage.getItem('activeStoreId');
          if (userData.role === 'cashier' && storeId) {
            const storeData = staticStores.find(s => s.id === storeId) || null;
            setActiveStore(storeData);
          } else {
            setActiveStore(null);
          }
          
          toast({
              title: 'Sesi Dipulihkan',
              description: `Selamat datang kembali, ${userData.name}.`,
          });

        } else {
          // User exists in Auth but not in Firestore, treat as an error and sign out
          throw new Error('User data not found in database.');
        }
      } catch (error) {
        console.error("Session handling error:", error);
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


  const login = async (userId: string, password: string, role: 'admin' | 'cashier', store?: Store) => {
    const email = `${userId}@era5758.co.id`;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    const userQuery = query(collection(db, "users"), where("userId", "==", userId));
    const userDoc = await getDocs(userQuery);
    
    if (userDoc.empty) {
      await signOut(auth);
      throw new Error("Data pengguna tidak ditemukan di database.");
    }

    const userData = { id: userDoc.docs[0].id, ...userDoc.docs[0].data() } as User;

    if (userData.role !== role) {
        await signOut(auth);
        throw new Error(`Anda mencoba login sebagai ${role}, tetapi akun Anda terdaftar sebagai ${userData.role}.`);
    }

    if (userData.status === 'inactive') {
      await signOut(auth);
      throw new Error("Akun Anda saat ini nonaktif. Silakan hubungi admin.");
    }
    
    setCurrentUser(userData);
    if (role === 'cashier' && store) {
        setActiveStore(store);
        // Persist store choice in session storage
        sessionStorage.setItem('activeStoreId', store.id);
    } else {
        setActiveStore(null);
        sessionStorage.removeItem('activeStoreId');
    }
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
    sessionStorage.removeItem('activeStoreId');
    toast({
      title: 'Logout Berhasil',
      description: 'Anda telah berhasil keluar.',
    });
  };

  const value = { currentUser, activeStore, isLoading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
