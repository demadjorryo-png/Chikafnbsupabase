'use client'

import * as React from 'react'
import type { User as AppUser, Store } from '@/lib/types'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

type Ctx = {
  currentUser: AppUser | null
  activeStore: Store | null
  pradanaTokenBalance: number
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshPradanaTokenBalance: () => Promise<void>
}

const SupabaseAuthContext = React.createContext<Ctx | undefined>(undefined)

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = React.useState<AppUser | null>(null)
  const [activeStore, setActiveStore] = React.useState<Store | null>(null)
  const [pradanaTokenBalance, setPradanaTokenBalance] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  const router = useRouter()

  const refreshPradanaTokenBalance = React.useCallback(async () => {
    if (!activeStore) return
    const { data } = await supabase.from('stores').select('pradana_token_balance').eq('id', activeStore.id).single()
    if (data) setPradanaTokenBalance(data.pradana_token_balance ?? 0)
  }, [activeStore])

  const handleLogout = React.useCallback(async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setActiveStore(null)
    setPradanaTokenBalance(0)
  }, [])

  const handleSession = React.useCallback(async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      await handleLogout()
      setIsLoading(false)
      return
    }

    // Load profile
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, email, name, role, whatsapp, status, store_id')
      .eq('id', user.id)
      .single()

    if (pErr || !profile) {
      await handleLogout()
      setIsLoading(false)
      return
    }

    if (profile.status === 'inactive') {
      await handleLogout()
      router.push('/login')
      setIsLoading(false)
      return
    }

    const appUser: AppUser = {
      id: profile.id,
      name: profile.name ?? (profile.email ?? 'User'),
      role: (profile.role ?? 'cashier') as any,
      email: profile.email ?? undefined,
      whatsapp: profile.whatsapp ?? undefined,
      status: (profile.status ?? 'active') as any,
      storeId: profile.store_id ?? undefined,
    }

    setCurrentUser(appUser)

    // Determine store
    let storeIdToLoad: string | undefined = undefined
    if (appUser.role === 'cashier' && appUser.storeId) {
      storeIdToLoad = appUser.storeId
    } else if (appUser.role === 'admin') {
      const { data: stores } = await supabase
        .from('stores')
        .select('id')
        .contains('admin_uids', [appUser.id])
        .limit(1)
      if (stores && stores.length > 0) {
        storeIdToLoad = stores[0].id
      }
    }

    if (!storeIdToLoad) {
      await handleLogout()
      router.push('/login')
      setIsLoading(false)
      return
    }

    const { data: store } = await supabase
      .from('stores')
      .select('id, name, location, business_description, receipt_settings, point_earning_settings, notification_settings, pradana_token_balance, admin_uids, created_at, first_transaction_date, transaction_counter')
      .eq('id', storeIdToLoad)
      .single()

    if (!store) {
      await handleLogout()
      router.push('/login')
      setIsLoading(false)
      return
    }

    const s: Store = {
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

    setActiveStore(s)
    setPradanaTokenBalance(s.pradanaTokenBalance)
    setIsLoading(false)
  }, [router, handleLogout])

  React.useEffect(() => {
    // initial fetch
    handleSession()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      handleSession()
    })
    return () => { sub.subscription.unsubscribe() }
  }, [handleSession])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const logout = async () => {
    await handleLogout()
    router.push('/login')
  }

  const value: Ctx = { currentUser, activeStore, pradanaTokenBalance, isLoading, login, logout, refreshPradanaTokenBalance }
  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>
}

export function useSupabaseAuth() {
  const ctx = React.useContext(SupabaseAuthContext)
  if (!ctx) throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider')
  return ctx
}

