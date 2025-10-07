
'use client'

import type { TransactionFeeSettings } from './types'
import { supabase } from './supabaseClient'

// Default settings in case the document doesn't exist in Firestore
export const defaultFeeSettings: TransactionFeeSettings = {
  tokenValueRp: 1000,    // 1 token = Rp 1000
  feePercentage: 0.005,  // Biaya 0.5% per transaksi
  minFeeRp: 500,         // Biaya minimum Rp 500
  maxFeeRp: 2500,        // Biaya maksimum Rp 2500
  aiUsageFee: 1,       // Biaya 1 token per penggunaan AI tunggal
  newStoreBonusTokens: 50, // Bonus 50 token untuk toko baru
  aiBusinessPlanFee: 25, // Biaya 25 token untuk AI Business Plan
  aiSessionFee: 5,        // Biaya 5 token untuk sesi chat AI
  aiSessionDurationMinutes: 30, // Durasi sesi chat 30 menit
};

export async function getTransactionFeeSettings(): Promise<TransactionFeeSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('data')
    .eq('id', 'transactionFees')
    .single()
  if (error || !data) {
    return defaultFeeSettings
  }
  return { ...defaultFeeSettings, ...(data.data as any) }
}

export async function getPradanaTokenBalance(storeId: string): Promise<number> {
  const { data, error } = await supabase
    .from('stores')
    .select('pradana_token_balance')
    .eq('id', storeId)
    .single()
  if (error || !data) return 0
  return data.pradana_token_balance || 0
}

/**
 * Deducts a specified fee from the active store's token balance.
 * This function is used by all business-related AI features for any user role.
 * It throws an error if the balance is insufficient, which should be caught by the caller.
 * @param currentBalance The current token balance of the store.
 * @param feeToDeduct The number of tokens to deduct.
 * @param storeId The ID of the store to deduct from.
 * @param toast A function to display notifications to the user.
 * @param featureName A friendly name for the feature being used (optional).
 */
export async function deductAiUsageFee(
  currentBalance: number,
  feeOrSettings: number | TransactionFeeSettings,
  storeId: string,
  toast: (args: { variant: string; title: string; description: string }) => void,
  featureName?: string
) {
  const feeToDeduct = typeof feeOrSettings === 'number'
    ? feeOrSettings
    : (featureName === 'Memulai sesi Chika AI' ? feeOrSettings.aiSessionFee : feeOrSettings.aiUsageFee)

  if (currentBalance < feeToDeduct) {
    toast({
      variant: 'destructive',
      title: 'Saldo Token Tidak Cukup',
      description: `Saldo Pradana Token toko (${currentBalance.toFixed(2)}) tidak cukup untuk membayar biaya fitur ini (${feeToDeduct}). Silakan top up.`,
    })
    throw new Error('Insufficient token balance')
  }

  // Call secure API to deduct using service role
  const { data: session } = await supabase.auth.getSession()
  const accessToken = session?.session?.access_token
  await fetch('/api/store/deduct-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ storeId, amount: feeToDeduct, featureName }),
  })
}
