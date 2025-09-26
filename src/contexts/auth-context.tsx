

'use client';

import * as React from 'react';
import type { User, Store } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getWhatsappSettings } from '@/lib/whatsapp-settings';

// This will temporarily hold registration info for a new user
// between the register() call and the onAuthStateChanged trigger.
let newRegistrationInfo: { name: string; storeName: string; whatsapp: string } | null = null;

interface AuthContextType {
  currentUser: User | null;
  activeStore: Store | null;
  pradanaTokenBalance: number;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, storeName: string, email: string, password: string, whatsapp: string) => Promise<void>;
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
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        let userDocSnap = await getDoc(userDocRef);

        // **Create-on-first-signin logic**
        // If user doc doesn't exist, it's a new registration.
        if (!userDocSnap.exists() && newRegistrationInfo) {
          console.log("New user detected, creating documents...");
          const { name, storeName, whatsapp } = newRegistrationInfo;
          
          const batch = writeBatch(db);

          // 1. Create the store document
          const storeRef = doc(collection(db, "stores"));
          batch.set(storeRef, {
              name: storeName,
              location: 'Indonesia',
              pradanaTokenBalance: 50.00,
              adminUids: [firebaseUser.uid],
              createdAt: new Date().toISOString(),
          });
          
          // 2. Create the user document
          batch.set(userDocRef, {
              name: name,
              email: firebaseUser.email,
              whatsapp: whatsapp,
              role: 'admin',
              status: 'active',
              storeId: storeRef.id,
          });

          await batch.commit();
          console.log("Documents created successfully for new user.");

          // Clear the temp registration info
          newRegistrationInfo = null;
          
          // Re-fetch the user document
          userDocSnap = await getDoc(userDocRef);
        }


        if (userDocSnap.exists()) {
          const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
          
          if(userData.status === 'inactive') {
              throw new Error('Akun Anda tidak aktif. Silakan hubungi admin.');
          }

          let storeId: string | undefined = userData.storeId;
          
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
          } else if (userData.role === 'superadmin') {
              setCurrentUser(userData);
              setActiveStore(null);
          } else {
              throw new Error('Tidak dapat menemukan toko yang terkait dengan akun Anda.');
          }

        } else {
           // This case should ideally not be hit with the new logic, but is kept as a safeguard.
           console.error("User document not found for UID:", firebaseUser.uid);
           toast({ variant: 'destructive', title: 'Gagal Memuat Sesi', description: 'Data pengguna tidak ditemukan. Sesi akan diakhiri.' });
           await signOut(auth);
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
    newRegistrationInfo = null; // Clear any stale registration info
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest
     toast({
        title: 'Login Berhasil!',
        description: `Selamat datang kembali.`,
    });
  };

  const register = async (name: string, storeName: string, email: string, password: string, whatsapp: string) => {
    // Temporarily store the registration info.
    // This will be picked up by the onAuthStateChanged listener.
    newRegistrationInfo = { name, storeName, whatsapp };
    
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will now fire and handle the document creation.
         toast({
            title: 'Registrasi Berhasil!',
            description: `Selamat datang, ${name}! Toko Anda "${storeName}" sedang disiapkan.`,
        });
    } catch (error: any) {
        newRegistrationInfo = null; // Clean up on failure
        console.error("Registration failed:", error);
        
        if (error.code === 'auth/email-already-in-use') {
            throw new Error('Email ini sudah terdaftar. Silakan gunakan email lain.');
        }
        throw new Error('Terjadi kesalahan saat pendaftaran.');
    }
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setActiveStore(null);
    setPradanaTokenBalance(0);
    newRegistrationInfo = null; // Clear on logout
    toast({
      title: 'Logout Berhasil',
      description: 'Anda telah berhasil keluar.',
    });
  };

  const value = { currentUser, activeStore, pradanaTokenBalance, isLoading, login, register, logout, refreshPradanaTokenBalance };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
