

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { adminDb } from "./firebase-admin";
import { getWhatsappSettings } from "./whatsapp-settings";
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// This is a callable function, NOT a flow. It runs in the Cloud Functions environment.
export const sendWhatsapp = onCall(async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to use this feature.');
    }
    
    // 2. Data Validation
    const { storeId, target, message, isGroup = false } = request.data;
    if (!storeId || !target || !message) {
        throw new HttpsError('invalid-argument', 'Missing required parameters: storeId, target, or message.');
    }

    try {
        // 3. Securely fetch settings on the server
        const { deviceId } = await getWhatsappSettings(storeId);
        if (!deviceId) {
            throw new HttpsError('failed-precondition', 'WhatsApp Device ID is not configured for this store.');
        }
        
        // 4. Construct FormData for WhaCenter API
        const formData = new FormData();
        formData.append('device_id', deviceId);
        formData.append(isGroup ? 'group' : 'number', target);
        formData.append('message', message);

        const endpoint = isGroup ? 'sendGroup' : 'send';
        const webhookUrl = `https://app.whacenter.com/api/${endpoint}`;

        // 5. Call WhaCenter API
        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: formData,
        });

        const responseJson = await response.json();

        // 6. Handle WhaCenter API response
        if (responseJson.status === 'error') {
            logger.error('WhaCenter API Error:', responseJson.reason);
            throw new HttpsError('internal', responseJson.reason || 'An error occurred with the WhatsApp service.');
        }

        if (!response.ok) {
            logger.error('WhaCenter API HTTP Error:', { status: response.status, body: responseJson });
            throw new HttpsError('internal', `WhaCenter API responded with status ${response.status}`);
        }

        logger.info(`WhatsApp message sent to ${target} for store ${storeId}`);
        return { success: true, message: 'Notification sent successfully.' };

    } catch (error) {
        logger.error('Failed to send WhatsApp notification via Cloud Function:', error);
        if (error instanceof HttpsError) {
            throw error; // Re-throw HttpsError
        }
        // Throw a generic error for other cases
        throw new HttpsError('internal', 'An unknown error occurred while sending the notification.');
    }
});


// Menjadwalkan fungsi untuk berjalan setiap hari jam 9 malam (21:00)
// Zona waktu default adalah "America/Los_Angeles", kita perlu set ke "Asia/Jakarta"
export const sendDailySalesSummary = onSchedule({
    schedule: "0 21 * * *",
    timeZone: "Asia/Jakarta",
}, async (event) => {
    logger.info("Memulai pengiriman ringkasan penjualan harian...");

    try {
        const storesSnapshot = await adminDb.collection('stores').get();

        if (storesSnapshot.empty) {
            logger.info("Tidak ada toko yang terdaftar. Proses dihentikan.");
            return;
        }

        const promises = storesSnapshot.docs.map(async (storeDoc) => {
            const store = storeDoc.data();
            const storeId = storeDoc.id;

            // Periksa apakah notifikasi untuk toko ini diaktifkan
            if (store.notificationSettings?.dailySummaryEnabled === false) {
                logger.info(`Pengiriman ringkasan harian dinonaktifkan untuk toko: ${store.name}`);
                return;
            }
            
            // 1. Hitung data penjualan hari ini
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            
            const transactionsSnapshot = await adminDb.collection('stores').doc(storeId).collection('transactions')
                .where('createdAt', '>=', startOfDay.toISOString())
                .where('createdAt', '<=', endOfDay.toISOString())
                .get();

            let totalRevenue = 0;
            const totalTransactions = transactionsSnapshot.size;

            transactionsSnapshot.forEach(txDoc => {
                totalRevenue += txDoc.data().totalAmount || 0;
            });
            
            logger.info(`Toko: ${store.name}, Omset Hari Ini: Rp ${totalRevenue}, Transaksi: ${totalTransactions}`);

            // 2. Ambil data admin
            if (!store.adminUids || store.adminUids.length === 0) {
                logger.warn(`Toko ${store.name} tidak memiliki admin.`);
                return;
            }
            
            const adminDocs = await Promise.all(
                store.adminUids.map((uid: string) => adminDb.collection('users').doc(uid).get())
            );

            // 3. Buat dan kirim pesan ke setiap admin
            const formattedDate = format(today, "EEEE, d MMMM yyyy", { locale: id });
            
            for (const adminDoc of adminDocs) {
                if (adminDoc.exists) {
                    const adminData = adminDoc.data();
                    if (adminData && adminData.whatsapp) {
                        const message = `*Ringkasan Harian Chika POS F&B*
*${store.name}* - ${formattedDate}

Halo *${adminData.name}*, berikut adalah ringkasan penjualan Anda hari ini:
- *Total Omset*: Rp ${totalRevenue.toLocaleString('id-ID')}
- *Jumlah Transaksi*: ${totalTransactions}

Terus pantau dan optimalkan performa penjualan Anda melalui dasbor Chika. Semangat selalu! 💪

_Apabila tidak berkenan, fitur ini dapat dinonaktifkan di menu Pengaturan._`;
                        
                        try {
                            const formattedPhone = adminData.whatsapp.startsWith('0') 
                                ? `62${adminData.whatsapp.substring(1)}` 
                                : adminData.whatsapp;
                            
                            // Here we can't call the 'sendWhatsapp' callable function directly.
                            // We need to re-implement the fetch logic or refactor it into a helper.
                            // For simplicity, let's re-implement the core logic here.
                            const { deviceId } = await getWhatsappSettings(storeId);
                            if (!deviceId) continue; // Skip if no device ID for this store

                            const formData = new FormData();
                            formData.append('device_id', deviceId);
                            formData.append('number', formattedPhone);
                            formData.append('message', message);

                            await fetch('https://app.whacenter.com/api/send', {
                                method: 'POST',
                                body: formData,
                            });

                            logger.info(`Laporan harian berhasil dikirim ke ${adminData.name} (${store.name})`);
                        } catch (waError) {
                            logger.error(`Gagal mengirim WA ke ${adminData.name} (${store.name}):`, waError);
                        }
                    }
                }
            }
        });

        await Promise.all(promises);
        logger.info("Pengiriman ringkasan penjualan harian selesai.");

    } catch (error) {
        logger.error("Error dalam fungsi terjadwal sendDailySalesSummary:", error);
    }
});
