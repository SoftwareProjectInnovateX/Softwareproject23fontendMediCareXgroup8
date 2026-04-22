import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC64IrEovMCJi6mNKMAb4WPNDKGeubsuVM",
  authDomain: "supplier-management-70b81.firebaseapp.com",
  projectId: "supplier-management-70b81",
  storageBucket: "supplier-management-70b81.firebasestorage.app",
  messagingSenderId: "109245280482",
  appId: "1:109245280482:web:d0c1df43c6628fd5f36ebb",
  measurementId: "G-NLMV8D63XD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services you actually use
export const db = getFirestore(app);
export const storage = getStorage(app);