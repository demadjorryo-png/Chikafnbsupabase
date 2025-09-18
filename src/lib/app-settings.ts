

'use client';

import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
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
  tokenValueRp: 1000,    // 1 token = Rp 1.000
  feePercentage: 0.005,  // Biaya 0.5% per transaksi
  minFeeRp: 500,         // Biaya minimum Rp 500
  maxFeeRp: 2500,        // Biaya maksimum Rp 2.500
  aiUsageFee: 0.1,       // Biaya 0.1 token per penggunaan AI
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

export async function getPradanaTokenBalance(): Promise<number> {
    try {
        const tokenDocRef = doc(db, 'appSettings', 'pradanaToken');
        const docSnap = await getDoc(tokenDocRef);

        if (docSnap.exists()) {
            return docSnap.data().balance || 0;
        } else {
            // If doc doesn't exist, create it with initial balance 0
            await setDoc(tokenDocRef, { balance: 0 });
            console.warn("Pradana Token balance document not found, created a new one with 0 balance.");
            return 0;
        }
    } catch (error) {
        console.error("Error fetching Pradana Token balance:", error);
        return 0;
    }
}

export async function deductAiUsageFee(currentBalance: number, feeSettings: TransactionFeeSettings, toast: Function) {
  const fee = feeSettings.aiUsageFee;
  if (currentBalance < fee) {
    toast({
      variant: 'destructive',
      title: 'Saldo Token Tidak Cukup',
      description: `Saldo Pradana Token Anda (${currentBalance.toFixed(2)}) tidak cukup untuk membayar biaya AI (${fee}). Silakan top up.`,
    });
    throw new Error('Insufficient token balance');
  }
  
  const tokenDocRef = doc(db, 'appSettings', 'pradanaToken');
  await updateDoc(tokenDocRef, {
    balance: increment(-fee)
  });
}
