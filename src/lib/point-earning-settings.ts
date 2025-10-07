'use client'

import { supabase } from './supabaseClient'

export type PointEarningSettings = {
    rpPerPoint: number;
};

// Default settings if a store doesn't have any defined.
export const defaultPointEarningSettings: PointEarningSettings = {
    rpPerPoint: 10000, // Default: 1 point for every Rp 10.000 spent
};

/**
 * Fetches point earning settings for a specific store from Firestore.
 * @param storeId The ID of the store.
 * @returns The store's specific point earning settings, or default settings if not found.
 */
export async function getPointEarningSettings(storeId: string): Promise<PointEarningSettings> {
  const { data, error } = await supabase
    .from('stores')
    .select('point_earning_settings')
    .eq('id', storeId)
    .single()
  if (error || !data) return defaultPointEarningSettings
  return { ...defaultPointEarningSettings, ...(data.point_earning_settings || {}) }
}

/**
 * Updates or creates point earning settings for a specific store in Firestore.
 * @param storeId The ID of the store to update.
 * @param newSettings An object containing the settings to update.
 */
export async function updatePointEarningSettings(storeId: string, newSettings: Partial<PointEarningSettings>) {
  const current = await getPointEarningSettings(storeId)
  const updated = { ...current, ...newSettings }
  const { error } = await supabase
    .from('stores')
    .update({ point_earning_settings: updated })
    .eq('id', storeId)
  if (error) throw error
}
