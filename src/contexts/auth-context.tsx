
'use client';

import * as React from 'react';
import type { User, Store } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getPradanaTokenBalance } from '@/lib/app-settings';

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
    const storeDocRef = doc(db, 'stores', activeStore.id);
    const storeDoc = await getDoc(storeDocRef);
    if (storeDoc.exists()) {
        setPradanaTokenBalance(storeDoc.data().pradanaTokenBalance || 0);
    }
  }, [activeStore]);


  const handleUserSession = React.useCallback(async (firebaseUser: import('firebase/auth').User | null) => {
    if (firebaseUser) {
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;

          // Find the store associated with this user
          const storeQuery = query(collection(db, "stores"), where("adminUids", "array-contains", userData.id));
          const storeSnapshot = await getDocs(storeQuery);

          if (!storeSnapshot.empty) {
            const storeData = { id: storeSnapshot.docs[0].id, ...storeSnapshot.docs[0].data() } as Store;
            setCurrentUser(userData);
            setActiveStore(storeData);
            setPradanaTokenBalance(storeData.pradanaTokenBalance || 0);
            sessionStorage.setItem('activeStoreId', storeData.id);
          } else {
             throw new Error('Toko untuk pengguna ini tidak ditemukan.');
          }

        } else {
          throw new Error('Data pengguna tidak ditemukan di database.');
        }
      } catch (error: any) {
        console.error("Session handling error:", error);
        toast({ variant: 'destructive', title: 'Error Sesi', description: error.message });
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
  }, [toast]);


  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleUserSession);
    return () => unsubscribe();
  }, [handleUserSession]);


  const login = async (email: string, password: string) => {
    // Note: We now use email directly, not constructing it from userId
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest
    await handleUserSession(userCredential.user);
     toast({
        title: 'Login Berhasil!',
        description: `Selamat datang kembali.`,
    });
  };

  const register = async (name: string, storeName: string, email: string, password: string, whatsapp: string) => {
    // 1. Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // 2. Create the store document in Firestore
    const storeRef = await addDoc(collection(db, "stores"), {
        name: storeName,
        location: 'Indonesia', // Default location
        pradanaTokenBalance: 50.00, // Initial token balance
        adminUids: [firebaseUser.uid],
        createdAt: new Date().toISOString(),
    });

    // 3. Create the user document in Firestore
    const userDocRef = doc(db, "users", firebaseUser.uid);
    await setDoc(userDocRef, {
        name: name,
        userId: email, // Using email as userId for consistency
        email: email,
        whatsapp: whatsapp,
        role: 'admin',
        status: 'active',
    });
    
    // 4. Send notification to webhook
    try {
        const message = `Pendaftaran Baru Kasir POS Chika!
----------------------------------
Nama: ${name}
Nama Toko: ${storeName}
Email: ${email}
No. WhatsApp: ${whatsapp}
----------------------------------
Mohon segera verifikasi dan berikan sambutan.`;
        
        const webhookBaseUrl = 'https://app.whacenter.com/api/sendGroup?device_id=0fe2d894646b1e3111e0e40c809b5501&group=SPV%20ERA%20MMBP&message=';
        const fullWebhookUrl = `${webhookBaseUrl}${encodeURIComponent(message)}`;

        await fetch(fullWebhookUrl);
    } catch (webhookError) {
        console.error("Failed to send webhook notification:", webhookError);
        // Don't block the user registration for this, just log it.
    }


    // 5. Set session for the new user
    await handleUserSession(firebaseUser);
    
    toast({
        title: 'Registrasi Berhasil!',
        description: `Selamat datang, ${name}! Toko Anda "${storeName}" telah dibuat dengan saldo 50 token.`,
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
