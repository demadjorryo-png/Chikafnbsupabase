
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, admin } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  // ==================== LANGKAH DIAGNOSTIK ====================
  // Kode ini akan mencetak variabel lingkungan yang dibaca oleh server.
  // Ini akan membantu kita memastikan file .env.local dimuat dengan benar.
  console.log("=============================================");
  console.log("DIAGNOSTIK KREDENSIAL FIREBASE ADMIN:");
  console.log("- FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
  console.log("- FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
  console.log("- FIREBASE_PRIVATE_KEY (Exists):", !!process.env.FIREBASE_PRIVATE_KEY);
  console.log("=============================================");
  // ============================================================

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

    // 3. Verify Caller Permissions
    const callerDoc = await adminDb.collection('users').doc(callerUid).get();
    
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
    const batch = adminDb.batch();

    const userDocRef = adminDb.collection('users').doc(newUserId);
    batch.set(userDocRef, {
      name,
      email,
      role,
      status: 'active',
      storeId,
    });

    if (role === 'admin') {
      const storeRef = adminDb.collection('stores').doc(storeId);
      batch.update(storeRef, {
        adminUids: admin.firestore.FieldValue.arrayUnion(newUserId),
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true, userId: newUserId }, { status: 201 });

  } catch (error) {
    console.error('Error creating employee via API route:', error);
    let errorMessage = 'An internal server error occurred.';
    let statusCode = 500;
    
    if (error instanceof Object && 'code' in error && 'message' in error) {
        const firebaseError = error as { code: string, message: string };
        if (firebaseError.code === 'auth/email-already-exists') {
          errorMessage = 'The email address is already in use by another account.';
          statusCode = 409; // Conflict
        } else if (firebaseError.code === 'auth/id-token-expired' || firebaseError.code === 'auth/id-token-revoked') {
            errorMessage = 'Your session has expired. Please log in again.';
            statusCode = 401; // Unauthorized
        } else if (firebaseError.code === 'auth/invalid-argument') {
            errorMessage = `Invalid argument provided: ${firebaseError.message}`;
            statusCode = 400;
        } else if (firebaseError.code === 'auth/invalid-credential' || String(firebaseError.message).includes('credential')) {
            errorMessage = "Server configuration error. Could not initialize authentication service.";
            statusCode = 500;
        }
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
