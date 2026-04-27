import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Upload, ClipboardList, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import { C, FONT }   from '../../components/profile/profileTheme';
import PageBanner     from '../../components/profile/PageBanner';
import OrderCard      from '../../components/orders/OrderCard';
import { ROUTES }     from '../../components/utils/constants';


// Base URL for the NestJS customer-orders API
const API_BASE = 'http://localhost:5000/api/customer-orders';

// Firestore collection name constants used across this page
const COLLECTIONS = {
  CUSTOMER_ORDERS: 'CustomerOrders',
};




// Regular orders that are already represented by a linked prescription card are hidden.

export default function OrdersPage() {
  const { currentUser } = useAuth();

  // Holds regular cart orders fetched from the NestJS backend
  const [orders, setOrders]               = useState([]);

  // Holds prescription orders fetched from Firestore and filtered to this user
  const [prescriptions, setPrescriptions] = useState([]);

  // Controls the full-page loading spinner shown while initial data is fetching
  const [loading, setLoading]             = useState(true);

  const navigate = useNavigate();

 
  // Set up data fetching when the component mounts or when currentUser changes.
  // - CustomerOrders: fetched via NestJS backend API (secure, server-side filtered)
  // - Prescriptions: still uses Firestore onSnapshot for real-time updates
  //   (backend endpoint for prescriptions not yet available)

  useEffect(() => {
    // If no authenticated user is present, skip fetching and exit loading state
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    let unsubPres = () => {};

    // ── CustomerOrders via NestJS backend ─────────────────────────────────
    // GET /api/customer-orders?userId=xxx  → server-side filters by userId
    const fetchOrders = async () => {
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE}?userId=${currentUser.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        // Tag every item so downstream logic can distinguish order types
        const tagged = data.map(d => ({
          ...d,
          type: 'regular',
          // Fall back to 'pending' if orderStatus is not set on the document
          orderStatus: d.orderStatus || 'pending',
        }));

        setOrders(tagged);

      } catch (err) {
        console.error('Failed to fetch orders from backend:', err);
      } finally {
        setLoading(false); // Data has arrived (or failed); hide the loading spinner
      }
    };

    fetchOrders();

    // ── Prescriptions via Firestore onSnapshot ────────────────────────────
    // Real-time listener kept here because no backend prescription endpoint
    // exists yet. Client-side ownership filtering is applied as a fallback.
    // TODO: move to backend once prescription API is available.
    const qPres = query(collection(db, 'prescriptions'), orderBy('createdAt', 'desc'));

    unsubPres = onSnapshot(qPres, (snap) => {
      // Normalize each prescription document into a shape compatible with OrderCard
      const all = snap.docs.map(d => {
        const p = d.data();
        return {
          id: d.id,
          ...p,
          // Tag as prescription so it renders differently from regular orders
          type: 'prescription',

          // Display fallbacks for missing customer info
          customerName:  p.customerName || 'Prescription Upload',
          phone:         p.customerPhone,
          address:       p.customerAddress,

          // Normalize status field — prescriptions use 'status', orders use 'orderStatus'
          orderStatus:   p.status || 'Pending',

          // Show 'Pharmacy Quote' if medication list is populated, otherwise pending
          paymentMethod: p.medications?.length > 0 ? 'Pharmacy Quote' : 'Pending Review',

          // Derive payment status from the prescription's overall status field
          paymentStatus: p.status === 'Paid' ? 'paid' : 'pending',

          // Map medication/order items to a consistent shape that OrderCard expects
          types: (p.medications || p.orderItems || []).map(m => ({
            name:     m.name,
            quantity: m.qty,
            price:    m.price,
            id:       'RX-ITEM', // Static placeholder ID for prescription line items
          })),

          createdAt: p.createdAt,
        };
      });

      // ── Client-side ownership filtering ──────────────────────────────────
      // Prescriptions are matched to the current user via three fallback strategies:
     
      const localIds = JSON.parse(localStorage.getItem('my_prescriptions') || '[]');

      const filtered = all.filter(p => {
        if (currentUser?.uid && p.userId === currentUser.uid) return true;        // Strategy a
        if (localIds.includes(p.id)) return true;                                 // Strategy b
        if (currentUser?.phoneNumber && p.customerPhone === currentUser.phoneNumber) return true; // Strategy c
        return false;
      });

      setPrescriptions(filtered);
    });

    // Clean up Firestore listener on unmount or when currentUser changes
    return () => { unsubPres(); };
  }, [currentUser]);

  // Build a Set of prescription IDs for O(1) lookup during deduplication below

  const prescriptionIds = new Set(prescriptions.map(p => p.id));

 
  // Merge regular orders and prescriptions into a single unified list:
  //   - Regular orders that are linked to a prescription (via rxId) are excluded
  
  //   - The merged list is sorted by 'createdAt' descending (newest first).
 
 
  const allItems = [...orders, ...prescriptions]
    .filter((item) => {
      if (item.type === 'regular') {
        // Hide regular orders that are already covered by a prescription card
        if (item.rxId && prescriptionIds.has(item.rxId)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = a.createdAt?.seconds || a.createdAt?._seconds || 0;
      const timeB = b.createdAt?.seconds || b.createdAt?._seconds || 0;
      return timeB - timeA; // Descending: most recent first
    });


  // Loading state — shown while data is being fetched on first render

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh] text-[14px]" style={{ color: C.textMuted, background: C.bg }}>
      <div className="flex flex-col items-center gap-4">
        <Clock className="animate-spin text-blue-500" size={32} />
        <span className="font-bold uppercase tracking-widest text-[10px]">Syncing Live Data...</span>
      </div>
    </div>
  );


  // Main render
  
  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: FONT.body }}>

      {/* ── Page Header Banner 
          Displays the page title, subtitle, and quick-action buttons for
          uploading a new prescription or viewing prescription history.
       */}
      <PageBanner
        title="My Orders & Activity"
        subtitle="Track your regular orders and prescription approvals in real-time."
      >
        <div className="flex gap-3">
          {/* Navigate to the prescription upload page */}
          <button
            onClick={() => navigate(ROUTES.CUSTOMER_PRESCRIPTION)}
            className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wider px-[22px] py-[11px] rounded-[12px] bg-white border-none cursor-pointer hover:scale-105 transition-all"
            style={{ color: C.accent, boxShadow: "0 10px 20px -5px rgba(0,0,0,0.1)" }}
          >
            <Upload size={14} /> Upload Prescription
          </button>

          {/* Navigate to the prescription history / list page */}
          <button
            onClick={() => navigate(ROUTES.CUSTOMER_PRESCRIPTION)}
            className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wider px-[22px] py-[11px] rounded-[12px] text-white cursor-pointer hover:scale-105 transition-all"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(10px)" }}
          >
            <ClipboardList size={14} /> View History
          </button>
        </div>
      </PageBanner>

      <div className="max-w-[860px] mx-auto px-6 py-9">

        {allItems.length === 0 ? (
          /* ── Empty State ──────────────────────────────────────────────────
             Shown when the user has no orders or prescriptions on record yet.*/
          <div className="rounded-[32px] py-[80px] text-center bg-white border border-slate-200 shadow-sm">
            <ShoppingCart size={48} color="#e2e8f0" className="mx-auto mb-4" />
            <p className="text-lg font-black text-slate-800 uppercase tracking-widest">No Activity Yet</p>
            <p className="text-[12px] mt-2 text-slate-400 font-medium">Your orders and prescriptions will appear here.</p>
          </div>
        ) : (
          /* Renders each merged order/prescription item as an OrderCard.
             The key prop uses the Firestore document ID which is unique
             across both collections. */
          <div className="flex flex-col gap-6">
            {allItems.map(item => (
              <OrderCard
                key={item.id}
                order={item}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}