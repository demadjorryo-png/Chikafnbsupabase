
'use client'

import * as React from 'react'
import type { User, Store } from '@/lib/types'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

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
  const [currentUser, setCurrentUser] = React.useState<User | null>(null)
  const [activeStore, setActiveStore] = React.useState<Store | null>(null)
  const [pradanaTokenBalance, setPradanaTokenBalance] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const { toast } = useToast()
  const router = useRouter()

  const refreshPradanaTokenBalance = React.useCallback(async () => {
    if (!activeStore) return
    const { data, error } = await supabase
      .from('stores')
      .select('pradana_token_balance')
      .eq('id', activeStore.id)
      .single()
    if (!error && data) {
      setPradanaTokenBalance(data.pradana_token_balance ?? 0)
    }
  }, [activeStore])

  const handleLogout = React.useCallback(async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setActiveStore(null)
    setPradanaTokenBalance(0)
  }, [])

  const handleUserSession = React.useCallback(async () => {
    setIsLoading(true)
    const { data: session } = await supabase.auth.getSession()
    const sessionUser = session?.session?.user
    if (sessionUser) {
      try {
        const { data: profile, error: pErr } = await supabase
          .from('profiles')
          .select('id, email, name, role, whatsapp, status, store_id')
          .eq('id', sessionUser.id)
          .single()

        if (pErr || !profile) {
          throw new Error(`Profil tidak ditemukan untuk UID: ${sessionUser.id}`)
        }

        if ((profile.status ?? 'active') === 'inactive') {
          throw new Error('Akun Anda tidak aktif. Silakan hubungi administrator.')
        }

        const userData: User = {
          id: profile.id,
          name: profile.name ?? (profile.email ?? 'User'),
          role: (profile.role ?? 'cashier') as any,
          email: profile.email ?? undefined,
          whatsapp: profile.whatsapp ?? undefined,
          status: (profile.status ?? 'active') as any,
          storeId: profile.store_id ?? undefined,
        }
        setCurrentUser(userData)

        let storeIdToLoad: string | undefined
        if (userData.role === 'cashier' && userData.storeId) {
          storeIdToLoad = userData.storeId
        } else if (userData.role === 'admin') {
          const { data: stores } = await supabase
            .from('stores')
            .select('id, admin_uids')
            .contains('admin_uids', [userData.id])
            .limit(1)
          if (stores && stores.length > 0) {
            storeIdToLoad = stores[0].id
          } else {
            throw new Error('Admin tidak terasosiasi dengan toko manapun.')
          }
        }

        if (!storeIdToLoad) {
          await handleLogout()
          router.push('/login')
          toast({ variant: 'destructive', title: 'Error Sesi', description: 'Tidak ada toko yang terasosiasi dengan akun Anda.' })
          setIsLoading(false)
          return
        }

        const { data: store, error: sErr } = await supabase
          .from('stores')
          .select('id, name, location, business_description, receipt_settings, point_earning_settings, notification_settings, pradana_token_balance, admin_uids, created_at, first_transaction_date, transaction_counter')
          .eq('id', storeIdToLoad)
          .single()

        if (sErr || !store) {
          throw new Error(`Toko dengan ID '${storeIdToLoad}' tidak ditemukan.`)
        }

        const storeData: Store = {
          id: store.id,
          name: store.name,
          location: store.location,
          businessDescription: store.business_description ?? undefined,
          receiptSettings: store.receipt_settings ?? undefined,
          pointEarningSettings: store.point_earning_settings ?? undefined,
          notificationSettings: store.notification_settings ?? undefined,
          pradanaTokenBalance: store.pradana_token_balance ?? 0,
          adminUids: store.admin_uids ?? [],
          createdAt: new Date(store.created_at).toISOString(),
          firstTransactionDate: store.first_transaction_date ? new Date(store.first_transaction_date).toISOString() : null,
          transactionCounter: store.transaction_counter ?? 0,
        }

        setActiveStore(storeData)
        setPradanaTokenBalance(storeData.pradanaTokenBalance)
      } catch (error) {
        console.error('Error handling user session:', error)
        toast({ variant: 'destructive', title: 'Error Sesi', description: (error as Error).message })
        await handleLogout()
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    } else {
      await handleLogout()
      setIsLoading(false)
    }
  }, [toast, router, handleLogout])

  React.useEffect(() => {
    handleUserSession()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      handleUserSession()
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [handleUserSession])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const errorMessage = error.message || 'Terjadi kesalahan. Silakan coba lagi.'
      toast({ variant: 'destructive', title: 'Login Gagal', description: errorMessage })
      throw error
    }
  }

  const logout = async () => {
    await handleLogout()
    router.push('/login')
    toast({ title: 'Logout Berhasil', description: 'Anda telah keluar.' })
  }

  const value = { currentUser, activeStore, pradanaTokenBalance, isLoading, login, logout, refreshPradanaTokenBalance }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
