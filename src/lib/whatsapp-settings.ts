
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import appConfig from '../app.config.json';

export type WhatsappSettings = {
    deviceId: string;
    adminGroup: string; // The group name or ID for admin notifications
};

// Default settings if the document doesn't exist in Firestore.
// These are the last known hardcoded values.
export const defaultWhatsappSettings: WhatsappSettings = {
    deviceId: 'fa254b2588ad7626d647da23be4d6a08',
    adminGroup: 'SPV ERA MMBP',
};

/**
 * Fetches WhatsApp settings from Firestore.
 * @returns The WhatsApp settings, or default settings if not found.
 */
export async function getWhatsappSettings(): Promise<WhatsappSettings> {
    const appId = appConfig.appId || 'default';
    const settingsDocRef = doc(db, 'appSettings', appId, 'configs', 'whatsappConfig');
    try {
        const docSnap = await getDoc(settingsDocRef);

        if (docSnap.exists()) {
            // Merge with defaults to ensure all properties are present
            return { ...defaultWhatsappSettings, ...docSnap.data() };
        } else {
            console.warn(`WhatsApp settings for appId '${appId}' not found, creating document with default values.`);
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
    const appId = appConfig.appId || 'default';
    const settingsDocRef = doc(db, 'appSettings', appId, 'configs', 'whatsappConfig');
    try {
        await setDoc(settingsDocRef, newSettings, { merge: true });
        console.log(`WhatsApp settings updated for ${appId}.`);
    } catch (error) {
        console.error(`Error updating WhatsApp settings:`, error);
        throw error; // Re-throw the error to be handled by the caller
    }
}
