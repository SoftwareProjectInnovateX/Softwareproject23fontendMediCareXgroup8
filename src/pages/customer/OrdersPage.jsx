import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Upload, ClipboardList } from 'lucide-react';

import { C, FONT }   from '../../components/profile/profileTheme';
import PageBanner     from '../../components/profile/PageBanner';
import OrderCard      from '../../components/orders/OrderCard';
import { ROUTES, COLLECTIONS } from '../../components/utils/constants';

export default function OrdersPage() {
  const [orders, setOrders]   = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate              = useNavigate();

  // ── fetchData ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const orderSnap = await getDocs(collection(db, COLLECTIONS.CUSTOMER_ORDERS));
        const orderData = orderSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        orderData.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setOrders(orderData);

        const returnSnap = await getDocs(collection(db, COLLECTIONS.CUSTOMER_RETURNS));
        const returnData = returnSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setReturns(returnData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── getReturnForOrder ──────────────────────────────────────────────────────
  const getReturnForOrder = (orderId) =>
    returns.find(r => r.orderId === orderId);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return (
    <div
      className="flex justify-center items-center min-h-[60vh] text-[14px]"
      style={{ color: C.textMuted, fontFamily: FONT.body, background: C.bg }}
    >
      Loading orders…
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: FONT.body }}>

      <PageBanner
        title="My Orders"
        subtitle="View your order history, track deliveries, and manage returns."
      >
        <button
          onClick={() => navigate(ROUTES.CUSTOMER_PRESCRIPTION)}
          className="flex items-center gap-2 text-[13px] font-semibold px-[22px] py-[11px] rounded-[10px] bg-white border-none cursor-pointer"
          style={{ color: C.accent, fontFamily: FONT.body, boxShadow: C.btnShadow }}
        >
          <Upload size={15} /> Upload Prescription
        </button>
        <button
          onClick={() => navigate(ROUTES.CUSTOMER_PRESCRIPTION)}
          className="flex items-center gap-2 text-[13px] font-semibold px-[22px] py-[11px] rounded-[10px] text-white cursor-pointer"
          style={{ background: C.bannerBtnBg, border: `1px solid ${C.bannerBtnBorder}`, fontFamily: FONT.body }}
        >
          <ClipboardList size={15} /> View Prescription History
        </button>
      </PageBanner>

      <div className="max-w-[860px] mx-auto px-6 py-9">

        {/* Empty state */}
        {orders.length === 0 ? (
          <div
            className="rounded-2xl py-[72px] text-center"
            style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: C.cardShadow }}
          >
            <ShoppingCart size={42} color={C.textMuted} className="mx-auto mb-[14px]" />
            <p className="text-[16px] font-bold" style={{ color: C.textSoft }}>No orders yet.</p>
            <p className="text-[13px] mt-[6px]" style={{ color: C.textMuted }}>
              Your orders will appear here once placed.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                returnDoc={getReturnForOrder(order.id)}
                onReturnClick={() => navigate(ROUTES.CUSTOMER_RETURNS, { state: { orderId: order.id, order } })}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}