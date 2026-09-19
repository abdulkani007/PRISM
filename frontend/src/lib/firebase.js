import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "firebase/auth";

// PRISM Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAj6eLK34hzyntOHWT9YhDQ3hlx0NYGDGU",
  authDomain: "prism-691f0.firebaseapp.com",
  projectId: "prism-691f0",
  storageBucket: "prism-691f0.firebasestorage.app",
  messagingSenderId: "471312523691",
  appId: "1:471312523691:web:4152000cab2409270632ee",
  measurementId: "G-7ZP8N0JMEP"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Analytics conditionally
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged
};

export default app;
