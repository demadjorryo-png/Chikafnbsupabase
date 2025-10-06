'use client';

import {initializeApp, getApps, getApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAT7g9niddpksmzpOhcz6g8dtWnq5Vd6ms",
  authDomain: "kasir-pos-chika-toko-354-1abce.firebaseapp.com",
  projectId: "kasir-pos-chika-toko-354-1abce",
  storageBucket: "kasir-pos-chika-toko-354-1abce.firebasestorage.app",
  messagingSenderId: "582069956448",
  appId: "1:582069956448:web:d7cbbc87ae84a17c837805"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };