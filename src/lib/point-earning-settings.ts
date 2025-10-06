'use client';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type PointEarningSettings = {
    rpPerPoint: number;
};

// Default settings if the document doesn't exist in Firestore.
export const defaultPointEarningSettings: PointEarningSettings = {
    rpPerPoint: 10000, // Default: 1 point for every Rp 10.000 spent
};

/**
 * Fetches point earning settings from Firestore.
 * @returns The point earning settings, or default settings if not found.
 */
export async function getPointEarningSettings(): Promise<PointEarningSettings> {
    const settingsDocRef = doc(db, 'appSettings', 'pointRules');
    try {
        const docSnap = await getDoc(settingsDocRef);

        if (docSnap.exists()) {
            return { ...defaultPointEarningSettings, ...docSnap.data() };
        } else {
            console.warn(`Point earning settings not found, creating document with default values.`);
            await setDoc(settingsDocRef, defaultPointEarningSettings);
            return defaultPointEarningSettings;
        }
    } catch (error) {
        console.error("Error fetching point earning settings:", error);
        return defaultPointEarningSettings;
    }
}

/**
 * Updates or creates point earning settings in Firestore.
 * @param newSettings An object containing the settings to update.
 */
export async function updatePointEarningSettings(newSettings: Partial<PointEarningSettings>) {
    const settingsDocRef = doc(db, 'appSettings', 'pointRules');
    try {
        await setDoc(settingsDocRef, newSettings, { merge: true });
        console.log(`Point earning settings updated.`);
    } catch (error) {
        console.error(`Error updating point earning settings:`, error);
        throw error; // Re-throw the error to be handled by the caller
    }
}
