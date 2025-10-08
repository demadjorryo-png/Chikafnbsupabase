'use server';

import { supabaseAdmin } from './supabaseAdmin';

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
 * Fetches WhatsApp settings from Supabase using the Admin SDK.
 * This function is intended for server-side use only.
 * @param storeId The ID of the store (can be "platform" for global settings).
 * @returns The WhatsApp settings, or default settings if not found.
 */
export async function getWhatsappSettings(storeId: string): Promise<WhatsappSettings> {
    try {
        const { data, error } = await supabaseAdmin
            .from('app_settings')
            .select('data')
            .eq('id', 'whatsappConfig')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
            console.error("Error fetching WhatsApp settings:", error.message);
            return defaultWhatsappSettings;
        }

        if (data) {
            // Merge with defaults to ensure all properties are present
            return { ...defaultWhatsappSettings, ...data.data as WhatsappSettings };
        } else {
            console.warn(`WhatsApp settings not found, creating document with default values.`);
            // If the document doesn't exist, create it with default values
            const { error: insertError } = await supabaseAdmin
                .from('app_settings')
                .upsert({ id: 'whatsappConfig', data: defaultWhatsappSettings });
            
            if (insertError) {
                console.error("Error creating default WhatsApp settings:", insertError.message);
            }
            return defaultWhatsappSettings;
        }
    } catch (error) {
        console.error("Error fetching or setting WhatsApp settings:", error);
        // Return defaults in case of any error
        return defaultWhatsappSettings;
    }
}
