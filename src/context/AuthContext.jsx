// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc,
  collection,
  getDocs,
  Timestamp
} from 'firebase/firestore';
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
      snapshot.forEach(doc => {
        const data = doc.data();
        const idField = `${collectionName.slice(0, -1)}Id`; // e.g., supplierId, customerId
        if (data[idField]) {
          const num = parseInt(data[idField].replace(prefix, ''));
          if (num > maxNum) maxNum = num;
        }
      });
      
      // Generate next ID
      const nextNum = maxNum + 1;
      return `${prefix}${String(nextNum).padStart(3, '0')}`;
    } catch (error) {
      console.error(`Error generating ${collectionName} ID:`, error);
      return `${prefix}${String(Date.now()).slice(-3)}`; // Fallback
    }
  };

  // Register new user
  const register = async (userData) => {
    const { fullName, email, password, role, phone, contactPerson, categories, licenseNumber } = userData;

    try {
      // 1. Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      let savedUserData = null;

      // 2. Save to role-specific collections
      switch (role) {
        case 'supplier':
          // Save to suppliers collection
          const supplierId = await generateNextId('suppliers', 'S');
          savedUserData = {
            supplierId: supplierId,
            userId: user.uid,
            name: fullName,
            email: email,
            phone: phone || '',
            contactPerson: contactPerson || fullName,
            categories: categories || [],
            rating: 0,
            status: 'active',
            role: 'supplier',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };
          await setDoc(doc(db, 'suppliers', user.uid), savedUserData);
          console.log(`✅ Supplier saved to suppliers collection with ID: ${supplierId}`);
          break;

        case 'customer':
          // Save to users collection (customers)
          const customerId = await generateNextId('users', 'C');
          savedUserData = {
            customerId: customerId,
            userId: user.uid,
            fullName: fullName,
            email: email,
            phone: phone || '',
            role: 'customer',
            status: 'active',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };
          await setDoc(doc(db, 'users', user.uid), savedUserData);
          console.log(`✅ Customer saved to users collection with ID: ${customerId}`);
          break;

        case 'pharmacist':
          // Save to pharmacists collection
          const pharmacistId = await generateNextId('pharmacists', 'P');
          savedUserData = {
            pharmacistId: pharmacistId,
            userId: user.uid,
            name: fullName,
            email: email,
            phone: phone || '',
            licenseNumber: licenseNumber || '',
            specialization: categories?.[0] || 'General',
            role: 'pharmacist',
            status: 'active',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };
          await setDoc(doc(db, 'pharmacists', user.uid), savedUserData);
          console.log(`✅ Pharmacist saved to pharmacists collection with ID: ${pharmacistId}`);
          break;

        case 'admin':
          // Save to admins collection
          const adminId = await generateNextId('admins', 'A');
          savedUserData = {
            adminId: adminId,
            userId: user.uid,
            fullName: fullName,
            email: email,
            phone: phone || '',
            role: 'admin',
            permissions: ['all'],
            status: 'active',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };
          await setDoc(doc(db, 'admins', user.uid), savedUserData);
          console.log(`✅ Admin saved to admins collection with ID: ${adminId}`);
          break;

        default:
          throw new Error('Invalid role specified');
      }

      // 3. Store user info in sessionStorage (tab-specific)
      sessionStorage.setItem('userId', user.uid);
      sessionStorage.setItem('userRole', role);
      sessionStorage.setItem('userName', fullName);
      sessionStorage.setItem('userEmail', email);

      // Set states
      setUserRole(role);

      // Return user data with role
      return { 
        success: true, 
        user: {
          uid: user.uid,
          email: user.email,
          role: role,
          ...savedUserData
        }
      };
    } catch (error) {
      console.error('Registration error:', error);
      
      let message = 'Registration failed';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Email already registered';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address';
      }
      
      throw new Error(message);
    }
  };

  // Login user - REMOVED role validation to allow concurrent logins
  const login = async (email, password) => {
    try {
      // 1. Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      let userData = null;
      let actualRole = null;

      // 2. Search all collections to find user's actual role
      const roleCollections = {
        'supplier': 'suppliers',
        'customer': 'users',
        'pharmacist': 'pharmacists',
        'admin': 'admins'
      };

      // Search all collections to find the user
      for (const [role, collectionName] of Object.entries(roleCollections)) {
        const userDoc = await getDoc(doc(db, collectionName, user.uid));
        if (userDoc.exists()) {
          userData = userDoc.data();
          actualRole = userData.role;
          break;
        }
      }

      // If user data not found, throw error
      if (!userData) {
        await signOut(auth);
        throw new Error('User profile not found. Please contact administrator.');
      }

      // 3. Update last login
      const collectionName = roleCollections[actualRole];
      await setDoc(doc(db, collectionName, user.uid), {
        ...userData,
        lastLogin: Timestamp.now()
      }, { merge: true });

      // 4. Store user info in sessionStorage (tab-specific)
      sessionStorage.setItem('userId', user.uid);
      sessionStorage.setItem('userRole', actualRole);
      sessionStorage.setItem('userName', userData.fullName || userData.name);
      sessionStorage.setItem('userEmail', userData.email);

      setUserRole(actualRole);

      console.log(`✅ User logged in as ${actualRole} in this tab`);

      // 5. Return user data with role
      return { 
        success: true, 
        user: {
          uid: user.uid,
          email: user.email,
          role: actualRole,
          ...userData
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      
      let message = 'Login failed';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = 'Invalid email or password';
      } else if (error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password';
      } else if (error.message.includes('not found')) {
        message = error.message;
      }
      
      throw new Error(message);
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
      console.error('Logout error:', error);
      throw new Error('Logout failed');
    }
  };

  // Get current user's full data
  const getCurrentUserData = async () => {
    if (!currentUser) return null;

    try {
      // Try to get from appropriate collection based on role
      const role = sessionStorage.getItem('userRole');
      let collectionName;
      
      switch(role) {
        case 'supplier': collectionName = 'suppliers'; break;
        case 'customer': collectionName = 'users'; break;
        case 'pharmacist': collectionName = 'pharmacists'; break;
        case 'admin': collectionName = 'admins'; break;
        default: return null;
      }

      const userDoc = await getDoc(doc(db, collectionName, currentUser.uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Get supplier profile for current user
  const getSupplierProfile = async () => {
    if (!currentUser || userRole !== 'supplier') return null;

    try {
      const supplierDoc = await getDoc(doc(db, 'suppliers', currentUser.uid));
      if (supplierDoc.exists()) {
        return { id: supplierDoc.id, ...supplierDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching supplier profile:', error);
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
        const storedRole = sessionStorage.getItem('userRole');
        
        if (storedRole) {
          // Use the stored role for this tab
          setUserRole(storedRole);
          setLoading(false);
          return;
        }
        
        // If no stored role, fetch from database
        try {
          // Try suppliers first
          let userDoc = await getDoc(doc(db, 'suppliers', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role);
            sessionStorage.setItem('userId', currentUser.uid);
            sessionStorage.setItem('userRole', userData.role);
            sessionStorage.setItem('userName', userData.name);
            sessionStorage.setItem('userEmail', userData.email);
            setLoading(false);
            return;
          }

          // Try pharmacists
          userDoc = await getDoc(doc(db, 'pharmacists', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role);
            sessionStorage.setItem('userId', currentUser.uid);
            sessionStorage.setItem('userRole', userData.role);
            sessionStorage.setItem('userName', userData.name);
            sessionStorage.setItem('userEmail', userData.email);
            setLoading(false);
            return;
          }

          // Try admins
          userDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role);
            sessionStorage.setItem('userId', currentUser.uid);
            sessionStorage.setItem('userRole', userData.role);
            sessionStorage.setItem('userName', userData.fullName);
            sessionStorage.setItem('userEmail', userData.email);
            setLoading(false);
            return;
          }

          // Try users (for customers)
          userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role);
            sessionStorage.setItem('userId', currentUser.uid);
            sessionStorage.setItem('userRole', userData.role);
            sessionStorage.setItem('userName', userData.fullName);
            sessionStorage.setItem('userEmail', userData.email);
            setLoading(false);
            return;
          }

          console.error('User data not found in any collection');
        } catch (error) {
          console.error('Error fetching user role:', error);
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
    getCurrentUserData,
    getSupplierProfile
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
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}