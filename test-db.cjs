const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'fake',
  projectId: 'medicarex-810a9'
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  const snap = await getDocs(query(collection(db, 'products'), limit(1)));
  console.log(snap.docs[0].data());
}
test();
