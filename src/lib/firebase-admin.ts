import admin from 'firebase-admin';

// Ensure Firebase Admin SDK is initialized only once.
if (!admin.apps.length) {
  admin.initializeApp();
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { adminAuth, adminDb, admin };
