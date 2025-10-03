
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Import AI functions
import { generateProductDescription, getSalesInsight } from './ai';

// Export AI functions so they are deployed
export { generateProductDescription, getSalesInsight };

admin.initializeApp();
const db = admin.firestore();

export const createEmployee = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to perform this action.');
    }
    const callerRole = request.auth.token.role;
    const callerId = request.auth.uid;
    const callerStoreId = request.auth.token.storeId;

    if (callerRole !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admins can create new employees.');
    }

    if (!callerStoreId) {
        throw new HttpsError('invalid-argument', 'The calling admin is not associated with a store.');
    }

    const { email, password, name, role, storeId } = request.data;
    
    if (!email || !password || !name || !role || !storeId) {
        throw new HttpsError('invalid-argument', 'Missing required employee fields: email, password, name, role, storeId.');
    }

    if (storeId !== callerStoreId) {
        throw new HttpsError('permission-denied', 'Admins can only create employees for their own store.');
    }

    if (role !== 'admin' && role !== 'cashier') {
         throw new HttpsError('invalid-argument', `Invalid role specified: ${role}. Can only be 'admin' or 'cashier'.`);
    }
    
    let userRecord;
    try {
        userRecord = await admin.auth().createUser({ email, password, displayName: name });
        const claims = { role, storeId };
        await admin.auth().setCustomUserClaims(userRecord.uid, claims);

        const userData: any = { name, email, role, status: 'active', storeId };
        
        await db.collection('users').doc(userRecord.uid).set(userData);

        if (role === 'admin') {
            const storeRef = db.collection('stores').doc(storeId);
            await storeRef.update({ adminUids: admin.firestore.FieldValue.arrayUnion(userRecord.uid) });
        }

        logger.info(`Employee ${userRecord.uid} (${role}) created for store ${storeId} by admin ${callerId}`);
        return { success: true, uid: userRecord.uid };
    } catch (error) {
        if (userRecord) {
            await admin.auth().deleteUser(userRecord.uid).catch(e => logger.error(`Cleanup failed for user ${userRecord.uid}`, e));
        }
        logger.error(`Error creating employee by admin ${callerId}:`, error);
        if ((error as any).code === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'This email is already registered.');
        }
        throw new HttpsError('internal', 'An unexpected error occurred while creating the employee.');
    }
});
