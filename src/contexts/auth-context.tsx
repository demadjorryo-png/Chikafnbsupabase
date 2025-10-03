
'use client';

import * as React from 'react';
import type { User, Store } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: User | null;
  activeStore: Store | null;
  pradanaTokenBalance: number;
  isLoading: boolean;
  login: (userId: string, password: string, storeId?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPradanaTokenBalance: () => void;
  availableStores: Store[];
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [activeStore, setActiveStore] = React.useState<Store | null>(null);
  const [pradanaTokenBalance, setPradanaTokenBalance] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [availableStores, setAvailableStores] = React.useState<Store[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  
  React.useEffect(() => {
    const fetchStores = async () => {
        try {
            const storesCollection = collection(db, 'stores');
            const storesSnapshot = await getDocs(storesCollection);
            const storesList = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
            setAvailableStores(storesList);
        } catch (error) {
            console.error("Error fetching available stores:", error);
        }
    };
    fetchStores();
  }, []);

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
             console.log("No active store in session, redirecting to login.");
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

  const login = async (userId: string, password: string, storeId?: string) => {
    const email = `${userId}@era5758.co.id`;
    
    // Early check for non-superadmin users if no store is selected
    if (!storeId) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            if (userData.role !== 'superadmin') {
                throw new Error('Silakan pilih toko Anda terlebih dahulu.');
            }
        }
        // If user not found, Firebase Auth will handle it later.
    }
    
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const idTokenResult = await user.getIdTokenResult(true);
    const role = idTokenResult.claims.role;

    if(role !== 'superadmin' && !storeId){
      await signOut(auth);
      throw new Error('Sesi tidak valid. Kasir atau Admin harus memilih toko.');
    }
    
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

  const value = { currentUser, activeStore, pradanaTokenBalance, isLoading, login, logout, refreshPradanaTokenBalance, availableStores };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
