import {
  Phone, MapPin, Package, CreditCard,
  RotateCcw, CheckCircle, ChevronRight,
} from 'lucide-react';
import { C, FONT } from '../profile/profileTheme';
import { StatusBadge } from './orderStatusUtils';
import ReturnPanel from './ReturnPanel';
import Card from '../Card';

// Renders a single customer order as a styled card.
// Shows delivery info, ordered items, an optional return panel, and a footer
// with payment details and a return-request button for eligible orders.
export default function OrderCard({ order, returnDoc, onReturnClick }) {
  // Whether this order has an associated return request
  const hasReturn = !!returnDoc;

  // Cash-on-delivery orders are the only type eligible for returns
  const isCOD = (order.paymentMethod || '').toLowerCase() === 'cod';

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
            <p className="text-[15px] mb-[3px]" style={{ color: C.textMuted }}>
              {/* Show only the first 8 characters of the order ID to keep it compact */}
              Order <span className="font-bold text-[16px]" style={{ color: C.textPrimary }}>#{order.id.slice(0, 8)}&hellip;</span>
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

      {/* ── Order items list with thumbnail, name, code, quantity, and unit price ── */}
      {order.types && order.types.length > 0 && (
        <div className="py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
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

      {/* Return details panel — only rendered when a return document is linked */}
      {hasReturn && <ReturnPanel returnDoc={returnDoc} />}

      {/* ── Card footer: payment info and conditional action buttons ── */}
      <div className="flex justify-between items-center flex-wrap gap-2 pt-4">
        {/* Payment method and payment status */}
        <div className="flex gap-2.5 items-center">
          <CreditCard size={15} color={C.textMuted} />
          <span className="text-[13px] font-bold uppercase tracking-[0.04em]" style={{ color: C.textSoft }}>
            {order.paymentMethod || '—'}
          </span>
          {/* Payment status badge — green for paid, amber for pending */}
          <span
            className="text-[11px] font-bold px-3 py-1 rounded-xl uppercase tracking-[0.06em]"
            style={{
              background: order.paymentStatus === 'paid' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(217, 119, 6, 0.1)',
              color:      order.paymentStatus === 'paid' ? '#16a34a' : '#d97706',
              border:     order.paymentStatus === 'paid' ? '1px solid rgba(22, 163, 74, 0.3)' : '1px solid rgba(217, 119, 6, 0.3)',
            }}
          >
            {order.paymentStatus || 'pending'}
          </span>
        </div>

        {/* Return button — only shown for delivered COD orders without an existing return */}
        {order.orderStatus === 'delivered' && !hasReturn && isCOD && (
          <button
            onClick={onReturnClick}
            className="flex items-center gap-[6px] text-[12px] font-semibold px-[18px] py-[9px] rounded-[10px] cursor-pointer"
            style={{ background: "rgba(234, 88, 12, 0.1)", color: '#ea580c', border: '1.5px solid rgba(234, 88, 12, 0.3)', fontFamily: FONT.body }}
          >
            <RotateCcw size={14} /> Return Items <ChevronRight size={13} />
          </button>
        )}

        {/* Confirmation badge — shown once a return has been submitted */}
        {hasReturn && (
          <span
            className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-xl"
            style={{ background: C.accentFaint, color: C.accent, border: `1px solid ${C.border}` }}
          >
            <CheckCircle size={14} /> Return Requested
          </span>
        )}
      </div>
    </Card>
  );
}