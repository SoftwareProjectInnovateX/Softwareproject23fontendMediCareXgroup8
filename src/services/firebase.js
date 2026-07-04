// Firebase core
import { initializeApp } from "firebase/app";

// Firebase services
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getStorage } from "firebase/storage";          // ← added

// Firebase configuration (shared)
const firebaseConfig = {
  apiKey:            'AIzaSyC64IrEovMCJi6mNKMAb4WPNDKGeubsuVM',
  authDomain:        'supplier-management-70b81.firebaseapp.com',
  projectId:         'supplier-management-70b81',
  storageBucket:     'supplier-management-70b81.appspot.com',
  messagingSenderId: '1051492488454',
  appId:             '1:1051492488454:web:1234567890abcdef',
  measurementId:     'G-1234567890',
};

// Initialize Firebase (ONCE)
const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// Authentication (for login later)
export const auth = getAuth(app);

// Storage                                               // ← added
export const storage = getStorage(app);                 // ← added

//  Analytics (safe for localhost & Vite)
let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export const getAuthHeaders = async () => {
  const user = auth.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken(true); // true = force refresh token with latest claims
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',     // added so backend accepts JSON body
    };
  } catch (error) {
    console.error("Error getting auth token:", error);
    return {};
  }
};

export { analytics };