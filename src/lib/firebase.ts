'use client';

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "bekupon-vape-store-01447-d7c6e",
  appId: "1:643364201348:web:5d130be5baa2888919b3d1",
  storageBucket: "bekupon-vape-store-01447-d7c6e.firebasestorage.app",
  apiKey: "AIzaSyAT5-2FRf9wngx2Z1YQHScfB2wsJvTa9E4",
  authDomain: "bekupon-vape-store-01447-d7c6e.firebaseapp.com",
  messagingSenderId: "643364201348"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
