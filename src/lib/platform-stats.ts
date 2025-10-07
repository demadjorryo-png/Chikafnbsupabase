
import { supabase } from './supabaseClient';

export type PlatformStats = {
  totalRevenue: number;
  totalTransactions: number;
  monthlyGrowthData: { month: string; revenue: number }[];
  topStores: { storeName: string; totalRevenue: number }[];
  updatedAt: string; // ISO 8601 string
};

const defaultStats: PlatformStats = {
    totalRevenue: 0,
    totalTransactions: 0,
    monthlyGrowthData: Array(6).fill({ month: 'N/A', revenue: 0 }),
    topStores: [],
    updatedAt: new Date(0).toISOString()
};

/**
 * Fetches aggregated platform statistics from Firestore.
 * This data is expected to be generated and updated by a Cloud Function.
 * 
 * @returns {Promise<PlatformStats>} The aggregated platform statistics.
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('data')
      .eq('id', 'platformStats')
      .single()
    if (error || !data) return defaultStats
    return { ...defaultStats, ...(data.data as any) }
  } catch (error) {
    console.error('Error fetching platform stats:', error)
    return defaultStats
  }
}
