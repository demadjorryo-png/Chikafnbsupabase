
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
 * This function handles 2 scenarios for the caller:
 * 1. Admin: Can create employees (cashiers, other admins) for their own store.
 * 2. Unauthenticated user: Can register a new store, which creates an initial admin user for that store.
 */
export const createUser = onCall(async (request) => {
    // Scenario 2: New user registration (unauthenticated)
    if (!request.auth) {
        const { email, password, name, storeName, whatsapp } = request.data;
        if (!email || !password || !name || !storeName || !whatsapp) {
            throw new HttpsError('invalid-argument', 'Missing required fields for store registration.');
        }

        // Standard new store and admin registration
        let userRecord;
        try {
            userRecord = await admin.auth().createUser({ email, password, displayName: name });
            const storeRef = db.collection('stores').doc();
            await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin', storeId: storeRef.id });
            
            const batch = db.batch();
            const userData = { 
                name, 
                email, 
                whatsapp, // Save whatsapp number
                role: 'admin', 
                storeId: storeRef.id, 
                status: 'active' 
            };
            batch.set(db.collection('users').doc(userRecord.uid), userData);
            
            const storeData = { 
                name: storeName, 
                ownerUid: userRecord.uid, 
                adminUids: [userRecord.uid], 
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                pradanaTokenBalance: 100 // Free initial tokens
            };
            batch.set(storeRef, storeData);
            
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

    // Scenario 1: Authenticated user (admin)
    if (callerRole !== 'admin') {
        throw new HttpsError('permission-denied', 'You do not have permission to create users.');
    }

    const { email, password, name, role } = request.data;
    const storeId = request.auth.token.storeId; // Admin can only create for their own store

    if (!email || !password || !name || !role) {
        throw new HttpsError('invalid-argument', 'Missing required employee fields.');
    }
    
    if (role !== 'admin' && role !== 'cashier') {
         throw new HttpsError('permission-denied', `Admins cannot create users with the role: ${role}`);
    }
    
    if (!storeId) {
        throw new HttpsError('invalid-argument', 'The calling admin does not have a storeId.');
    }
    
    try {
        const userRecord = await admin.auth().createUser({ email, password, displayName: name });
        const claims = { role, storeId };
        await admin.auth().setCustomUserClaims(userRecord.uid, claims);

        const userData: any = { name, email, role, status: 'active', storeId };
        
        await db.collection('users').doc(userRecord.uid).set(userData);

        // If another admin was created for a store, add them to the store's admin list
        if (role === 'admin') {
            const storeRef = db.collection('stores').doc(storeId);
            await storeRef.update({ adminUids: admin.firestore.FieldValue.arrayUnion(userRecord.uid) });
        }

        logger.info(`User ${userRecord.uid} created by admin ${callerId}`);
        return { success: true, uid: userRecord.uid };
    } catch (error) {
        logger.error(`Error creating user by admin ${callerId}:`, error);
        if ((error as any).code === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'This email is already registered.');
        }
        throw new HttpsError('internal', 'An unexpected error occurred.');
    }
});
