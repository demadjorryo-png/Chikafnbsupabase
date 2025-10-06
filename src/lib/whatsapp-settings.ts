
import { doc, getDoc, setDoc } from 'firebase/firestore';
// Import adminDb as this function is now exclusively server-side.
import { adminDb } from './firebase-admin';

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
 * Fetches WhatsApp settings from Firestore using the Admin SDK.
 * This function is intended for server-side use only (e.g., in Cloud Functions).
 * @param storeId The ID of the store (can be "platform" for global settings).
 * @returns The WhatsApp settings, or default settings if not found.
 */
export async function getWhatsappSettings(storeId: string): Promise<WhatsappSettings> {
    const firestore = adminDb; // Use adminDb exclusively
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
 * This is intended for use in client-side settings pages where 'db' is available.
 * @param newSettings An object containing the settings to update.
 */
export async function updateWhatsappSettings(newSettings: Partial<WhatsappSettings>) {
    // This function can remain as is if it's only called from a client component that has access to 'db'.
    // For this to be safe, we need to ensure it's not imported alongside getWhatsappSettings on the client.
    // A better approach would be a dedicated settings update function/API route.
    // Let's import db dynamically inside the function to be safe.
    const { db } = await import('./firebase');
    const settingsDocRef = doc(db, 'appSettings', 'whatsappConfig');
    try {
        await setDoc(settingsDocRef, newSettings, { merge: true });
        console.log(`WhatsApp settings updated.`);
    } catch (error) {
        console.error(`Error updating WhatsApp settings:`, error);
        throw error; // Re-throw the error to be handled by the caller
    }
}
