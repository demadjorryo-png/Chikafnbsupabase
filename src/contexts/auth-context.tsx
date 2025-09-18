

'use client';

import * as React from 'react';
import type { User, Store } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
        // Try to get user document.
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        let userDocSnap = await getDoc(userDocRef);

        // Retry mechanism for registration lag
        if (!userDocSnap.exists()) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            userDocSnap = await getDoc(userDocRef);
        }
        
        if (userDocSnap.exists()) {
          const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;

          const storeQuery = query(collection(db, "stores"), where("adminUids", "array-contains", userData.id));
          const storeSnapshot = await getDocs(storeQuery);

          if (!storeSnapshot.empty) {
            const storeData = { id: storeSnapshot.docs[0].id, ...storeSnapshot.docs[0].data() } as Store;
            setCurrentUser(userData);
            setActiveStore(storeData);
            setPradanaTokenBalance(storeData.pradanaTokenBalance || 0);
            sessionStorage.setItem('activeStoreId', storeData.id);
          } else {
             // For non-admin users (cashiers), find their assigned store
             if (userData.role === 'cashier' && userData.storeId) {
                const storeDocRef = doc(db, 'stores', userData.storeId);
                const storeDoc = await getDoc(storeDocRef);
                if (storeDoc.exists()) {
                     const storeData = { id: storeDoc.id, ...storeDoc.data() } as Store;
                     setCurrentUser(userData);
                     setActiveStore(storeData);
                     setPradanaTokenBalance(storeData.pradanaTokenBalance || 0);
                     sessionStorage.setItem('activeStoreId', storeData.id);
                } else {
                    throw new Error(`Toko dengan ID ${userData.storeId} tidak ditemukan.`);
                }
             } else {
                throw new Error('Toko untuk pengguna ini tidak dapat ditentukan.');
             }
          }

        } else {
           // If user doc still doesn't exist, log out the user so they can try again.
           console.error("User document not found in Firestore after retry for UID:", firebaseUser.uid);
           toast({ variant: 'destructive', title: 'Gagal Memuat Sesi', description: 'Data pengguna tidak ditemukan. Sesi akan diakhiri, silakan coba login kembali.' });
           await signOut(auth); // This will re-trigger onAuthStateChanged with null
        }
      } catch (error: any) {
        console.error("Kesalahan saat menangani sesi:", error);
        toast({ variant: 'destructive', title: 'Error Sesi', description: error.message });
        await signOut(auth);
        setCurrentUser(null);
        setActiveStore(null);
        sessionStorage.removeItem('activeStoreId');
      }
    } else {
      setCurrentUser(null);
      setActiveStore(null);
      sessionStorage.removeItem('activeStoreId');
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
    // 1. Create user in Firebase Auth. This will trigger onAuthStateChanged.
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // 2. Create the store document in Firestore
    const storeRef = await addDoc(collection(db, "stores"), {
        name: storeName,
        location: 'Indonesia',
        pradanaTokenBalance: 50.00,
        adminUids: [firebaseUser.uid],
        createdAt: new Date().toISOString(),
    });

    // 3. Create the user document in Firestore
    const userDocRef = doc(db, "users", firebaseUser.uid);
    await setDoc(userDocRef, {
        name: name,
        email: email,
        whatsapp: whatsapp,
        role: 'admin',
        status: 'active',
    });
    
    // 4. Send notifications
    try {
        const adminMessage = `Pendaftaran Baru Kasir POS Chika!
----------------------------------
Nama: ${name}
Nama Toko: ${storeName}
Email: ${email}
No. WhatsApp: ${whatsapp}
----------------------------------
Mohon segera verifikasi dan berikan sambutan.`;

        const welcomeMessage = `*Pendaftaran Akun Kasir POS Chika Anda Berhasil!*

Halo ${name}, selamat datang!

Berikut adalah detail akun Anda untuk toko *${storeName}*:
- *Nama Lengkap:* ${name}
- *Nama Toko:* ${storeName}
- *Email (untuk login):* ${email}
- *Nomor WhatsApp:* ${whatsapp}

*PENTING:* Untuk keamanan akun Anda, kami *tidak mengirimkan password* Anda melalui pesan ini. Mohon simpan password yang telah Anda buat di tempat yang aman.

Anda mendapatkan bonus saldo awal *50 Pradana Token* untuk memulai.

Silakan login dan mulai kelola bisnis Anda dengan Kasir POS Chika.

Terima kasih!
Tim Kasir POS Chika`;

        const deviceId = '0fe2d894646b1e3111e0e40c809b5501';

        const adminWebhookUrl = `https://app.whacenter.com/api/sendGroup?device_id=${deviceId}&group=SPV%20ERA%20MMBP&message=${encodeURIComponent(adminMessage)}`;
        
        const formattedWhatsapp = whatsapp.startsWith('0') ? `62${whatsapp.substring(1)}` : whatsapp;
        const userWebhookUrl = `https://app.whacenter.com/api/send?device_id=${deviceId}&number=${formattedWhatsapp}&message=${encodeURIComponent(welcomeMessage)}`;

        await Promise.allSettled([
            fetch(adminWebhookUrl),
            fetch(userWebhookUrl)
        ]);

    } catch (webhookError) {
        console.error("Gagal mengirim notifikasi webhook:", webhookError);
    }

    toast({
        title: 'Registrasi Berhasil!',
        description: `Selamat datang, ${name}! Toko Anda "${storeName}" telah dibuat dengan saldo 50 token.`,
    });
    // The onAuthStateChanged listener will now handle setting the session.
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
