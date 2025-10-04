import admin from 'firebase-admin';

// Define the service account object structure.
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Un-escape newlines
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

// Ensure Firebase Admin SDK is initialized only once.
if (!admin.apps.length) {
  // Check if all necessary service account details are available.
  if (serviceAccount.projectId && serviceAccount.privateKey && serviceAccount.clientEmail) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    console.error(
      'Firebase Admin SDK Error: Missing configuration. Ensure FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL are set in .env.local'
    );
  }
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { adminAuth, adminDb, admin };
