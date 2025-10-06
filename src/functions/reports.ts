
'use server';

import { onSchedule } from "firebase-functions/v2/scheduler";
import *s as logger from "firebase-functions/logger";
import { adminDb } from "@/lib/firebase-admin";
import { sendWhatsAppNotification } from "@/ai/flows/whatsapp-notification";
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

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
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));
            
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
                            
                            await sendWhatsAppNotification({
                                target: formattedPhone,
                                message: message,
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
