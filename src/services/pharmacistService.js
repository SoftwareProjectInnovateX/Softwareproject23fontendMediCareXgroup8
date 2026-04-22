import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where, setDoc } from 'firebase/firestore';

const INVENTORY_COLLECTION = 'adminProducts';
const PATIENTS_COLLECTION = 'pharmacistPatients';
const PRESCRIPTIONS_COLLECTION = 'pharmacistPrescriptions';
const DISPENSED_COLLECTION = 'pharmacistDispensed';
const ONLINE_ORDERS_COLLECTION = 'CustomerOrders';
const PHARMACIST_PROFILES_COLLECTION = 'pharmacistProfiles';

/**
 * PHARMACIST PROFILE SERVICE
 */
export const getPharmacistProfile = async (pharmacistId = 'default_pharmacist') => {
  try {
    const querySnapshot = await getDocs(collection(db, PHARMACIST_PROFILES_COLLECTION));
    const profileDoc = querySnapshot.docs.find(d => d.id === pharmacistId);
    if (profileDoc) {
      return { id: profileDoc.id, ...profileDoc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching pharmacist profile:", error);
    throw error;
  }
};

export const updatePharmacistProfile = async (pharmacistId = 'default_pharmacist', updateData) => {
  try {
    const docRef = doc(db, PHARMACIST_PROFILES_COLLECTION, pharmacistId);
    await setDoc(docRef, updateData, { merge: true }); // setDoc with merge creates if it doesn't exist
    return { id: pharmacistId, ...updateData };
  } catch (error) {
    console.error("Error updating pharmacist profile:", error);
    throw error;
  }
};

/**
 * INVENTORY SERVICE
 */

export const getInventory = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching inventory:", error);
    throw error;
  }
};

export const addInventoryItem = async (itemData) => {
  try {
    const docRef = await addDoc(collection(db, INVENTORY_COLLECTION), itemData);
    return { id: docRef.id, ...itemData };
  } catch (error) {
    console.error("Error adding inventory item:", error);
    throw error;
  }
};

export const updateInventoryItem = async (id, updateData) => {
  try {
    const docRef = doc(db, INVENTORY_COLLECTION, id);
    await updateDoc(docRef, updateData);
    return { id, ...updateData };
  } catch (error) {
    console.error("Error updating inventory item:", error);
    throw error;
  }
};

export const deleteInventoryItem = async (id) => {
  try {
    const docRef = doc(db, INVENTORY_COLLECTION, id);
    await deleteDoc(docRef);
    return id;
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    throw error;
  }
};

/**
 * PATIENTS SERVICE
 */

export const getPatients = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, PATIENTS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching patients:", error);
    throw error;
  }
};

export const addPatient = async (patientData) => {
  try {
    const docRef = await addDoc(collection(db, PATIENTS_COLLECTION), patientData);
    return { id: docRef.id, ...patientData };
  } catch (error) {
    console.error("Error adding patient:", error);
    throw error;
  }
};

export const updatePatient = async (id, updateData) => {
  try {
    const docRef = doc(db, PATIENTS_COLLECTION, id);
    await updateDoc(docRef, updateData);
    return { id, ...updateData };
  } catch (error) {
    console.error("Error updating patient:", error);
    throw error;
  }
};

/**
 * PRESCRIPTIONS SERVICE
 */

export const getPrescriptions = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, PRESCRIPTIONS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    throw error;
  }
};

export const addPrescription = async (prescriptionData) => {
  try {
    const docRef = await addDoc(collection(db, PRESCRIPTIONS_COLLECTION), prescriptionData);
    return { id: docRef.id, ...prescriptionData };
  } catch (error) {
    console.error("Error adding prescription:", error);
    throw error;
  }
};

export const updatePrescription = async (id, updateData) => {
  try {
    const docRef = doc(db, PRESCRIPTIONS_COLLECTION, id);
    await updateDoc(docRef, updateData);
    return { id, ...updateData };
  } catch (error) {
    console.error("Error updating prescription:", error);
    throw error;
  }
};

/**
 * DISPENSING HISTORY SERVICE
 */

export const getDispensedHistory = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, DISPENSED_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching dispends history:", error);
    throw error;
  }
};

export const addDispensedRecord = async (dispenseData) => {
  try {
    const docRef = await addDoc(collection(db, DISPENSED_COLLECTION), dispenseData);
    return { id: docRef.id, ...dispenseData };
  } catch (error) {
    console.error("Error adding dispensed record:", error);
    throw error;
  }
};

export const updateDispensedRecord = async (id, updateData) => {
  try {
    const docRef = doc(db, DISPENSED_COLLECTION, id);
    await updateDoc(docRef, updateData);
    return { id, ...updateData };
  } catch (error) {
    console.error("Error updating dispensed record:", error);
    throw error;
  }
};

/**
 * ONLINE ORDERS SERVICE
 */

export const getOnlineOrders = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, ONLINE_ORDERS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching online orders:", error);
    throw error;
  }
};

export const addOnlineOrder = async (orderData) => {
  try {
    const docRef = await addDoc(collection(db, ONLINE_ORDERS_COLLECTION), orderData);
    return { id: docRef.id, ...orderData };
  } catch (error) {
    console.error("Error adding online order:", error);
    throw error;
  }
};

export const updateOnlineOrder = async (id, updateData) => {
  try {
    const docRef = doc(db, ONLINE_ORDERS_COLLECTION, id);
    await updateDoc(docRef, updateData);
    return { id, ...updateData };
  } catch (error) {
    console.error("Error updating online order:", error);
    throw error;
  }
};

/**
 * SYSTEM RESET UTILITY
 */
export const resetSystemData = async () => {
  try {
    // 1. Clear all prescriptions
    const rxSnapshot = await getDocs(collection(db, PRESCRIPTIONS_COLLECTION));
    for (const d of rxSnapshot.docs) {
       await deleteDoc(doc(db, PRESCRIPTIONS_COLLECTION, d.id));
    }
    
    // 2. Clear all dispensed history
    const dispSnapshot = await getDocs(collection(db, DISPENSED_COLLECTION));
    for (const d of dispSnapshot.docs) {
       await deleteDoc(doc(db, DISPENSED_COLLECTION, d.id));
    }
    
    // We intentionally leave Patients and Inventory intact, 
    // and let PharmacistPrescriptions auto-seed the mock queue on next load.
    
    return true;
  } catch (error) {
    console.error("Error resetting system data:", error);
    throw error;
  }
};

