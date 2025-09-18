
'use client';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type LoginPromoSettings = {
    title: string;
    line1: string;
    line2: string;
    line3: string;
    footnote: string;
};

// Default settings if the document doesn't exist in Firestore.
export const defaultLoginPromoSettings: LoginPromoSettings = {
    title: "PROMO SPESIAL!",
    line1: "Dapatkan aplikasi kasir canggih seperti ini hanya Rp 500/transaksi, tanpa biaya langganan bulanan.",
    line2: "Biaya setup awal diskon 90%, hanya Rp 150.000 (dari Rp 1.500.000).",
    line3: "",
    footnote: "Penawaran terbatas!"
};

/**
 * Fetches login promo settings from Firestore.
 * @returns The login promo settings, or default settings if not found.
 */
export async function getLoginPromoSettings(): Promise<LoginPromoSettings> {
    try {
        const settingsDocRef = doc(db, 'appSettings', 'loginPromo');
        const docSnap = await getDoc(settingsDocRef);

        if (docSnap.exists()) {
            // Merge with defaults to ensure all properties are present
            return { ...defaultLoginPromoSettings, ...docSnap.data() };
        } else {
            console.warn("Login promo settings not found, creating document with default values.");
            // If the document doesn't exist, create it with default values
            await setDoc(settingsDocRef, defaultLoginPromoSettings);
            return defaultLoginPromoSettings;
        }
    } catch (error) {
        console.error("Error fetching login promo settings:", error);
        // Return defaults in case of any error
        return defaultLoginPromoSettings;
    }
}
