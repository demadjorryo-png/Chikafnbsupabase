import { supabase } from './supabaseClient';
import type { ReceiptSettings } from './types';

// Default settings if a store doesn't have any defined.
export const defaultReceiptSettings: ReceiptSettings = {
    headerText: "Toko Chika\nJl. Jenderal Sudirman No. 1, Jakarta\nTelp: 0812-3456-7890",
    footerText: "Terima kasih telah berbelanja!",
    promoText: "Kumpulkan poin dan dapatkan hadiah menarik!",
    voiceGender: "female", // Default female voice
    notificationStyle: "fakta", // Default to fun facts
};

/**
 * Fetches receipt settings for a specific store from Firestore.
 * @param storeId The ID of the store.
 * @returns The store's specific receipt settings, or default settings if not found.
 */
export async function getReceiptSettings(storeId: string): Promise<ReceiptSettings> {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('receipt_settings')
      .eq('id', storeId)
      .single()
    if (!error && data) {
      return { ...defaultReceiptSettings, ...(data.receipt_settings || {}) }
    }
    return defaultReceiptSettings
  } catch (error) {
    console.error('Error fetching receipt settings:', error)
    return defaultReceiptSettings
  }
}

/**
 * Updates or creates receipt settings for a specific store in Firestore.
 * This function now reads the existing settings first to merge them safely.
 * @param storeId The ID of the store to update.
 * @param newSettings An object containing the settings to update.
 */
export async function updateReceiptSettings(storeId: string, newSettings: Partial<ReceiptSettings>) {
  const currentSettings = await getReceiptSettings(storeId)
  const updatedSettings = { ...currentSettings, ...newSettings }
  const { error } = await supabase
    .from('stores')
    .update({ receipt_settings: updatedSettings })
    .eq('id', storeId)
  if (error) throw error
}
