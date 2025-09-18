

'use client';

import { doc, getDoc, updateDoc, setDoc, increment, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export type TransactionFeeSettings = {
  tokenValueRp: number;
  feePercentage: number;
  minFeeRp: number;
  maxFeeRp: number; // Batas maksimal biaya transaksi dalam Rupiah
  aiUsageFee: number;
};

// Default settings in case the document doesn't exist in Firestore
export const defaultFeeSettings: TransactionFeeSettings = {
  tokenValueRp: 1000,    // 1 token = Rp 1000
  feePercentage: 0.005,  // Biaya 0.5% per transaksi
  minFeeRp: 50,         // Biaya minimum Rp 50
  maxFeeRp: 250,        // Biaya maksimum Rp 250
  aiUsageFee: 1,       // Biaya 1 token per penggunaan AI
};

export async function getTransactionFeeSettings(): Promise<TransactionFeeSettings> {
  try {
    const settingsDocRef = doc(db, 'appSettings', 'transactionFees');
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
      // Merge with defaults to ensure all properties are present
      return { ...defaultFeeSettings, ...docSnap.data() };
    } else {
      console.warn("Transaction fee settings not found, creating document with default values.");
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

export async function deductAiUsageFee(currentBalance: number, feeSettings: TransactionFeeSettings, storeId: string, toast: Function) {
  const fee = feeSettings.aiUsageFee;
  if (currentBalance < fee) {
    toast({
      variant: 'destructive',
      title: 'Saldo Token Tidak Cukup',
      description: `Saldo Pradana Token toko (${currentBalance.toFixed(2)}) tidak cukup untuk membayar biaya AI (${fee}). Silakan top up.`,
    });
    throw new Error('Insufficient token balance');
  }
  
  const tokenDocRef = doc(db, 'stores', storeId);
  await updateDoc(tokenDocRef, {
    pradanaTokenBalance: increment(-fee)
  });
}
