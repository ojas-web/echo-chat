import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider
} from "firebase/auth";

// Paste the Firebase values you got from
// Firebase Console → Project settings → Your apps

const firebaseConfig = {
  apiKey: "AIzaSyCR6XvbbSt5ELtEjvlNWW5M30PYTurM_18",
  authDomain: "echo-f36d1.firebaseapp.com",
  projectId: "echo-f36d1",
  storageBucket: "echo-f36d1.firebasestorage.app",
  messagingSenderId: "275218076319",
  appId: "1:275218076319:web:a936bc72cc74b44ade88aa"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);

// Google login provider
export const googleProvider = new GoogleAuthProvider();

export const db = getFirestore(app);