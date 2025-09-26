
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();

const db = admin.firestore();

// Note: Ensure this Cloud Function is deployed to Firebase.
// You can deploy using the Firebase CLI: `firebase deploy --only functions`

export const createUser = onCall(async (request) => {
    const { email, password, displayName, storeName, whatsapp } = request.data;

    try {
        // 1. Create user in Firebase Auth
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: displayName,
        });

        // 2. Create store document in Firestore
        const storeRef = db.collection('stores').doc();
        await storeRef.set({
            name: storeName,
            location: 'Indonesia',
            pradanaTokenBalance: 50.00,
            adminUids: [userRecord.uid],
            createdAt: new Date().toISOString(),
        });

        // 3. Create user document in Firestore
        const userRef = db.collection('users').doc(userRecord.uid);
        await userRef.set({
            name: displayName,
            email: email,
            whatsapp: whatsapp,
            role: 'admin',
            status: 'active',
            storeId: storeRef.id, // Admins can also have a primary storeId
        });

        // 4. Set custom claims for the user
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: 'admin',
            storeId: storeRef.id,
        });
        
        logger.info(`Successfully created new admin user: ${displayName} (${email}) for store: ${storeName}`);

        return { success: true, uid: userRecord.uid };

    } catch (error: any) {
        logger.error('Error creating new user:', error);

        // If user was created in Auth but something else failed, delete the Auth user
        if (error.code !== 'auth/email-already-exists') {
             const user = await admin.auth().getUserByEmail(email).catch(() => null);
             if (user) {
                 await admin.auth().deleteUser(user.uid);
                 logger.warn(`Cleaned up orphaned auth user: ${email}`);
             }
        }
        
        if (error.code === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'This email is already registered.');
        }
        throw new HttpsError('internal', 'An error occurred while creating the user.');
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
