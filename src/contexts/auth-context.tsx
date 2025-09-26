
'use client';

import * as React from 'react';
import type { User, Store } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
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
           console.error("User document not found for UID:", firebaseUser.uid);
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
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest
     toast({
        title: 'Login Berhasil!',
        description: `Selamat datang kembali.`,
    });
  };

  const register = async (name: string, storeName: string, email: string, password: string, whatsapp: string) => {
    let userCredential;
    try {
        // 1. Create user in Firebase Auth
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        // 2. Create store and user documents in Firestore
        const batch = writeBatch(db);

        const storeRef = doc(collection(db, "stores"));
        batch.set(storeRef, {
            name: storeName,
            location: 'Indonesia',
            pradanaTokenBalance: 50.00,
            adminUids: [newUser.uid],
            createdAt: new Date().toISOString(),
        });

        const userRef = doc(db, "users", newUser.uid);
        batch.set(userRef, {
            name: name,
            email: newUser.email,
            whatsapp: whatsapp,
            role: 'admin',
            status: 'active',
            storeId: storeRef.id,
        });
        
        // 3. Commit the batch
        await batch.commit();

        toast({
            title: 'Registrasi Berhasil!',
            description: `Selamat datang, ${name}! Toko Anda "${storeName}" sedang disiapkan.`,
        });
        // onAuthStateChanged will automatically handle the session.

    } catch (error: any) {
        console.error("Registration failed:", error);

        // Cleanup: If auth user was created but firestore failed, delete the auth user
        if (userCredential) {
            try {
                await deleteUser(userCredential.user);
                console.log("Orphaned auth user deleted.");
            } catch (deleteError) {
                console.error("Failed to delete orphaned auth user:", deleteError);
            }
        }
        
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
