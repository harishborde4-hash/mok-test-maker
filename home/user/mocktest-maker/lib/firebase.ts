import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// =====================================================
// FIREBASE CONFIG - SAFE FOR GITHUB
// =====================================================
// This project is prepared for GitHub upload.
//
// HOW TO ADD REAL KEYS:
//
// 1. LOCAL DEVELOPMENT:
//    - Run: cp .env.example .env.local
//    - Edit .env.local with your real values
//
// 2. VERCEL DEPLOYMENT:
//    - Add the following Environment Variables in Vercel:
//      NEXT_PUBLIC_FIREBASE_API_KEY
//      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
//      NEXT_PUBLIC_FIREBASE_PROJECT_ID
//      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
//      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
//      NEXT_PUBLIC_FIREBASE_APP_ID
//
// NEVER commit real keys to GitHub.
// =====================================================

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
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