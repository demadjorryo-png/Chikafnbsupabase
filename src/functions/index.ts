// --- Impor untuk fungsi V2 (disarankan) ---
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Inisialisasi Firebase Admin SDK (hanya sekali)
admin.initializeApp();
const db = admin.firestore();


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
        
        let user: admin.auth.UserRecord | null = null;
        try {
            user = await admin.auth().getUserByEmail(email);
        } catch (e) {
            // User does not exist, safe to ignore
        }
        
        if (user && (error as any).code !== 'auth/email-already-exists') {
             await admin.auth().deleteUser(user.uid);
             logger.warn(`Membersihkan pengguna auth yatim: ${email}`);
        }
        
        if ((error as any).code === 'auth/email-already-exists') {
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
    
    let { email, password, name, role, storeId } = request.data;
    const callerRole = request.auth.token.role;

    // If caller is superadmin, they MUST provide the storeId in the request.
    // If caller is admin, they can only create employees for their own store.
    if (callerRole === 'admin') {
        storeId = request.auth.token.storeId;
    }
    
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
        
        if (role === 'admin') {
            const storeRef = db.collection('stores').doc(storeId);
            await storeRef.update({
                adminUids: admin.firestore.FieldValue.arrayUnion(userRecord.uid)
            });
        }

        logger.info(`Successfully created new employee: ${name} (${email}) for store: ${storeId}`);

        return { success: true, uid: userRecord.uid };
    } catch (error) {
        logger.error(`Error creating employee by ${request.auth?.uid}:`, error);

         if ((error as any).code === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'This email is already registered.');
        }
        throw new HttpsError('internal', 'An internal error occurred while creating the employee.');
    }
});
