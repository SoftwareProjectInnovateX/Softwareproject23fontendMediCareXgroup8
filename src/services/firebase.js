// Firebase core
import { initializeApp } from "firebase/app";

// Firebase services
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// 🔐 Firebase configuration (shared)
const firebaseConfig = {
  apiKey: "AIzaSyC64IrEovMCJi6mNKMAb4WPNDKGeubsuVM",
  authDomain: "supplier-management-70b81.firebaseapp.com",
  projectId: "supplier-management-70b81",
  storageBucket: "supplier-management-70b81.firebasestorage.app",
  messagingSenderId: "109245280482",
  appId: "1:109245280482:web:d0c1df43c6628fd5f36ebb",
  measurementId: "G-NLMV8D63XD",
};

// 🚀 Initialize Firebase (ONCE)
const app = initializeApp(firebaseConfig);

// 🔥 Firestore
export const db = getFirestore(app);

// 🔐 Authentication (for login later)
export const auth = getAuth(app);

// 📊 Analytics (safe for localhost & Vite)
let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export { analytics };
