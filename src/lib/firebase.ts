import {initializeApp, getApps, getApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZuXPnpa4lqpisO7U-6th_8kH_YCmgQok",
  authDomain: "kasir-pos-chika-v2-09828-9a2a7.firebaseapp.com",
  projectId: "kasir-pos-chika-v2-09828-9a2a7",
  storageBucket: "kasir-pos-chika-v2-09828-9a2a7.appspot.com",
  messagingSenderId: "1041744002845",
  appId: "1:1041744002845:web:7517aacfc7d8a8a6132bf4"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
