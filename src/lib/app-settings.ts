'use client';

import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

export type TransactionFeeSettings = {
  tokenValueRp: number;
  feePercentage: number;
  minFeeRp: number;
};

// Default settings in case the document doesn't exist in Firestore
export const defaultFeeSettings: TransactionFeeSettings = {
  tokenValueRp: 1000,
  feePercentage: 0.005, // 0.5%
  minFeeRp: 500,
};

export async function getTransactionFeeSettings(): Promise<TransactionFeeSettings> {
  try {
    const settingsDocRef = doc(db, 'appSettings', 'transactionFees');
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
      // Merge with defaults to ensure all properties are present
      return { ...defaultFeeSettings, ...docSnap.data() };
    } else {
      console.warn("Transaction fee settings not found in Firestore, using default values.");
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
            console.warn("Pradana Token balance document not found, returning 0.");
            return 0;
        }
    } catch (error) {
        console.error("Error fetching Pradana Token balance:", error);
        return 0;
    }
}

export async function updatePradanaTokenBalance(amount: number) {
    const tokenDocRef = doc(db, 'appSettings', 'pradanaToken');
    try {
        // Use increment to handle concurrent updates safely.
        // `amount` should be negative for deductions.
        await updateDoc(tokenDocRef, {
            balance: increment(amount)
        });
    } catch (error: any) {
        // If the document doesn't exist, create it.
        if (error.code === 'not-found') {
            await setDoc(tokenDocRef, { balance: amount });
        } else {
            // Re-throw other errors
            throw error;
        }
    }
}
