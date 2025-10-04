import admin from 'firebase-admin';
import { getApps, initializeApp, credential } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Ensure Firebase Admin SDK is initialized only once.
if (!getApps().length) {
  // When running on App Hosting, the service account credentials are automatically available.
  // For local development, set the GOOGLE_APPLICATION_CREDENTIALS environment variable.
  initializeApp({
    credential: credential.applicationDefault(),
  });
}

const adminAuth = getAuth();
const adminDb = getFirestore();

export { adminAuth, adminDb, admin };
