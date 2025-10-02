
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
    setIsLoading(true);
    if (firebaseUser) {
      try {
        // Force refresh the token to get the latest custom claims.
        const idTokenResult = await firebaseUser.getIdTokenResult(true);
        const claims = idTokenResult.claims;
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
           throw new Error(`User document not found in Firestore for UID: ${firebaseUser.uid}`);
        }
        
        const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
        
        if (userData.status === 'inactive') {
            throw new Error('Your account is inactive. Please contact your administrator.');
        }

        setCurrentUser(userData);

        // SUPERADMIN PATH: Must not have a storeId, exits early.
        if (claims.role === 'superadmin') {
            setActiveStore(null);
            setPradanaTokenBalance(0);
            setIsLoading(false);
            return; // EXIT EARLY
        } 
        
        // OTHER ROLES (admin, cashier): Must have a storeId.
        const storeId = claims.storeId as string | undefined;

        if (storeId) {
            const storeDocRef = doc(db, 'stores', storeId);
            const storeDocSnap = await getDoc(storeDocRef);
            if (storeDocSnap.exists()) {
                const storeData = { id: storeDocSnap.id, ...storeDocSnap.data() } as Store;
                setActiveStore(storeData);
                setPradanaTokenBalance(storeData.pradanaTokenBalance || 0);
            } else {
                throw new Error(`Store with ID '${storeId}' from user claim not found.`);
            }
        } else {
            // This error is critical. It means a non-superadmin user is missing the storeId claim.
            // This is likely due to an old user account created before claims were implemented.
            const role = claims.role || 'N/A';
            throw new Error(`storeId claim is missing for user UID: ${firebaseUser.uid} with role: '${role}'.`);
        }

      } catch (error: any) {
        console.error("Error handling user session:", error);
        toast({ variant: 'destructive', title: 'Session Error', description: error.message });
        await signOut(auth);
        setCurrentUser(null);
        setActiveStore(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      // No user is signed in.
      setCurrentUser(null);
      setActiveStore(null);
      setIsLoading(false);
    }
  }, [toast]);


  React.useEffect(() => {
    // onAuthStateChanged returns an unsubscribe function.
    const unsubscribe = onAuthStateChanged(auth, handleUserSession);
    // The cleanup function will run when the component unmounts.
    return () => unsubscribe();
  }, [handleUserSession]);


  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will automatically handle the session setup.
     toast({
        title: 'Login Successful!',
        description: `Welcome back.`,
    });
  };

  const logout = async () => {
    await signOut(auth);
    // onAuthStateChanged will handle clearing the session state.
    toast({
      title: 'Logout Successful',
      description: 'You have been signed out.',
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
