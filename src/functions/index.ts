
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Import AI functions
import { generateProductDescription, getSalesInsight } from './ai';

// Export AI functions so they are deployed
export { generateProductDescription, getSalesInsight };

admin.initializeApp();
const db = admin.firestore();

/**
 * Creates a new user account, potentially with a new store.
 * This function handles 3 scenarios for the caller:
 * 1. Superadmin: Can create any type of user, including other superadmins.
 * 2. Admin: Can create employees (cashiers, other admins) for their own store.
 * 3. Unauthenticated user: Can register a new store, which creates an initial admin user for that store.
 */
export const createUser = onCall(async (request) => {
    // Scenario 3: New user registration (unauthenticated)
    if (!request.auth) {
        const { email, password, name, storeName } = request.data;
        if (!email || !password || !name || !storeName) {
            throw new HttpsError('invalid-argument', 'Missing required fields for store registration.');
        }

        // Check for special superadmin registration case (should ideally be a one-off)
        if (email.toLowerCase() === 'riopradana@era5758.co.id') {
             logger.info('Special case: Superadmin registration attempt.');
            try {
                const existingUser = await admin.auth().getUserByEmail(email);
                await admin.auth().setCustomUserClaims(existingUser.uid, { role: 'superadmin' });
                await db.collection('users').doc(existingUser.uid).set({ 
                    name: name, 
                    email: email, 
                    role: 'superadmin', 
                    status: 'active'
                }, { merge: true });
                logger.info(`Superadmin claim granted to existing user ${existingUser.uid}`);
                return { success: true, uid: existingUser.uid, message: 'Superadmin account configured.' };
            } catch (error) {
                 if ((error as any).code === 'auth/user-not-found') {
                    const userRecord = await admin.auth().createUser({ email, password, displayName: name });
                    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'superadmin' });
                    await db.collection('users').doc(userRecord.uid).set({ name, email, role: 'superadmin', status: 'active'});
                    logger.info(`Successfully created new superadmin ${userRecord.uid}`);
                    return { success: true, uid: userRecord.uid, message: 'Superadmin account created.' };
                } else {
                    logger.error('Error during special superadmin registration', error);
                    throw new HttpsError('internal', 'An error occurred during superadmin setup.');
                }
            }
        }

        // Standard new store and admin registration
        let userRecord;
        try {
            userRecord = await admin.auth().createUser({ email, password, displayName: name });
            const storeRef = db.collection('stores').doc();
            await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin', storeId: storeRef.id });
            
            const batch = db.batch();
            batch.set(db.collection('users').doc(userRecord.uid), { name, email, role: 'admin', storeId: storeRef.id, status: 'active' });
            batch.set(storeRef, { name: storeName, ownerUid: userRecord.uid, adminUids: [userRecord.uid], createdAt: admin.firestore.FieldValue.serverTimestamp() });
            
            await batch.commit();
            logger.info(`New store created with ID: ${storeRef.id} by new admin ${userRecord.uid}`);
            return { success: true, uid: userRecord.uid, storeId: storeRef.id };
        } catch (error) {
            if (userRecord) {
                await admin.auth().deleteUser(userRecord.uid);
            }
            logger.error('Error creating new store and admin:', error);
            if ((error as any).code === 'auth/email-already-exists') {
                throw new HttpsError('already-exists', 'Email is already in use.');
            }
            throw new HttpsError('internal', 'An error occurred while creating the account and store.');
        }
    }

    const callerRole = request.auth.token.role;
    const callerId = request.auth.uid;

    // Scenarios 1 & 2: Authenticated user (superadmin or admin)
    if (!['superadmin', 'admin'].includes(callerRole)) {
        throw new HttpsError('permission-denied', 'You do not have permission to create users.');
    }

    const { email, password, name, role } = request.data;
    let { storeId } = request.data; // storeId is optional, depends on role

    if (!email || !password || !name || !role) {
        throw new HttpsError('invalid-argument', 'Missing required employee fields.');
    }

    // Superadmin trying to create a superadmin
    if (role === 'superadmin') {
        if (callerRole !== 'superadmin') {
            throw new HttpsError('permission-denied', 'Only a superadmin can create another superadmin.');
        }
        storeId = null; // Superadmins are not tied to a store
    } 
    // Admin creating an employee for their own store
    else if (callerRole === 'admin') {
        storeId = request.auth.token.storeId;
        if (role === 'admin' || role === 'cashier') {
             // Admins can create other admins or cashiers for their store
        } else {
             throw new HttpsError('permission-denied', `Admins cannot create users with the role: ${role}`);
        }
    } 
    // Superadmin creating a user for a specific store
    else if (callerRole === 'superadmin' && !storeId && role !== 'superadmin') {
        throw new HttpsError('invalid-argument', 'storeId is required when a superadmin creates a non-superadmin user.');
    }
    
    try {
        const userRecord = await admin.auth().createUser({ email, password, displayName: name });
        const claims = { role, ...(storeId && { storeId }) };
        await admin.auth().setCustomUserClaims(userRecord.uid, claims);

        const userData: any = { name, email, role, status: 'active' };
        if (storeId) {
            userData.storeId = storeId;
        }
        
        await db.collection('users').doc(userRecord.uid).set(userData);

        // If an admin was created for a store, add them to the store's admin list
        if (role === 'admin' && storeId) {
            const storeRef = db.collection('stores').doc(storeId);
            await storeRef.update({ adminUids: admin.firestore.FieldValue.arrayUnion(userRecord.uid) });
        }

        logger.info(`User ${userRecord.uid} created by ${callerId}`);
        return { success: true, uid: userRecord.uid };
    } catch (error) {
        logger.error(`Error creating user by ${callerId}:`, error);
        if ((error as any).code === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'This email is already registered.');
        }
        throw new HttpsError('internal', 'An unexpected error occurred.');
    }
});
