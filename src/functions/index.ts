
'use server';

import * as functions from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * A callable function to register a new store and an admin user account.
 * This is a single, robust function that handles all registration steps.
 */
export const registerStore = functions.https.onCall(async (request) => {
  const { storeName, storeLocation, adminName, email, whatsapp, password } = request.data;
  
  if (!storeName || !storeLocation || !adminName || !email || !whatsapp || !password) {
      logger.error("Registration failed due to missing fields.", request.data);
      throw new functions.https.HttpsError('invalid-argument', 'Missing required registration fields.');
  }

  let userRecord: admin.auth.UserRecord | null = null;

  try {
    // 1. Create Firebase Auth user
    userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: adminName,
    });
    
    logger.info(`Auth user created: ${userRecord.uid}`);

    // 2. Create the store document first to get its ID
    const storeRef = db.collection('stores').doc();
    await storeRef.set({
      name: storeName,
      location: storeLocation,
      pradanaTokenBalance: 0,
      adminUids: [userRecord.uid],
      createdAt: new Date().toISOString(),
    });
    logger.info(`Store document ${storeRef.id} created.`);

    // 3. Set custom claims for the new user, including the new storeId
    await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: 'admin',
        storeId: storeRef.id,
    });
    logger.info(`Custom claims set for ${userRecord.uid}`);

    // 4. Create the user document in Firestore
    const userDocRef = db.collection('users').doc(userRecord.uid);
    await userDocRef.set({
        name: adminName,
        email: email,
        whatsapp: whatsapp,
        role: 'admin',
        status: 'active',
        storeId: storeRef.id, // Associate user with the store
    });
    logger.info(`User document ${userRecord.uid} created for store ${storeRef.id}.`);

    return { success: true, userId: userRecord.uid, storeId: storeRef.id };

  } catch (error: any) {
    logger.error('Error during store registration:', error);

    // CRITICAL: If any step fails after auth user creation, delete the auth user to prevent orphans.
    if (userRecord) {
        await admin.auth().deleteUser(userRecord.uid).catch(e => logger.error(`Orphaned user cleanup for ${userRecord?.uid} failed.`, e));
        logger.info(`Cleaned up orphaned auth user ${userRecord.uid}.`);
    }

    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'This email address is already in use by another account.');
    }
    throw new functions.https.HttpsError('internal', 'An unexpected error occurred during registration. Please try again.');
  }
});


/**
 * A callable function to create an employee (admin or cashier) for an existing store.
 * This is invoked from the dashboard by an existing admin.
 */
export const createEmployee = functions.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to perform this action.');
    }
    const callerRole = request.auth.token.role;
    if (callerRole !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can create new employees.');
    }

    const { email, password, name, role, storeId } = request.data;
    
    if (!email || !password || !name || !role || !storeId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required employee fields: email, password, name, role, storeId.');
    }

    if (role !== 'admin' && role !== 'cashier') {
         throw new functions.https.HttpsError('invalid-argument', `Invalid role specified: ${role}. Can only be 'admin' or 'cashier'.`);
    }
    
    let userRecord: admin.auth.UserRecord | null = null;
    try {
        userRecord = await admin.auth().createUser({ email, password, displayName: name });
        
        await admin.auth().setCustomUserClaims(userRecord.uid, { role, storeId });

        const userData: any = { name, email, role, status: 'active', storeId };
        
        await db.collection('users').doc(userRecord.uid).set(userData);

        if (role === 'admin') {
            const targetStoreRef = db.collection('stores').doc(storeId);
            await targetStoreRef.update({ adminUids: admin.firestore.FieldValue.arrayUnion(userRecord.uid) });
        }

        logger.info(`Employee ${userRecord.uid} (${role}) created for store ${storeId} by admin ${request.auth.uid}`);
        return { success: true, uid: userRecord.uid };
    } catch (error: any) {
        // CRITICAL: Cleanup failed auth user creation if subsequent steps fail.
        if (userRecord) {
            await admin.auth().deleteUser(userRecord.uid).catch(e => logger.error(`Orphaned user cleanup for ${userRecord?.uid} failed.`, e));
        }
        logger.error(`Error creating employee by admin ${request.auth.uid}:`, error);
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'This email is already registered.');
        }
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while creating the employee.');
    }
});
