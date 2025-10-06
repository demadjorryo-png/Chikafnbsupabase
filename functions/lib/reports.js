"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDailySalesSummary = exports.sendWhatsapp = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const https_1 = require("firebase-functions/v2/https");
const firebase_admin_1 = require("./firebase-admin");
const whatsapp_settings_1 = require("./whatsapp-settings");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
// This is a callable function, NOT a flow. It runs in the Cloud Functions environment.
exports.sendWhatsapp = (0, https_1.onCall)(async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in to use this feature.');
    }
    // 2. Data Validation
    const { storeId, target, message, isGroup = false } = request.data;
    if (!storeId || !target || !message) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required parameters: storeId, target, or message.');
    }
    try {
        // 3. Securely fetch settings on the server
        const { deviceId } = await (0, whatsapp_settings_1.getWhatsappSettings)(storeId);
        if (!deviceId) {
            throw new https_1.HttpsError('failed-precondition', 'WhatsApp Device ID is not configured for this store.');
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
            throw new https_1.HttpsError('internal', responseJson.reason || 'An error occurred with the WhatsApp service.');
        }
        if (!response.ok) {
            logger.error('WhaCenter API HTTP Error:', { status: response.status, body: responseJson });
            throw new https_1.HttpsError('internal', `WhaCenter API responded with status ${response.status}`);
        }
        logger.info(`WhatsApp message sent to ${target} for store ${storeId}`);
        return { success: true, message: 'Notification sent successfully.' };
    }
    catch (error) {
        logger.error('Failed to send WhatsApp notification via Cloud Function:', error);
        if (error instanceof https_1.HttpsError) {
            throw error; // Re-throw HttpsError
        }
        // Throw a generic error for other cases
        throw new https_1.HttpsError('internal', 'An unknown error occurred while sending the notification.');
    }
});
// Menjadwalkan fungsi untuk berjalan setiap hari jam 9 malam (21:00)
// Zona waktu default adalah "America/Los_Angeles", kita perlu set ke "Asia/Jakarta"
exports.sendDailySalesSummary = (0, scheduler_1.onSchedule)({
    schedule: "0 21 * * *",
    timeZone: "Asia/Jakarta",
}, async (event) => {
    logger.info("Memulai pengiriman ringkasan penjualan harian...");
    try {
        const storesSnapshot = await firebase_admin_1.adminDb.collection('stores').get();
        if (storesSnapshot.empty) {
            logger.info("Tidak ada toko yang terdaftar. Proses dihentikan.");
            return;
        }
        const promises = storesSnapshot.docs.map(async (storeDoc) => {
            var _a;
            const store = storeDoc.data();
            const storeId = storeDoc.id;
            // Periksa apakah notifikasi untuk toko ini diaktifkan
            if (((_a = store.notificationSettings) === null || _a === void 0 ? void 0 : _a.dailySummaryEnabled) === false) {
                logger.info(`Pengiriman ringkasan harian dinonaktifkan untuk toko: ${store.name}`);
                return;
            }
            // 1. Hitung data penjualan hari ini
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            const transactionsSnapshot = await firebase_admin_1.adminDb.collection('stores').doc(storeId).collection('transactions')
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
            const adminDocs = await Promise.all(store.adminUids.map((uid) => firebase_admin_1.adminDb.collection('users').doc(uid).get()));
            // 3. Buat dan kirim pesan ke setiap admin
            const formattedDate = (0, date_fns_1.format)(today, "EEEE, d MMMM yyyy", { locale: locale_1.id });
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
                            const { deviceId } = await (0, whatsapp_settings_1.getWhatsappSettings)(storeId);
                            if (!deviceId)
                                continue; // Skip if no device ID for this store
                            const formData = new FormData();
                            formData.append('device_id', deviceId);
                            formData.append('number', formattedPhone);
                            formData.append('message', message);
                            await fetch('https://app.whacenter.com/api/send', {
                                method: 'POST',
                                body: formData,
                            });
                            logger.info(`Laporan harian berhasil dikirim ke ${adminData.name} (${store.name})`);
                        }
                        catch (waError) {
                            logger.error(`Gagal mengirim WA ke ${adminData.name} (${store.name}):`, waError);
                        }
                    }
                }
            }
        });
        await Promise.all(promises);
        logger.info("Pengiriman ringkasan penjualan harian selesai.");
    }
    catch (error) {
        logger.error("Error dalam fungsi terjadwal sendDailySalesSummary:", error);
    }
});
//# sourceMappingURL=reports.js.map