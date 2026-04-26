import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Upload, ClipboardList, Clock, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import { C, FONT }   from '../../components/profile/profileTheme';
import PageBanner     from '../../components/profile/PageBanner';
import OrderCard      from '../../components/orders/OrderCard';
import { ROUTES, COLLECTIONS } from '../../components/utils/constants';

export default function OrdersPage() {
  const { currentUser } = useAuth();
  const [orders, setOrders]   = useState([]);
  const [returns, setReturns] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate              = useNavigate();

  // ── Real-time Data Listeners ────────────────────────────────────────────────
  useEffect(() => {
    // 1. Regular Orders Listener
    const qOrders = query(collection(db, COLLECTIONS.CUSTOMER_ORDERS), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data(), type: 'regular', orderStatus: d.data().orderStatus || 'pending' }));
      setOrders(data);
      setLoading(false);
    });

    // 2. Returns Listener
    const unsubReturns = onSnapshot(collection(db, COLLECTIONS.CUSTOMER_RETURNS), (snap) => {
      setReturns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Prescriptions Listener
    const qPres = query(collection(db, 'prescriptions'), orderBy('createdAt', 'desc'));
    const unsubPres = onSnapshot(qPres, (snap) => {
      const all = snap.docs.map(d => {
        const p = d.data();
        // Map Prescription to Order format for unified UI
        return {
          id: d.id,
          ...p,
          type: 'prescription',
          customerName: p.customerName || 'Prescription Upload',
          phone: p.customerPhone,
          address: p.customerAddress,
          orderStatus: p.status || 'Pending',
          paymentMethod: p.medications?.length > 0 ? 'Pharmacy Quote' : 'Pending Review',
          paymentStatus: p.status === 'Paid' ? 'paid' : 'pending',
          types: (p.medications || p.orderItems || []).map(m => ({
            name: m.name,
            quantity: m.qty,
            price: m.price,
            id: 'RX-ITEM'
          })),
          createdAt: p.createdAt
        };
      });

      const localIds = JSON.parse(localStorage.getItem('my_prescriptions') || '[]');
      const filtered = all.filter(p => {
        if (currentUser?.uid && p.userId === currentUser.uid) return true;
        if (localIds.includes(p.id)) return true;
        if (currentUser?.phoneNumber && p.customerPhone === currentUser.phoneNumber) return true;
        return false;
      });
      setPrescriptions(filtered);
    });

    return () => { unsubOrders(); unsubReturns(); unsubPres(); };
  }, [currentUser]);

  // Combine and sort all types, but filter out regular orders that are actually the same as prescriptions
  const allItems = [...orders, ...prescriptions]
    .filter((item, index, self) => {
      // If it's a regular order, check if there's a prescription with the same phone and roughly the same time or ID
      if (item.type === 'regular') {
        const hasDuplicatePres = self.some(p => 
          p.type === 'prescription' && 
          (p.id === item.rxId || (p.phone === item.phone && Math.abs((p.createdAt?.seconds || 0) - (item.createdAt?.seconds || 0)) < 3600))
        );
        return !hasDuplicatePres;
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

  const getReturnForOrder = (orderId) => returns.find(r => r.orderId === orderId);

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh] text-[14px]" style={{ color: C.textMuted, background: C.bg }}>
      <div className="flex flex-col items-center gap-4">
        <Clock className="animate-spin text-blue-500" size={32} />
        <span className="font-bold uppercase tracking-widest text-[10px]">Syncing Live Data...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: FONT.body }}>
      <PageBanner
        title="My Orders & Activity"
        subtitle="Track your regular orders and prescription approvals in real-time."
      >
        <div className="flex gap-3">
          <button
            onClick={() => navigate(ROUTES.CUSTOMER_PRESCRIPTION)}
            className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wider px-[22px] py-[11px] rounded-[12px] bg-white border-none cursor-pointer hover:scale-105 transition-all"
            style={{ color: C.accent, boxShadow: "0 10px 20px -5px rgba(0,0,0,0.1)" }}
          >
            <Upload size={14} /> Upload Prescription
          </button>
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
          <div className="rounded-[32px] py-[80px] text-center bg-white border border-slate-200 shadow-sm">
            <ShoppingCart size={48} color="#e2e8f0" className="mx-auto mb-4" />
            <p className="text-lg font-black text-slate-800 uppercase tracking-widest">No Activity Yet</p>
            <p className="text-[12px] mt-2 text-slate-400 font-medium">Your orders and prescriptions will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {allItems.map(item => (
              <OrderCard
                key={item.id}
                order={item}
                returnDoc={getReturnForOrder(item.id)}
                onReturnClick={item.type === 'regular' ? () => navigate(ROUTES.CUSTOMER_RETURNS, { state: { orderId: item.id, order: item } }) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}