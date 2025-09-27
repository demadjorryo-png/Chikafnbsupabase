
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
    // Check if the caller is an admin or superadmin
    if (!request.auth || !['admin', 'superadmin'].includes(request.auth.token.role)) {
        throw new HttpsError('permission-denied', 'Only admins or superadmins can create employees.');
    }

    const { email, password, name, role } = request.data;
    let { storeId } = request.data;
    const callerRole = request.auth.token.role;

    // Basic validation for common fields
    if (!email || !password || !name || !role) {
        throw new HttpsError('invalid-argument', 'Missing required fields: email, password, name, role.');
    }

    // --- Superadmin Creation Logic ---
    if (role === 'superadmin') {
        // Only existing superadmins can create other superadmins
        if (callerRole !== 'superadmin') {
            throw new HttpsError('permission-denied', 'Only a superadmin can create another superadmin.');
        }

        try {
            const userRecord = await admin.auth().createUser({ email, password, displayName: name });
            
            // Set custom claims WITHOUT storeId
            await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'superadmin' });

            // Create user document in Firestore WITHOUT storeId
            await db.collection('users').doc(userRecord.uid).set({
                name,
                email,
                role: 'superadmin',
                status: 'active',
            });

            logger.info(`Successfully created new superadmin: ${name} (${email}) by ${request.auth?.uid}`);
            return { success: true, uid: userRecord.uid };

        } catch (error) {
            logger.error(`Error creating superadmin by ${request.auth?.uid}:`, error);
            if ((error as any).code === 'auth/email-already-exists') {
                throw new HttpsError('already-exists', 'This email is already registered.');
            }
            throw new HttpsError('internal', 'An internal error occurred while creating the superadmin.');
        }
    }

    // --- Regular Employee (Admin/Cashier) Creation Logic ---
    
    // Determine storeId
    if (callerRole === 'admin') {
        storeId = request.auth.token.storeId; // Admin can only act on their own store
    }

    // Validate that storeId is present for non-superadmin roles
    if (!storeId) {
        throw new HttpsError('invalid-argument', 'storeId is required to create an admin or cashier.');
    }

    try {
        const userRecord = await admin.auth().createUser({ email, password, displayName: name });

        // Set custom claims WITH storeId
        await admin.auth().setCustomUserClaims(userRecord.uid, { role, storeId });

        // Create user document in Firestore WITH storeId
        await db.collection('users').doc(userRecord.uid).set({
            name,
            email,
            role,
            storeId,
            status: 'active',
        });
        
        // If the new employee is an admin, add them to the store's admin list
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
