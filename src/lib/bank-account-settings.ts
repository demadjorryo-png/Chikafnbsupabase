
'use client'

import { supabase } from './supabaseClient'

export type BankAccountSettings = {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
};

// Default settings if the document doesn't exist in Firestore.
export const defaultBankAccountSettings: BankAccountSettings = {
    bankName: 'BANK BCA',
    accountNumber: '1234567890',
    accountHolder: 'PT. CHIKA TEKNOLOGI',
};

/**
 * Fetches Bank Account settings from Firestore.
 * @returns The bank account settings, or default settings if not found.
 */
export async function getBankAccountSettings(): Promise<BankAccountSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('data')
    .eq('id', 'bankAccount')
    .single()
  if (error || !data) return defaultBankAccountSettings
  return { ...defaultBankAccountSettings, ...(data.data as any) }
}
