"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultWhatsappSettings = void 0;
exports.getWhatsappSettings = getWhatsappSettings;
const firebase_admin_1 = require("./firebase-admin");
// Default settings if the document doesn't exist in Firestore.
exports.defaultWhatsappSettings = {
    deviceId: 'fa254b2588ad7626d647da23be4d6a08',
    adminGroup: 'SPV ERA MMBP',
};
/**
 * Fetches WhatsApp settings from Firestore using the Admin SDK.
 * This function is intended for server-side use only (e.g., in Cloud Functions).
 * @param storeId The ID of the store (can be "platform" for global settings).
 * @returns The WhatsApp settings, or default settings if not found.
 */
async function getWhatsappSettings(storeId) {
    const settingsDocRef = firebase_admin_1.adminDb.collection('appSettings').doc('whatsappConfig');
    try {
        const docSnap = await settingsDocRef.get();
        if (docSnap.exists) {
            // Merge with defaults to ensure all properties are present
            return Object.assign(Object.assign({}, exports.defaultWhatsappSettings), docSnap.data());
        }
        else {
            console.warn(`WhatsApp settings not found, creating document with default values.`);
            // If the document doesn't exist, create it with default values
            await settingsDocRef.set(exports.defaultWhatsappSettings);
            return exports.defaultWhatsappSettings;
        }
    }
    catch (error) {
        console.error("Error fetching WhatsApp settings:", error);
        // Return defaults in case of any error
        return exports.defaultWhatsappSettings;
    }
}
/**
 * // Temporarily disabled: This function is intended for client-side updates
 * // and uses client-side Firebase SDK. It should not be part of Cloud Functions.
 * // If needed, refactor to use Firebase Admin SDK or a separate API endpoint.
 * export async function updateWhatsappSettings(newSettings: Partial<WhatsappSettings>) {
 *     // We are using adminDb for server-side operations, which does not have `db`.
 *     // This function would typically interact with the client-side Firebase `db`.
 *     // If this function is truly needed within a Cloud Function context, it needs
 *     // to be rewritten to use the Firebase Admin SDK.
 *     console.error("updateWhatsappSettings is not implemented for Cloud Functions.");
 *     throw new Error("updateWhatsappSettings is not available in this environment.");
 * }
*/
//# sourceMappingURL=whatsapp-settings.js.map