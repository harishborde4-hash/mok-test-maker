import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ⚠️ IMPORTANT: Replace these with your Firebase project config
// Get from Firebase Console > Project Settings > General > Your apps > Web app config
const firebaseConfig = {
  apiKey: "AIzaSyBmSBTRp-Y-wZNaKUNoCW-Hd-wz4Lb2BKk",
  authDomain: "moke-test-4e1e2.firebaseapp.com",
  projectId: "moke-test-4e1e2",
  storageBucket: "moke-test-4e1e2.firebasestorage.app",
  messagingSenderId: "149823331669",
  appId: "1:149823331669:web:a83c2aaa68742f555063dc",
};

// Initialize Firebase only once
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
