

import { doc, getDoc, setDoc } from 'firebase/firestore';
// Import adminDb when on server, db when on client
import { adminDb } from './firebase-admin';
import { db } from './firebase';

export type WhatsappSettings = {
    deviceId: string;
    adminGroup: string; // The group name or ID for admin notifications
};

// Default settings if the document doesn't exist in Firestore.
export const defaultWhatsappSettings: WhatsappSettings = {
    deviceId: 'fa254b2588ad7626d647da23be4d6a08',
    adminGroup: 'SPV ERA MMBP',
};

/**
 * Fetches WhatsApp settings from Firestore.
 * This function can run on both client and server, but prefers adminDb if available.
 * @param storeId The ID of the store.
 * @returns The WhatsApp settings, or default settings if not found.
 */
export async function getWhatsappSettings(storeId: string): Promise<WhatsappSettings> {
    const firestore = typeof window === 'undefined' ? adminDb : db;
    const settingsDocRef = doc(firestore, 'appSettings', 'whatsappConfig');
    try {
        const docSnap = await getDoc(settingsDocRef);

        if (docSnap.exists()) {
            // Merge with defaults to ensure all properties are present
            return { ...defaultWhatsappSettings, ...docSnap.data() };
        } else {
            console.warn(`WhatsApp settings not found, creating document with default values.`);
            // If the document doesn't exist, create it with default values
            await setDoc(settingsDocRef, defaultWhatsappSettings);
            return defaultWhatsappSettings;
        }
    } catch (error) {
        console.error("Error fetching WhatsApp settings:", error);
        // Return defaults in case of any error
        return defaultWhatsappSettings;
    }
}

/**
 * Updates or creates WhatsApp settings in Firestore.
 * @param newSettings An object containing the settings to update.
 */
export async function updateWhatsappSettings(newSettings: Partial<WhatsappSettings>) {
    const settingsDocRef = doc(db, 'appSettings', 'whatsappConfig');
    try {
        await setDoc(settingsDocRef, newSettings, { merge: true });
        console.log(`WhatsApp settings updated.`);
    } catch (error) {
        console.error(`Error updating WhatsApp settings:`, error);
        throw error; // Re-throw the error to be handled by the caller
    }
}
