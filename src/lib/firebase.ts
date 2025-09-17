'use client';

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAT5-2FRf9wngx2Z1YQHScfB2wsJvTa9E4",
  authDomain: "bekupon-vape-store-01447-d7c6e.firebaseapp.com",
  projectId: "bekupon-vape-store-01447-d7c6e",
  storageBucket: "bekupon-vape-store-01447-d7c6e.firebasestorage.app",
  messagingSenderId: "643364201348",
  appId: "1:643364201348:web:5d130be5baa2888919b3d1"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider };
