import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Upload, ClipboardList } from 'lucide-react';

import { C, FONT }   from '../../components/profile/profileTheme';
import PageBanner     from '../../components/profile/PageBanner';
import OrderCard      from '../../components/orders/OrderCard';
import { ROUTES }     from '../../components/utils/constants';

// Base URL for all API calls — falls back to localhost in development
const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

export default function OrdersPage() {
  const [orders, setOrders]   = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate              = useNavigate();

  // Fetch orders and returns in parallel on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Both requests fire simultaneously for better performance
        const [ordersRes, returnsRes] = await Promise.all([
          fetch(`${API_BASE}/orders`),
          fetch(`${API_BASE}/returns`),  // ✅ fixed — was /orders/returns
        ]);

        if (!ordersRes.ok)  throw new Error('Failed to fetch orders');
        if (!returnsRes.ok) throw new Error('Failed to fetch returns');

        const orderData  = await ordersRes.json();
        const returnData = await returnsRes.json();

        setOrders(orderData);
        setReturns(returnData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Looks up a return document matching a given order ID
  const getReturnForOrder = (orderId) =>
    returns.find(r => r.orderId === orderId);

  // Show loading state while both fetches are in progress
  if (loading) return (
    <div
      className="flex justify-center items-center min-h-[60vh] text-[14px]"
      style={{ color: C.textMuted, fontFamily: FONT.body, background: C.bg }}
    >
      Loading orders…
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: FONT.body }}>

      {/* Page header banner with prescription action buttons */}
      <PageBanner
        title="My Orders"
        subtitle="View your order history, track deliveries, and manage returns."
      >
        <button
          onClick={() => navigate(ROUTES.CUSTOMER_PRESCRIPTION)}
          className="flex items-center gap-2 text-[13px] font-semibold px-[22px] py-[11px] rounded-[10px] border-none cursor-pointer"
          style={{ background: "var(--bg-secondary)", color: "var(--accent-blue)", fontFamily: FONT.body, boxShadow: C.btnShadow }}
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

      <div className="max-w-[1100px] mx-auto px-6 py-9">
        {/* Empty state when the customer has no orders yet */}
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
          /* Render each order card with its matching return doc if one exists */
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