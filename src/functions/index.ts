// --- Impor untuk fungsi V1 (Midtrans) ---
import * as functions from "firebase-functions";

// --- Impor untuk fungsi V2 (createUser) - Direkomendasikan untuk fungsi baru ---
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// --- Impor Library Umum ---
import * as admin from "firebase-admin";
import * as midtransClient from "midtrans-client";

// Inisialisasi Firebase Admin SDK (hanya sekali)
admin.default.initializeApp();
const db = admin.default.firestore();

// =========================================================================================
// BAGIAN FUNGSI MIDTRANS (Tidak ada perubahan)
// =========================================================================================

// --- FUNGSI 1: MEMBUAT TRANSAKSI MIDTRANS SAAT ADA PERMINTAAN TOP UP ---
export const createMidtransTransaction = functions.firestore
  .document("topUpRequests/{requestId}")
  .onCreate(async (snap, context) => {
    try {
      const requestData = snap.data();
      const userId = requestData.userId;
      const amount = requestData.amount;
      const requestId = context.params.requestId;

      if (!userId || !amount) {
        logger.error("Error: userId atau amount tidak ditemukan di dokumen request.");
        return null;
      }
      
      const coreApi = new midtransClient.CoreApi({
        isProduction: false,
        serverKey: functions.config().midtrans.server_key,
        clientKey: functions.config().midtrans.client_key,
      });

      const parameter = {
        payment_type: "gopay",
        transaction_details: {
          order_id: requestId,
          gross_amount: amount,
        },
      };

      logger.info(`Membuat transaksi Midtrans untuk order_id: ${requestId}`);
      const transaction = await coreApi.charge(parameter);
      logger.info("Berhasil membuat transaksi, response:", transaction);

      return snap.ref.update({
        status: "PENDING_PAYMENT",
        midtransResponse: transaction,
      });

    } catch (error) {
      logger.error("Gagal membuat transaksi Midtrans:", error);
      return snap.ref.update({ status: "ERROR", errorMessage: error.message });
    }
  });


// --- FUNGSI 2: WEBHOOK HANDLER UNTUK MENERIMA NOTIFIKASI DARI MIDTRANS ---
export const midtransWebhookHandler = functions.https.onRequest(async (req, res) => {
  const coreApi = new midtransClient.CoreApi({
    isProduction: false,
    serverKey: functions.config().midtrans.server_key,
    clientKey: functions.config().midtrans.client_key,
  });

  logger.info("Menerima notifikasi webhook dari Midtrans:", req.body);

  try {
    const notificationJson = req.body;
    const statusResponse = await coreApi.transaction.notification(notificationJson);
    
    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    logger.info(`Notifikasi untuk order_id: ${orderId}, status: ${transactionStatus}, fraud: ${fraudStatus}`);

    if (transactionStatus == "capture" || transactionStatus == "settlement") {
      if (fraudStatus == "accept") {
        const topUpRef = db.collection("topUpRequests").doc(orderId);
        const topUpDoc = await topUpRef.get();

        if (!topUpDoc.exists) {
          logger.error(`Error: Dokumen topUpRequest dengan ID ${orderId} tidak ditemukan.`);
          res.status(404).send("Request not found");
          return;
        }

        const topUpData = topUpDoc.data();
        const userId = topUpData.userId;
        const amount = topUpData.amount;
        const tokenAmount = amount; 

        const userRef = db.collection("users").doc(userId);
        await userRef.update({
          tokens: admin.firestore.FieldValue.increment(tokenAmount),
        });

        logger.info(`Sukses! ${tokenAmount} token telah ditambahkan ke user ${userId}`);
        await topUpRef.update({ status: "SUCCESS" });
      }
    } else if (transactionStatus == "cancel" || transactionStatus == "deny" || transactionStatus == "expire") {
      await db.collection("topUpRequests").doc(orderId).update({ status: "FAILED" });
      logger.warn(`Transaksi ${orderId} gagal atau kedaluwarsa.`);
    }

    res.status(200).send("Notification processed successfully.");

  } catch (error) {
    logger.error("Gagal memproses notifikasi Midtrans:", error);
    res.status(500).send("Internal Server Error");
  }
});

// =========================================================================================
// BAGIAN FUNGSI PENDAFTARAN PENGGUNA BARU
// =========================================================================================

export const createUser = onCall(async (request) => {
    const { email, password, displayName, storeName, whatsapp } = request.data;

    // Pastikan data yang dibutuhkan ada
    if (!email || !password || !displayName || !storeName) {
        throw new HttpsError('invalid-argument', 'Please provide all required fields.');
    }

    try {
        // 1. Buat pengguna di Firebase Auth
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: displayName,
        });

        // 2. Buat dokumen toko di Firestore
        const storeRef = db.collection('stores').doc(); // Auto-generate ID
        await storeRef.set({
            name: storeName,
            location: 'Indonesia',
            pradanaTokenBalance: 50.00, // Saldo token awal
            adminUids: [userRecord.uid],
            createdAt: new Date().toISOString(),
        });

        // 3. Buat dokumen pengguna di Firestore
        const userRef = db.collection('users').doc(userRecord.uid);
        await userRef.set({
            name: displayName,
            email: email,
            whatsapp: whatsapp || null, // Simpan null jika tidak ada
            role: 'admin',
            status: 'active',
            storeId: storeRef.id,
        });

        // 4. Atur custom claims untuk pengguna (penting untuk security rules)
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: 'admin',
            storeId: storeRef.id,
        });
        
        logger.info(`Sukses membuat pengguna baru: ${displayName} (${email}) untuk toko: ${storeName}`);

        return { success: true, uid: userRecord.uid, storeId: storeRef.id };

  } catch (error) {
        logger.error('Gagal membuat pengguna baru:', error);

        // Jika pengguna Auth sudah dibuat tapi langkah lain gagal, hapus pengguna Auth tersebut.
        if (error.code !== 'auth/email-already-exists') {
            const user = await admin.auth().getUserByEmail(email).catch(() => null);
            if (user) {
                await admin.auth().deleteUser(user.uid);
                logger.warn(`Membersihkan pengguna auth yatim: ${email}`);
            }
        }
        
        // Kirim error yang mudah dimengerti ke aplikasi klien
        if (error.code === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'Email ini sudah terdaftar. Silakan gunakan email lain.');
        }
        throw new HttpsError('internal', 'Terjadi kesalahan saat membuat pengguna. Silakan coba lagi.');
    }
});

export const createEmployee = onCall(async (request) => {
    // Check if the caller is an admin
    if (!request.auth || !['admin', 'superadmin'].includes(request.auth.token.role)) {
        throw new HttpsError('permission-denied', 'Only admins or superadmins can create employees.');
    }

    const { email, password, name, role, storeId } = request.data;
    
    if (!email || !password || !name || !role || !storeId) {
        throw new HttpsError('invalid-argument', 'Missing required employee data.');
    }

    try {
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name,
        });

        await admin.auth().setCustomUserClaims(userRecord.uid, { role, storeId });

        await db.collection('users').doc(userRecord.uid).set({
            name,
            email,
            role,
            storeId,
            status: 'active',
        });
        
        // If the new user is an admin, add them to the store's adminUids array
        if (role === 'admin') {
            const storeRef = db.collection('stores').doc(storeId);
            await storeRef.update({
                adminUids: admin.firestore.FieldValue.arrayUnion(userRecord.uid)
            });
        }

        logger.info(`Successfully created new employee: ${name} (${email}) for store: ${storeId}`);

        return { success: true, uid: userRecord.uid };
    } catch (error: any) {
        logger.error(`Error creating employee by ${request.auth?.uid}:`, error);

         if (error.code === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'This email is already registered.');
        }
        throw new HttpsError('internal', 'An internal error occurred while creating the employee.');
    }
});
