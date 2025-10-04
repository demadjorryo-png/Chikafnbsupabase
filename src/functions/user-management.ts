/**
 * @fileoverview Cloud Functions for user management, such as creating new employees.
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * A callable function to create a new employee (Firebase Auth user and Firestore doc).
 * This function can only be called by an authenticated user who is an admin.
 */
export const createEmployee = onCall(async (request) => {
  // 1. Authentication and Authorization Check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in to create an employee.');
  }

  const { email, password, name, role, storeId } = request.data;
  const callerUid = request.auth.uid;

  // 2. Validate Input Data
  if (!email || !password || !name || !role || !storeId) {
    throw new HttpsError('invalid-argument', 'Missing required fields: email, password, name, role, and storeId.');
  }

  try {
    // 3. Verify Caller Permissions
    const callerDoc = await db.collection('users').doc(callerUid).get();
    const callerData = callerDoc.data();

    if (!callerData || callerData.role !== 'admin') {
      throw new HttpsError('permission-denied', 'You must be an admin to create an employee.');
    }
    
    // 4. Create User in Firebase Authentication
    logger.info(`Creating user: ${email} with role: ${role}`);
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
    });
    
    const newUserId = userRecord.uid;

    // 5. Set Custom Claims for Role-Based Access Control
    await admin.auth().setCustomUserClaims(newUserId, { role: role });
    
    // 6. Create User Document in Firestore
    const userDocRef = db.collection('users').doc(newUserId);
    await userDocRef.set({
      name: name,
      email: email,
      role: role,
      status: 'active',
      storeId: storeId, // Associate user with the store
    });

    // 7. If the new user is an admin, add them to the store's admin list
    if (role === 'admin') {
        const storeRef = db.collection('stores').doc(storeId);
        await storeRef.update({
            adminUids: admin.firestore.FieldValue.arrayUnion(newUserId),
        });
    }

    logger.info(`Successfully created user ${newUserId} (${email})`);
    return { success: true, userId: newUserId };

  } catch (error: any) {
    logger.error('Error creating employee:', error);
    // Handle specific Firebase Admin SDK errors
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'The email address is already in use by another account.');
    }
    // Generic internal error for other cases
    throw new HttpsError('internal', 'An unexpected error occurred while creating the employee.');
  }
});
