// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC64IrEovMCJi6mNKMAb4WPNDKGeubsuVM",
  authDomain: "supplier-management-70b81.firebaseapp.com",
  projectId: "supplier-management-70b81",
  storageBucket: "supplier-management-70b81.firebasestorage.app",
  messagingSenderId: "109245280482",
  appId: "1:109245280482:web:d0c1df43c6628fd5f36ebb",
  measurementId: "G-NLMV8D63XD",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Firestore database export (THIS FIXES YOUR ERRORS)
export const db = getFirestore(app);

// ✅ Analytics (safe check – avoids errors in localhost)
let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export { analytics };
