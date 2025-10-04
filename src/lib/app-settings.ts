
'use client';

import { doc, getDoc, updateDoc, setDoc, increment, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { TransactionFeeSettings } from './types';
import appConfig from '../app.config.json';


// Default settings in case the document doesn't exist in Firestore
export const defaultFeeSettings: TransactionFeeSettings = {
  tokenValueRp: 1000,    // 1 token = Rp 1000
  feePercentage: 0.005,  // Biaya 0.5% per transaksi
  minFeeRp: 50,         // Biaya minimum Rp 50
  maxFeeRp: 250,        // Biaya maksimum Rp 250
  aiUsageFee: 1,       // Biaya 1 token per penggunaan AI tunggal
  newStoreBonusTokens: 50, // Bonus 50 token untuk toko baru
  aiBusinessPlanFee: 25, // Biaya 25 token untuk AI Business Plan
  aiSessionFee: 5,        // Biaya 5 token untuk sesi chat AI
  aiSessionDurationMinutes: 30, // Durasi sesi chat 30 menit
};

export async function getTransactionFeeSettings(): Promise<TransactionFeeSettings> {
  const appId = appConfig.appId || 'default';
  const settingsDocRef = doc(db, 'appSettings', appId, 'configs', 'transactionFees');
  try {
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
      // Merge with defaults to ensure all properties are present
      return { ...defaultFeeSettings, ...docSnap.data() };
    } else {
      console.warn(`Transaction fee settings for appId '${appId}' not found, creating document with default values.`);
      // If the document doesn't exist, create it with default values
      await setDoc(settingsDocRef, defaultFeeSettings);
      return defaultFeeSettings;
    }
  } catch (error) {
    console.error("Error fetching transaction fee settings:", error);
    return defaultFeeSettings;
  }
}

export async function getPradanaTokenBalance(storeId: string): Promise<number> {
    try {
        const storeDocRef = doc(db, 'stores', storeId);
        const docSnap = await getDoc(storeDocRef);

        if (docSnap.exists()) {
            return docSnap.data().pradanaTokenBalance || 0;
        } else {
            console.warn(`Store with ID ${storeId} not found.`);
            return 0;
        }
    } catch (error) {
        console.error("Error fetching Pradana Token balance:", error);
        return 0;
    }
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
export async function deductAiUsageFee(currentBalance: number, feeToDeduct: number, storeId: string, toast: Function, featureName?: string) {
  if (currentBalance < feeToDeduct) {
    toast({
      variant: 'destructive',
      title: 'Saldo Token Tidak Cukup',
      description: `Saldo Pradana Token toko (${currentBalance.toFixed(2)}) tidak cukup untuk membayar biaya fitur ini (${feeToDeduct}). Silakan top up.`,
    });
    throw new Error('Insufficient token balance');
  }
  
  const tokenDocRef = doc(db, 'stores', storeId);
  await updateDoc(tokenDocRef, {
    pradanaTokenBalance: increment(-feeToDeduct)
  });
}
