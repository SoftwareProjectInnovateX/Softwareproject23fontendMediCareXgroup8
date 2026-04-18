import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../services/firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Generate next ID for different roles
  const generateNextId = async (collectionName, prefix) => {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);

      // Get the highest number
      let maxNum = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const idField = `${collectionName.slice(0, -1)}Id`; // e.g., supplierId, customerId
        if (data[idField]) {
          const num = parseInt(data[idField].replace(prefix, ""));
          if (num > maxNum) maxNum = num;
        }
      });

      // Generate next ID
      const nextNum = maxNum + 1;
      return `${prefix}${String(nextNum).padStart(3, "0")}`;
    } catch (error) {
      console.error(`Error generating ${collectionName} ID:`, error);
      return `${prefix}${String(Date.now()).slice(-3)}`; // Fallback
    }
  };

  // Register new user
  const register = async (userData) => {
    const { role } = userData;

    try {
      if (role === "customer") {
        // ── Customer: create account immediately ──
        const { fullName, email, password, phone } = userData;
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const user = userCredential.user;
        const customerId = await generateNextId("users", "C");

        const savedUserData = {
          customerId,
          userId: user.uid,
          fullName,
          email,
          phone: phone || "",
          role: "customer",
          status: "active",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        await setDoc(doc(db, "users", user.uid), savedUserData);
        sessionStorage.setItem("userId", user.uid);
        sessionStorage.setItem("userRole", "customer");
        sessionStorage.setItem("userName", fullName);
        sessionStorage.setItem("userEmail", email);
        setUserRole("customer");

        return {
          success: true,
          user: { uid: user.uid, email, role: "customer", ...savedUserData },
        };
      } else if (role === "supplier") {
        // ── Supplier: save as pending request (NO Firebase Auth yet) ──
        const {
          companyName,
          email,
          contactPerson,
          phone,
          businessRegNo,
          businessAddress,
          categories,
          bankName,
          accountNumber,
          accountHolderName,
        } = userData;

        // Save request to pendingRequests collection
        await addDoc(collection(db, "pendingRequests"), {
          type: "supplier",
          companyName,
          email,
          contactPerson,
          phone,
          businessRegNo,
          businessAddress,
          categories: categories || [],
          bankName,
          accountNumber,
          accountHolderName,
          status: "pending",
          requestedAt: Timestamp.now(),
        });

        return { success: true, pending: true };
      } else if (role === "pharmacist") {
        //Pharmacist: save as pending request
        const {
          fullName,
          email,
          phone,
          nicNumber,
          licenseNumber,
          licenseExpiry,
          specialization,
        } = userData;

        await addDoc(collection(db, "pendingRequests"), {
          type: "pharmacist",
          fullName,
          email,
          phone,
          nicNumber,
          licenseNumber,
          licenseExpiry,
          specialization,
          status: "pending",
          requestedAt: Timestamp.now(),
        });

        return { success: true, pending: true };
      }
    } catch (error) {
      console.error("Registration error:", error);
      let message = "Registration failed";
      if (error.code === "auth/email-already-in-use")
        message = "Email already registered";
      else if (error.code === "auth/weak-password")
        message = "Password too weak";
      else if (error.code === "auth/invalid-email")
        message = "Invalid email address";
      throw new Error(message);
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      let userData = null;
      let actualRole = null;

      const roleCollections = {
        supplier: "suppliers",
        customer: "users",
        pharmacist: "pharmacists",
        admin: "admins",
      };

      for (const [role, collectionName] of Object.entries(roleCollections)) {
        const userDoc = await getDoc(doc(db, collectionName, user.uid));
        if (userDoc.exists()) {
          userData = userDoc.data();
          actualRole = userData.role;
          break;
        }
      }

      //if user data not found, throw erroe
      if (!userData) {
        await signOut(auth);
        throw new Error(
          "User profile not found. Please contact administrator.",
        );
      }

      // Check account is active
      if (userData.status && userData.status !== "active") {
        await signOut(auth);
        throw new Error(
          "Your account is suspended. Please contact the administrator.",
        );
      }
      // Update last login time
      const collectionName = roleCollections[actualRole];
      await setDoc(
        doc(db, collectionName, user.uid),
        {
          ...userData,
          lastLogin: Timestamp.now(),
        },
        { merge: true },
      );

      sessionStorage.setItem("userId", user.uid);
      sessionStorage.setItem("userRole", actualRole);
      sessionStorage.setItem("userName", userData.fullName || userData.name);
      sessionStorage.setItem("userEmail", userData.email);

      setUserRole(actualRole);

      console.log(`User logged in as ${actualRole} in this tab`);

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          role: actualRole,
          ...userData,
        },
      };
    } catch (error) {
      console.error("Login error:", error);

      let message = "Login failed";
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        message = "Invalid email or password";
      } else if (error.code === "auth/invalid-credential") {
        message = "Invalid email or password";
      } else if (error.message.includes("not found")) {
        message = error.message;
      }

      throw new Error(message);
    }
  };

  // Send password reset email
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error("Password reset error:", error);
      throw error; // throw the raw error so ForgotPassword.jsx can read error.code
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await signOut(auth);
      sessionStorage.clear();
      setUser(null);
      setCurrentUser(null);
      setUserRole(null);
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      throw new Error("Logout failed");
    }
  };

  // Get current user's full data
  const getCurrentUserData = async () => {
    if (!currentUser) return null;

    try {
      // Try to get from appropriate collection based on role
      const role = sessionStorage.getItem("userRole");
      let collectionName;

      switch (role) {
        case "supplier":
          collectionName = "suppliers";
          break;
        case "customer":
          collectionName = "users";
          break;
        case "pharmacist":
          collectionName = "pharmacists";
          break;
        case "admin":
          collectionName = "admins";
          break;
        default:
          return null;
      }

      const userDoc = await getDoc(doc(db, collectionName, currentUser.uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  // Get supplier profile for current user
  const getSupplierProfile = async () => {
    if (!currentUser || userRole !== "supplier") return null;

    try {
      const supplierDoc = await getDoc(doc(db, "suppliers", currentUser.uid));
      if (supplierDoc.exists()) {
        return { id: supplierDoc.id, ...supplierDoc.data() };
      }
      return null;
    } catch (error) {
      console.error("Error fetching supplier profile:", error);
      return null;
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setCurrentUser(currentUser);

        // Check if we have role in sessionStorage (tab-specific)
        const storedRole = sessionStorage.getItem("userRole");

        if (storedRole) {
          // Use the stored role for this tab
          setUserRole(storedRole);
          setLoading(false);
          return;
        }

        // If no stored role, fetch from database
        try {
          // Try suppliers first
          let userDoc = await getDoc(doc(db, "suppliers", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role);
            sessionStorage.setItem("userId", currentUser.uid);
            sessionStorage.setItem("userRole", userData.role);
            sessionStorage.setItem("userName", userData.name);
            sessionStorage.setItem("userEmail", userData.email);
            setLoading(false);
            return;
          }

          // Try pharmacists
          userDoc = await getDoc(doc(db, "pharmacists", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role);
            sessionStorage.setItem("userId", currentUser.uid);
            sessionStorage.setItem("userRole", userData.role);
            sessionStorage.setItem("userName", userData.name);
            sessionStorage.setItem("userEmail", userData.email);
            setLoading(false);
            return;
          }

          // Try admins
          userDoc = await getDoc(doc(db, "admins", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role);
            sessionStorage.setItem("userId", currentUser.uid);
            sessionStorage.setItem("userRole", userData.role);
            sessionStorage.setItem("userName", userData.fullName);
            sessionStorage.setItem("userEmail", userData.email);
            setLoading(false);
            return;
          }

          // Try users (for customers)
          userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role);
            sessionStorage.setItem("userId", currentUser.uid);
            sessionStorage.setItem("userRole", userData.role);
            sessionStorage.setItem("userName", userData.fullName);
            sessionStorage.setItem("userEmail", userData.email);
            setLoading(false);
            return;
          }

          console.error("User data not found in any collection");
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      } else {
        setUser(null);
        setCurrentUser(null);
        setUserRole(null);
        sessionStorage.clear();
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    currentUser,
    userRole,
    loading,
    register,
    login,
    logout,
    resetPassword,
    getCurrentUserData,
    getSupplierProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
