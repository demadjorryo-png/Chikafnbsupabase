'use client';

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAcpYnh1IAcsdYqdwcAcGcVNPpg8XW8jrs",
  authDomain: "kasir-pos-chika-77817547-3caa2.firebaseapp.com",
  projectId: "kasir-pos-chika-77817547-3caa2",
  storageBucket: "kasir-pos-chika-77817547-3caa2.firebasestorage.app",
  messagingSenderId: "167545733860",
  appId: "1:167545733860:web:ba789ac18ed13f069162f1"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
