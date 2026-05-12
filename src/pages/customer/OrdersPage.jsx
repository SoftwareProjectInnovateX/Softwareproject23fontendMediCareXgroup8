import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
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
  const [activeTab, setActiveTab]         = useState('orders');

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
    // GET /api/customer-orders  → authenticated requests only return the current user's orders
    const fetchOrders = async () => {
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch(API_BASE, {
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
    // exists yet. We only subscribe to prescriptions that belong to the current user.
    if (!currentUser?.uid) {
      setPrescriptions([]);
      setLoading(false);
      return;
    }

    const localKey = `my_prescriptions_${currentUser.uid}`;
    const qPres = query(
      collection(db, 'prescriptions'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

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
     
      const localIds = JSON.parse(localStorage.getItem(localKey) || '[]');

      const filtered = all.filter(p => {
        if (currentUser?.uid && p.userId === currentUser.uid) return true;
        if (localIds.includes(p.id)) return true;
        return false;
      });

      setPrescriptions(filtered);
    });

    // Clean up Firestore listener on unmount or when currentUser changes
    return () => { unsubPres(); };
  }, [currentUser]);

  // Build a Set of prescription IDs for O(1) lookup during deduplication below
  const prescriptionIds = new Set(prescriptions.map(p => p.id));

  // Only show regular orders that are not already represented by a prescription flow.
  const visibleOrders = orders.filter((item) => {
    if (item.rxId && prescriptionIds.has(item.rxId)) return false;
    return true;
  });

  const summary = {
    totalOrders: visibleOrders.length,
    activeOrders: visibleOrders.filter((o) => !['Delivered', 'Cancelled'].includes(o.orderStatus)).length,
    totalPrescriptions: prescriptions.length,
    pendingPrescriptions: prescriptions.filter((p) => p.orderStatus === 'Pending').length,
    approvedPrescriptions: prescriptions.filter((p) => p.orderStatus === 'Approved').length,
  };


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
        title="My Orders & Prescriptions"
        subtitle="A polished customer dashboard for managing cart orders and prescriptions together."
      >
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate(ROUTES.CUSTOMER_PRESCRIPTION)}
            className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wider px-[22px] py-[11px] rounded-[12px] bg-white border-none cursor-pointer hover:scale-105 transition-all"
            style={{ color: C.accent, boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)' }}
          >
            <Upload size={14} /> Upload Prescription
          </button>
          <button
            onClick={() => navigate(ROUTES.CUSTOMER_PRESCRIPTION)}
            className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wider px-[22px] py-[11px] rounded-[12px] text-white cursor-pointer hover:scale-105 transition-all"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)' }}
          >
            <ClipboardList size={14} /> View Prescription History
          </button>
        </div>
      </PageBanner>

      <div className="max-w-[1140px] mx-auto px-6 py-9 space-y-8">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[28px] bg-white p-6 shadow-soft border border-slate-200">
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Dashboard</p>
              <h2 className="text-3xl font-black text-slate-900">Everything in one place</h2>
              <p className="max-w-2xl text-sm text-slate-500">
                Browse active orders and prescription requests in separate sections so you can manage your cart and medical authorizations faster.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Cart orders</p>
                <p className="mt-3 text-3xl font-extrabold text-slate-900">{summary.totalOrders}</p>
                <p className="mt-2 text-sm text-slate-600">Orders created through your cart and checkout flow.</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Prescription requests</p>
                <p className="mt-3 text-3xl font-extrabold text-slate-900">{summary.totalPrescriptions}</p>
                <p className="mt-2 text-sm text-slate-600">Uploaded prescription requests pending pharmacist review.</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Pending review</p>
                <p className="mt-3 text-3xl font-extrabold text-slate-900">{summary.pendingPrescriptions}</p>
                <p className="mt-2 text-sm text-slate-600">Prescriptions awaiting approval.</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">In progress</p>
                <p className="mt-3 text-3xl font-extrabold text-slate-900">{summary.activeOrders}</p>
                <p className="mt-2 text-sm text-slate-600">Orders currently being prepared or shipped.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] bg-gradient-to-br from-blue-900 via-blue-800 to-sky-700 p-6 text-white shadow-lg">
            <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Quick actions</p>
            <h3 className="mt-4 text-2xl font-black">Manage orders faster</h3>
            <p className="mt-3 text-sm text-blue-100">Use these shortcuts for instant order, prescription, and tracking actions.</p>
            <div className="mt-6 grid gap-3">
              <button
                onClick={() => navigate(ROUTES.CUSTOMER_PRESCRIPTION)}
                className="flex items-center justify-between gap-2 rounded-[18px] bg-white/15 px-5 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-white/25"
              >
                <span>Upload prescription</span>
                <Upload size={16} />
              </button>
              <button
                onClick={() => {
                  setActiveTab('orders');
                  document.getElementById('order-tab-panel')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center justify-between gap-2 rounded-[18px] bg-sky-500/20 px-5 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-white border border-white/15 transition hover:bg-sky-500/35"
              >
                <span>Review cart orders</span>
                <ShoppingCart size={16} />
              </button>
              <button
                onClick={() => {
                  setActiveTab('prescriptions');
                  document.getElementById('order-tab-panel')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center justify-between gap-2 rounded-[18px] bg-white/15 px-5 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-white/25"
              >
                <span>Browse prescriptions</span>
                <ClipboardList size={16} />
              </button>
              <button
                onClick={() => {
                  setActiveTab('orders');
                  document.getElementById('order-tab-panel')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center justify-between gap-2 rounded-[18px] bg-sky-500/20 px-5 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-white border border-white/15 transition hover:bg-sky-500/35"
              >
                <span>Track active orders</span>
                <Clock size={16} />
              </button>
            </div>
          </div>
        </section>

        <section id="order-tab-panel" className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] bg-white p-6 shadow-soft border border-slate-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Order hub</p>
                  <h3 className="text-2xl font-black text-slate-900">Choose what to review</h3>
                </div>
                <div className="rounded-full bg-slate-100 p-1 inline-flex gap-2">
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === 'orders' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    Cart Orders
                  </button>
                  <button
                    onClick={() => setActiveTab('prescriptions')}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === 'prescriptions' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    Prescriptions
                  </button>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Use the tabs to focus on your current cart orders or review prescription history without clutter.
              </p>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-soft border border-slate-200">
              {activeTab === 'orders' ? (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Cart orders</p>
                      <h4 className="text-xl font-black text-slate-900">Your latest cart orders</h4>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-600">
                      {visibleOrders.length} items
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-slate-500">Orders not tied to prescriptions are shown here in a clean list for easy review.</p>

                  <div className="mt-6 space-y-5">
                    {visibleOrders.length === 0 ? (
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-8 text-center">
                        <ShoppingCart size={36} color="#cbd5e1" className="mx-auto mb-4" />
                        <p className="text-sm font-bold text-slate-700">No cart orders yet.</p>
                        <p className="mt-2 text-sm text-slate-500">Place a new order and it will appear here.</p>
                      </div>
                    ) : (
                      visibleOrders.map((item) => (
                        <OrderCard key={item.id} order={item} />
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Prescriptions</p>
                      <h4 className="text-xl font-black text-slate-900">Review your prescription history</h4>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-600">
                      {prescriptions.length} submitted
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-slate-500">Check recent prescription uploads, approval status, and payment steps from one place.</p>

                  <div className="mt-6 space-y-5">
                    {prescriptions.length === 0 ? (
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-8 text-center">
                        <ClipboardList size={36} color="#cbd5e1" className="mx-auto mb-4" />
                        <p className="text-sm font-bold text-slate-700">No prescriptions submitted.</p>
                        <p className="mt-2 text-sm text-slate-500">Upload a prescription to begin tracking it here.</p>
                      </div>
                    ) : (
                      prescriptions.map((item) => (
                        <OrderCard key={item.id} order={item} />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <aside className="space-y-6 self-start lg:sticky lg:top-28">
            <div className="rounded-[28px] bg-white p-6 shadow-soft border border-slate-200">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Summary</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Order progress</h3>
              <div className="mt-5 grid gap-3">
                <div className="rounded-[20px] bg-slate-50 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Orders in progress</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{summary.activeOrders}</p>
                </div>
                <div className="rounded-[20px] bg-slate-50 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Pending approval</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{summary.pendingPrescriptions}</p>
                </div>
                <div className="rounded-[20px] bg-slate-50 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Approved prescriptions</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{summary.approvedPrescriptions}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-soft border border-slate-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Quick review</p>
                  <h3 className="mt-2 text-xl font-black text-slate-900">Recent prescriptions</h3>
                </div>
                <button
                  onClick={() => setActiveTab('prescriptions')}
                  className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 hover:text-slate-900"
                >
                  View all
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {prescriptions.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 p-3 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-900">#{item.id.slice(-6)}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{item.orderStatus}</p>
                  </div>
                ))}
                {prescriptions.length === 0 && (
                  <p className="text-sm text-slate-500">No recent prescriptions yet. Upload one to review it here.</p>
                )}
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-soft border border-slate-200">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Tips</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Order smarter</h3>
              <ul className="mt-5 space-y-3 text-sm text-slate-600">
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-900" />
                  Keep your delivery details up to date for faster checkout.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-900" />
                  Upload clear prescriptions so pharmacist review is faster.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-900" />
                  Use status badges to know when payment or delivery is next.
                </li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}