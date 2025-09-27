
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK (only once)
admin.initializeApp();
const db = admin.firestore();


// =========================================================================================
// USER REGISTRATION AND MANAGEMENT FUNCTIONS
// =========================================================================================

export const createUser = onCall(async (request) => {
    const { email, password, displayName, storeName, whatsapp } = request.data;

    // Ensure required data is present
    if (!email || !password || !displayName || !storeName) {
        logger.error("Missing required fields for user creation.", { data: request.data });
        throw new HttpsError('invalid-argument', 'Please provide all required fields.');
    }

    try {
        // 1. Create user in Firebase Auth
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: displayName,
        });

        // 2. Create store document in Firestore
        const storeRef = db.collection('stores').doc(); // Auto-generate ID
        await storeRef.set({
            name: storeName,
            location: 'Indonesia',
            pradanaTokenBalance: 50.00, // Initial token balance
            adminUids: [userRecord.uid],
            createdAt: new Date().toISOString(),
        });

        // 3. Create user document in Firestore
        const userRef = db.collection('users').doc(userRecord.uid);
        await userRef.set({
            name: displayName,
            email: email,
            whatsapp: whatsapp || null,
            role: 'admin',
            status: 'active',
            storeId: storeRef.id,
        });

        // 4. Set custom claims for the user (important for security rules)
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: 'admin',
            storeId: storeRef.id,
        });
        
        logger.info(`Successfully created new user: ${displayName} (${email}) for store: ${storeName}`);

        return { success: true, uid: userRecord.uid, storeId: storeRef.id };

    } catch (error) {
        logger.error('Failed to create new user:', error);

        // Check if error is an object with a 'code' property
        const errorCode = (typeof error === 'object' && error !== null && 'code' in error) ? (error as {code: unknown}).code : undefined;

        // If Auth user was created but other steps failed, clean up the Auth user.
        // This prevents "orphan" accounts that don't have Firestore data.
        if (errorCode !== 'auth/email-already-exists') {
            const user = await admin.auth().getUserByEmail(email).catch(() => null);
            if (user) {
                await admin.auth().deleteUser(user.uid);
                logger.warn(`Cleaned up orphan auth user: ${email}`);
            }
        }
        
        // Send a user-friendly error to the client application
        if (errorCode === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'This email is already registered. Please use another email.');
        }
        throw new HttpsError('internal', 'An error occurred while creating the user. Please try again.');
    }
});

export const createEmployee = onCall(async (request) => {
    // Check if the caller is an admin or superadmin
    if (!request.auth || !['admin', 'superadmin'].includes(request.auth.token.role)) {
        throw new HttpsError('permission-denied', 'Only admins or superadmins can create employees.');
    }

    const { email, password, name, role, storeId } = request.data;
    
    if (!email || !password || !name || !role || !storeId) {
        logger.error("Missing required employee data.", { data: request.data });
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
    } catch (error) {
        logger.error(`Error creating employee by ${request.auth?.uid}:`, error);

        const errorCode = (typeof error === 'object' && error !== null && 'code' in error) ? (error as {code: unknown}).code : undefined;

        if (errorCode === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'This email is already registered.');
        }
        throw new HttpsError('internal', 'An internal error occurred while creating the employee.');
    }
});
