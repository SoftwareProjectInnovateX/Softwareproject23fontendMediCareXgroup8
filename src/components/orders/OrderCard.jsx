import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, MapPin, Package, CreditCard,
  CheckCircle, ChevronRight,
  Truck, Receipt, Clock, ShoppingCart
} from 'lucide-react';
import { C, FONT } from '../profile/profileTheme';
import { StatusBadge } from './orderStatusUtils';
import Card from '../Card';

// Renders a single customer order as a styled card.
// Shows delivery info, ordered items, and a footer
// with payment details.
export default function OrderCard({ order }) {
  const [showBill, setShowBill] = useState(false);
  const navigate = useNavigate();

  // Cash-on-delivery orders
  const isCOD = (order.paymentMethod || '').toLowerCase() === 'cod';

  const handleGoToCheckout = () => {
    // Redirect to the main checkout page with prescription details
    const amount = order.total || order.totalAmount || 0;
    const nameParts = (order.customerName || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const params = new URLSearchParams({
      rxId: order.id,
      amount: amount.toString(),
      fname: firstName,
      lname: lastName,
      phone: order.phone,
      addr: order.address || '',
      items: (order.types || []).map(m => m.name).join(', ')
    });

    navigate(`/customer/checkout?${params.toString()}`);
  };

  // Convert Firestore Timestamp to a readable date string
  const createdAt = order.createdAt?.toDate
    ? order.createdAt.toDate().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

  return (
    <Card
      header={
        // Card header: truncated order ID, creation date, and status badge
        <div
          className="flex justify-between items-center flex-wrap gap-2 px-6 py-4 -mx-6 -mt-5 mb-3"
          style={{ background: C.accentFaint, borderBottom: `1px solid ${C.border}` }}
        >
          <div>
            <p className="text-[13px] mb-[2px]" style={{ color: C.textMuted }}>
              {order.type === 'prescription' ? 'Prescription' : 'Order'}{' '}
              <span className="font-bold" style={{ color: C.textPrimary }}>
                #{order.id.slice(0, 8)}&hellip;
              </span>
            </p>
            <p className="text-[13px]" style={{ color: C.textMuted }}>{createdAt}</p>
          </div>
          <StatusBadge status={order.orderStatus} />
        </div>
      }
    >
      {/* ── Delivery details: customer name, phone, and address ── */}
      <div className="flex flex-col gap-2 pb-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-[17px] font-bold" style={{ color: C.textPrimary }}>{order.customerName}</p>
        <div className="flex gap-5 flex-wrap">
          <span className="flex items-center gap-2 text-[13px]" style={{ color: C.textMuted }}>
            <Phone size={14} color={C.accent} /> {order.phone}
          </span>
          <span className="flex items-center gap-2 text-[13px]" style={{ color: C.textMuted }}>
            <MapPin size={14} color={C.accent} /> {order.address}
          </span>
        </div>
      </div>

      {/* Items Section (Hidden if expanded bill is shown to reduce clutter) */}
      {!showBill && order.types && order.types.length > 0 && (
        <div className="py-[14px]" style={{ borderBottom: `1px solid ${C.border}` }}>
          <p
            className="text-[12px] font-bold uppercase tracking-[0.08em] mb-3 flex items-center gap-2"
            style={{ color: C.textMuted }}
          >
            <Package size={13} color={C.accent} /> Items
          </p>
          <div className="flex flex-col gap-2.5">
            {order.types.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl px-4 py-3"
                style={{ background: C.accentFaint, border: `1px solid ${C.border}` }}
              >
                {/* Product thumbnail — falls back to a Package icon if no image */}
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover"
                    style={{ border: `1px solid ${C.border}` }} />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(26,135,225,0.08)' }}>
                    <Package size={22} color={C.accent} />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-[15px] font-bold" style={{ color: C.textPrimary }}>{item.name}</p>
                  <p className="text-[12px] mt-[3px]" style={{ color: C.textMuted }}>Code: {item.id}</p>
                </div>
                <div className="text-right">
                  {/* Quantity badge */}
                  {item.quantity && (
                    <p className="text-[13px] font-bold px-2.5 py-1 rounded-lg inline-block"
                      style={{ color: C.accent, background: 'rgba(26,135,225,0.1)' }}>
                      x{item.quantity}
                    </p>
                  )}
                  {/* Unit price */}
                  {item.price && (
                    <p className="text-[12px] mt-1 font-semibold" style={{ color: C.textMuted }}>Rs. {item.price}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prescription-specific Detailed Status Blocks (Dynamic) */}
      {order.type === 'prescription' && (
        <div className="mt-4 px-1 pb-2">
          {order.orderStatus === 'Pending' && (
            <div className="p-3 rounded-xl flex items-center gap-3 animate-pulse" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <Clock className="text-amber-500" size={18} />
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#d97706' }}>Pending Verification</p>
                <p className="text-[9px] font-bold" style={{ color: '#b45309' }}>Pharmacist is reviewing your prescription...</p>
              </div>
            </div>
          )}

          {order.orderStatus === 'Approved' && !showBill && (
            <div
              className="p-4 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-100 flex items-center justify-between group cursor-pointer"
              onClick={() => setShowBill(true)}
            >
              <div className="flex items-center gap-3">
                <Receipt size={20} className="text-blue-100" />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em]">Bill Ready</p>
                  <p className="text-[10px] text-blue-100 font-bold">View invoice and proceed to payment</p>
                </div>
              </div>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          )}

          {showBill && order.orderStatus === 'Approved' && (
            <div className="p-5 rounded-2xl animate-in fade-in slide-in-from-top-2" style={{ background: C.bg, border: `2px solid ${C.border}` }}>
              <div className="flex items-center justify-between mb-4 pb-2" style={{ borderBottom: `1px solid ${C.border}` }}>
                <h4 className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2" style={{ color: C.textPrimary }}>
                  <Receipt size={14} color={C.accent} /> Digital Invoice
                </h4>
                <button onClick={() => setShowBill(false)} className="text-[10px] font-bold border-none cursor-pointer bg-transparent" style={{ color: C.textMuted }}>
                  Close
                </button>
              </div>

              <div className="space-y-2 mb-4">
                {(order.types || []).map((m, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="font-bold" style={{ color: C.textPrimary }}>
                      {m.name} <span className="text-[9px] font-medium" style={{ color: C.textMuted }}>x {m.quantity}</span>
                    </span>
                    <span className="font-black" style={{ color: C.textPrimary }}>Rs. {(m.quantity * m.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 mb-6" style={{ borderTop: `2px dashed ${C.border}` }}>
                <span className="text-[10px] font-black uppercase" style={{ color: C.textMuted }}>Total Amount</span>
                <span className="text-lg font-black" style={{ color: C.accent }}>Rs. {(order.total || 0).toFixed(2)}</span>
              </div>

              <button
                onClick={handleGoToCheckout}
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all border-none cursor-pointer"
              >
                <ShoppingCart size={16} /> Confirm & Pay Now
              </button>
            </div>
          )}

          {order.orderStatus === 'Packing' && (
            <div className="p-3 rounded-xl flex items-center gap-3 animate-pulse" style={{ background: 'rgba(37,99,235,0.08)', border: '2px solid rgba(37,99,235,0.2)' }}>
              <Package color={C.accent} size={18} />
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.accent }}>Medications Packing</p>
                <p className="text-[9px] font-bold" style={{ color: C.accentMid }}>Your order is being prepared for delivery.</p>
              </div>
            </div>
          )}

          {(order.orderStatus === 'Paid' || order.orderStatus === 'Ready to Collect') && (
            <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-lg flex items-center gap-3">
              <CheckCircle size={18} />
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest">Payment Confirmed</p>
                <p className="text-[9px] text-emerald-100 font-bold">Pharmacist is preparing your dispensed items.</p>
              </div>
            </div>
          )}

          {order.orderStatus === 'Out for Delivery' && (
            <div className="p-3 rounded-xl bg-blue-600 text-white shadow-lg flex items-center gap-3 animate-pulse">
              <Truck size={20} />
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest">Out for Delivery</p>
                <p className="text-[9px] text-blue-100 font-bold">Our courier is on the way to your location.</p>
              </div>
            </div>
          )}

          {order.orderStatus === 'Delivered' && (
            <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(5,150,105,0.08)', border: '2px solid rgba(5,150,105,0.2)' }}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle size={20} color="#059669" />
                <span className="font-black uppercase tracking-[0.2em] text-[11px]" style={{ color: '#059669' }}>Delivered</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80" style={{ color: '#059669' }}>
                Medications received successfully
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Card footer: payment info ── */}
      <div className="flex justify-between items-center flex-wrap gap-2 pt-4">
        {/* Payment method and payment status */}
        <div className="flex gap-2.5 items-center">
          <CreditCard size={15} color={C.textMuted} />
          <span className="text-[13px] font-bold uppercase tracking-[0.04em]" style={{ color: C.textSoft }}>
            {order.paymentMethod || '—'}
          </span>
          {/* Payment status badge — green for paid, amber for pending */}
         
        </div>
      </div>
    </Card>
  );
}