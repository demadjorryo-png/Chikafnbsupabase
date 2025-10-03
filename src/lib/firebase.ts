'use client';

import {initializeApp, getApps, getApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAT7g9niddpksmzpOhcz6g8dtWnq5Vd6ms",
  authDomain: "kasir-pos-chika-toko-354-1abce.firebaseapp.com",
  projectId: "kasir-pos-chika-toko-354-1abce",
  storageBucket: "kasir-pos-chika-toko-354-1abce.appspot.com",
  messagingSenderId: "582069956448",
  appId: "1:582069956448:web:ed2154023a6f7226837805"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
