'use server';

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const registerStore = onCall(async (request) => {
  const { storeName, storeLocation, adminName, email, whatsapp, password } = request.data;
  
  if (!storeName || !storeLocation || !adminName || !email || !whatsapp || !password) {
      throw new HttpsError('invalid-argument', 'Missing required registration fields.');
  }

  let userRecord;
  let storeRef;

  try {
    // 1. Create Firebase Auth user
    userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: adminName,
    });

    // 2. Create the store document with the admin's UID
    storeRef = await db.collection('stores').add({
      name: storeName,
      location: storeLocation,
      pradanaTokenBalance: 0,
      adminUids: [userRecord.uid],
      createdAt: new Date().toISOString(),
    });

    // 3. Create the user document in 'users' collection
    const userDocRef = db.collection('users').doc(userRecord.uid);
    await userDocRef.set({
      name: adminName,
      email: email,
      whatsapp: whatsapp,
      role: 'admin',
      status: 'active',
      storeId: storeRef.id,
    });

    // 4. Set custom claims for the user role
    await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: 'admin',
        storeId: storeRef.id
    });

    logger.info(`Successfully created store ${storeRef.id} and admin user ${userRecord.uid}`);
    return { success: true, userId: userRecord.uid, storeId: storeRef.id };

  } catch (error: any) {
    logger.error('Error during store registration:', error);

    // Cleanup failed operations
    if (userRecord) {
      await admin.auth().deleteUser(userRecord.uid).catch(e => logger.error(`Cleanup of user ${userRecord.uid} failed.`, e));
    }
    // We don't need to cleanup the store doc since it's created after user.

    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'This email address is already in use by another account.');
    }
    
    throw new HttpsError('internal', 'An unexpected error occurred during registration. Please try again.');
  }
});


export const createEmployee = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to perform this action.');
    }
    const callerRole = request.auth.token.role;
    if (callerRole !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admins can create new employees.');
    }

    const { email, password, name, role, storeId } = request.data;
    
    if (!email || !password || !name || !role || !storeId) {
        throw new HttpsError('invalid-argument', 'Missing required employee fields: email, password, name, role, storeId.');
    }

    if (role !== 'admin' && role !== 'cashier') {
         throw new HttpsError('invalid-argument', `Invalid role specified: ${role}. Can only be 'admin' or 'cashier'.`);
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
    } catch (error) {
        if (userRecord) {
            await admin.auth().deleteUser(userRecord.uid).catch(e => logger.error(`Cleanup failed for user ${userRecord.uid}`, e));
        }
        logger.error(`Error creating employee by admin ${request.auth.uid}:`, error);
        if ((error as any).code === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'This email is already registered.');
        }
        throw new HttpsError('internal', 'An unexpected error occurred while creating the employee.');
    }
});
