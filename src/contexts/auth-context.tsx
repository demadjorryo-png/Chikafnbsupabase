
'use client';

import * as React from 'react';
import type { User, Store } from '@/lib/types';
import { supabase } from '@/lib/supabase';
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
      const { data, error } = await supabase
        .from('stores')
        .select('pradanaTokenBalance')
        .eq('id', activeStore.id)
        .single();

      if (error) {
        throw error;
      }

      setPradanaTokenBalance(data.pradanaTokenBalance || 0);
    } catch (error) {
      console.error("Error refreshing token balance:", error);
    }
  }, [activeStore]);

  const handleUserSession = React.useCallback(async (session: import('@supabase/supabase-js').Session | null) => {
    setIsLoading(true);
    if (session) {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userError || !userData) {
          throw new Error(`User document not found in Supabase for UID: ${session.user.id}`);
        }

        if (userData.status === 'inactive') {
          throw new Error('Your account is inactive. Please contact your administrator.');
        }

        setCurrentUser(userData as User);

        if (userData.role === 'superadmin') {
          setActiveStore(null);
          setPradanaTokenBalance(0);
          setIsLoading(false);
          return; 
        }

        const storeId = userData.storeId;

        if (storeId) {
          const { data: storeData, error: storeError } = await supabase
            .from('stores')
            .select('*')
            .eq('id', storeId)
            .single();

          if (storeError || !storeData) {
            throw new Error(`Store with ID '${storeId}' from user data not found.`);
          }

          setActiveStore(storeData as Store);
          setPradanaTokenBalance(storeData.pradanaTokenBalance || 0);
        } else {
          const role = userData.role || 'N/A';
          throw new Error(`storeId is missing for user UID: ${session.user.id} with role: '${role}'.`);
        }
      } catch (error: any) {
        console.error("Error handling user session:", error);
        toast({ variant: 'destructive', title: 'Session Error', description: error.message });
        await supabase.auth.signOut();
        setCurrentUser(null);
        setActiveStore(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      setCurrentUser(null);
      setActiveStore(null);
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUserSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [handleUserSession]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
    toast({
      title: 'Login Successful!',
      description: `Welcome back.`,
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
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
