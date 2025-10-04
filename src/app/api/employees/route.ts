
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp();
}
const adminAuth = getAuth();
const db = getFirestore();

export async function POST(req: NextRequest) {
  try {
    // 1. Verify the authorization token from the client
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const idToken = authorization.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const callerUid = decodedToken.uid;

    // 2. Validate Input Data from the request body
    const { email, password, name, role, storeId } = await req.json();
    if (!email || !password || !name || !role || !storeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Verify Caller Permissions from Firestore
    const callerDoc = await db.collection('users').doc(callerUid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied: Caller is not an admin' }, { status: 403 });
    }

    // 4. Create User in Firebase Authentication using Admin SDK
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });
    const newUserId = userRecord.uid;

    // 5. Set Custom Claims for Role-Based Access Control
    await adminAuth.setCustomUserClaims(newUserId, { role });
    
    // 6. Create User Document and update store in a Firestore batch
    const batch = db.batch();

    const userDocRef = db.collection('users').doc(newUserId);
    batch.set(userDocRef, {
      name,
      email,
      role,
      status: 'active',
      storeId,
    });

    if (role === 'admin') {
      const storeRef = db.collection('stores').doc(storeId);
      batch.update(storeRef, {
        adminUids: admin.firestore.FieldValue.arrayUnion(newUserId),
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true, userId: newUserId }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating employee via API route:', error);
    let errorMessage = 'An internal server error occurred.';
    let statusCode = 500;
    
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'The email address is already in use by another account.';
      statusCode = 409; // Conflict
    } else if (error.code === 'auth/id-token-expired' || error.code === 'auth/id-token-revoked') {
        errorMessage = 'Your session has expired. Please log in again.';
        statusCode = 401; // Unauthorized
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
