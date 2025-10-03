
'use server';

import * as functions from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * A callable function to register a new store and an admin user account.
 * This function only creates the Auth user and the store document.
 * The corresponding user document in Firestore is created by the `onNewStoreCreate` trigger.
 */
export const registerStore = functions.https.onCall(async (request) => {
  const { storeName, storeLocation, adminName, email, whatsapp, password } = request.data;
  
  if (!storeName || !storeLocation || !adminName || !email || !whatsapp || !password) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required registration fields.');
  }

  try {
    // 1. Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: adminName,
    });
    
    logger.info(`Auth user created: ${userRecord.uid}`);

    // 2. Set custom claims for the new user
    await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: 'admin',
    });
    logger.info(`Custom claims set for ${userRecord.uid}`);

    // 3. Create the store document and include admin info for the trigger function
    const storeRef = db.collection('stores').doc();
    await storeRef.set({
      name: storeName,
      location: storeLocation,
      pradanaTokenBalance: 0,
      adminUids: [userRecord.uid],
      createdAt: new Date().toISOString(),
      // Temp data for the onNewStoreCreate trigger
      _tempAdminData: {
          uid: userRecord.uid,
          name: adminName,
          email: email,
          whatsapp: whatsapp,
          role: 'admin',
          storeId: storeRef.id
      }
    });

    logger.info(`Store document ${storeRef.id} created successfully.`);
    return { success: true, userId: userRecord.uid, storeId: storeRef.id };

  } catch (error: any) {
    logger.error('Error during store registration:', error);
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'This email address is already in use by another account.');
    }
    throw new functions.https.HttpsError('internal', 'An unexpected error occurred during registration. Please try again.');
  }
});


/**
 * A Firestore trigger that creates a user document whenever a new store is created.
 * This ensures the user profile is created transactionally after the store exists.
 */
export const onNewStoreCreate = functions.firestore.onDocumentCreated("stores/{storeId}", async (event) => {
    const storeData = event.data?.data();
    if (!storeData || !storeData._tempAdminData) {
        logger.error(`New store ${event.params.storeId} created without _tempAdminData. Cannot create user document.`);
        return;
    }

    const { uid, name, email, whatsapp, role, storeId } = storeData._tempAdminData;

    if (!uid || !name || !email || !role || !storeId) {
        logger.error(`Missing user data in _tempAdminData for store ${event.params.storeId}`);
        return;
    }

    const userDocRef = db.collection('users').doc(uid);

    try {
        await userDocRef.set({
            name: name,
            email: email,
            whatsapp: whatsapp,
            role: role,
            status: 'active',
            storeId: storeId,
        });

        logger.info(`User document ${uid} created successfully for store ${storeId}.`);
        
        // Clean up the temporary data from the store document
        await event.data?.ref.update({
            _tempAdminData: admin.firestore.FieldValue.delete()
        });

    } catch (error) {
        logger.error(`Failed to create user document for UID ${uid} on store creation ${storeId}:`, error);
        // In a production scenario, you might want to add retry logic or alert an admin.
    }
});


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
    
    let userRecord;
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
            await admin.auth().deleteUser(userRecord.uid).catch(e => logger.error(`Orphaned user cleanup for ${userRecord.uid} failed.`, e));
        }
        logger.error(`Error creating employee by admin ${request.auth.uid}:`, error);
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'This email is already registered.');
        }
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while creating the employee.');
    }
});
