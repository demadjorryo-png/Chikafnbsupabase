

'use client';

import * as React from 'react';
import type { User, Store } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getWhatsappSettings } from '@/lib/whatsapp-settings';

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

// Temporary state to hold new user info during registration
let newRegistrationInfo: { name: string, storeName: string, whatsapp: string } | null = null;

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

        // If user document doesn't exist, it's a new registration.
        if (!userDocSnap.exists() && newRegistrationInfo) {
            console.log("New user detected, creating documents...");
            
            // 1. Create the store document
            const storeRef = await addDoc(collection(db, "stores"), {
                name: newRegistrationInfo.storeName,
                location: 'Indonesia',
                pradanaTokenBalance: 50.00,
                adminUids: [firebaseUser.uid],
                createdAt: new Date().toISOString(),
            });

            // 2. Create the user document
            const newUser: Omit<User, 'id'> = {
                name: newRegistrationInfo.name,
                email: firebaseUser.email!,
                whatsapp: newRegistrationInfo.whatsapp,
                role: 'admin',
                status: 'active',
                storeId: storeRef.id,
            };
            await setDoc(userDocRef, newUser);

            // 3. Send notifications
            // ... (Notification logic can be moved to a Cloud Function triggered by user creation for more reliability)

            userDocSnap = await getDoc(userDocRef); // Re-fetch the newly created doc
            newRegistrationInfo = null; // Clear registration info
        }
        
        if (userDocSnap.exists()) {
          const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
          
          if(userData.status === 'inactive') {
              throw new Error('Akun Anda tidak aktif. Silakan hubungi admin.');
          }

          let storeId: string | undefined = userData.storeId;
          
          if (!storeId && (userData.role === 'admin' || userData.role === 'cashier')) {
             const storeQuery = query(collection(db, "stores"), where("adminUids", "array-contains", userData.id));
             const storeSnapshot = await getDocs(storeQuery);
             if (!storeSnapshot.empty) {
                 storeId = storeSnapshot.docs[0].id;
             }
          }

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
           console.error("User document not found and could not be created for UID:", firebaseUser.uid);
           toast({ variant: 'destructive', title: 'Gagal Memuat Sesi', description: 'Data pengguna tidak ditemukan. Sesi akan diakhiri, silakan coba login kembali.' });
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
    newRegistrationInfo = null; // Clear any stale registration data
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest
     toast({
        title: 'Login Berhasil!',
        description: `Selamat datang kembali.`,
    });
  };

  const register = async (name: string, storeName: string, email: string, password: string, whatsapp: string) => {
    // Store registration info temporarily
    newRegistrationInfo = { name, storeName, whatsapp };
    
    // Create user in Firebase Auth. onAuthStateChanged will handle document creation.
    await createUserWithEmailAndPassword(auth, email, password);

    toast({
        title: 'Registrasi Berhasil!',
        description: `Selamat datang, ${name}! Toko Anda "${storeName}" sedang disiapkan.`,
    });
  };

  const logout = async () => {
    newRegistrationInfo = null;
    await signOut(auth);
    setCurrentUser(null);
    setActiveStore(null);
    setPradanaTokenBalance(0);
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
