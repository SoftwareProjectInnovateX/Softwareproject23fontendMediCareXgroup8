// Firebase core
import { initializeApp } from "firebase/app";

// Firebase services
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Firebase configuration (shared)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (ONCE)
const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// Authentication (for login later)
export const auth = getAuth(app);

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
    const token = await user.getIdToken();
    return {
      'Authorization': `Bearer ${token}`
    };
  } catch (error) {
    console.error("Error getting auth token:", error);
    return {};
  }
};

export { analytics };
