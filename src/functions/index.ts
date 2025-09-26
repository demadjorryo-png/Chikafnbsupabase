
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
            storeId: storeRef.id,
        });

        // 4. Set custom claims for the user
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: 'admin',
            storeId: storeRef.id,
        });
        
        logger.info(`Successfully created new user: ${displayName} (${email}) for store: ${storeName}`);

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
        
        // Re-throw a user-friendly error to the client
        if (error.code === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'This email is already registered.');
        }
        throw new HttpsError('internal', 'An error occurred while creating the user.');
    }
});
