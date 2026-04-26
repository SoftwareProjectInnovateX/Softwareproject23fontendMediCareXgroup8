import { db } from './src/lib/firebase.js';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

async function checkPrescription() {
  const q = query(collection(db, 'prescriptions'), where('status', '==', 'Approved'), orderBy('processedAt', 'desc'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) {
    console.log("No approved prescriptions found.");
    return;
  }
  const data = snap.docs[0].data();
  console.log("Last Approved Prescription:", JSON.stringify(data, null, 2));
}

checkPrescription();
