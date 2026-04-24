import {
  Phone, MapPin, Package, CreditCard,
  RotateCcw, CheckCircle, ChevronRight,
} from 'lucide-react';
import { C, FONT } from '../profile/profileTheme';
import { StatusBadge } from './orderStatusUtils';
import ReturnPanel from './ReturnPanel';
import Card from '../Card';

export default function OrderCard({ order, returnDoc, onReturnClick }) {
  const hasReturn = !!returnDoc;

  const createdAt = order.createdAt?.toDate
    ? order.createdAt.toDate().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

  return (
    <Card
      header={
        <div
          className="flex justify-between items-center flex-wrap gap-2 px-5 py-[14px] -mx-6 -mt-5 mb-2"
          style={{ background: C.accentFaint, borderBottom: `1px solid ${C.border}` }}
        >
          <div>
            <p className="text-[13px] mb-[2px]" style={{ color: C.textMuted }}>
              Order <span className="font-bold" style={{ color: C.textPrimary }}>#{order.id.slice(0, 8)}&hellip;</span>
            </p>
            <p className="text-[11px]" style={{ color: C.textMuted }}>{createdAt}</p>
          </div>
          <StatusBadge status={order.orderStatus} />
        </div>
      }
    >
      {/* Delivery details */}
      <div className="flex flex-col gap-[6px] pb-[14px]" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-[14px] font-bold" style={{ color: C.textPrimary }}>{order.customerName}</p>
        <div className="flex gap-[18px] flex-wrap">
          <span className="flex items-center gap-[6px] text-[12px]" style={{ color: C.textMuted }}>
            <Phone size={12} color={C.accent} /> {order.phone}
          </span>
          <span className="flex items-center gap-[6px] text-[12px]" style={{ color: C.textMuted }}>
            <MapPin size={12} color={C.accent} /> {order.address}
          </span>
        </div>
      </div>

      {/* Items */}
      {order.types && order.types.length > 0 && (
        <div className="py-[14px]" style={{ borderBottom: `1px solid ${C.border}` }}>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3 flex items-center gap-[6px]"
            style={{ color: C.textMuted }}
          >
            <Package size={12} color={C.accent} /> Items
          </p>
          <div className="flex flex-col gap-2">
            {order.types.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-[10px] px-[14px] py-[10px]"
                style={{ background: C.accentFaint, border: `1px solid ${C.border}` }}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name}
                    className="w-10 h-10 rounded-lg object-cover"
                    style={{ border: `1px solid ${C.border}` }} />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(26,135,225,0.08)' }}>
                    <Package size={18} color={C.accent} />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-[13px] font-bold" style={{ color: C.textPrimary }}>{item.name}</p>
                  <p className="text-[11px] mt-[2px]" style={{ color: C.textMuted }}>Code: {item.id}</p>
                </div>
                <div className="text-right">
                  {item.quantity && (
                    <p className="text-[12px] font-bold px-2 py-[2px] rounded-[6px] inline-block"
                      style={{ color: C.accent, background: 'rgba(26,135,225,0.1)' }}>
                      x{item.quantity}
                    </p>
                  )}
                  {item.price && (
                    <p className="text-[11px] mt-1" style={{ color: C.textMuted }}>Rs. {item.price}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Return panel */}
      {hasReturn && <ReturnPanel returnDoc={returnDoc} />}

      {/* Footer */}
      <div className="flex justify-between items-center flex-wrap gap-2 pt-3">
        <div className="flex gap-2 items-center">
          <CreditCard size={13} color={C.textMuted} />
          <span className="text-[12px] font-bold uppercase tracking-[0.04em]" style={{ color: C.textSoft }}>
            {order.paymentMethod || '—'}
          </span>
          <span
            className="text-[10px] font-bold px-[10px] py-[3px] rounded-[10px] uppercase tracking-[0.06em]"
            style={{
              background: order.paymentStatus === 'paid' ? '#f0fdf4' : '#fffbeb',
              color:      order.paymentStatus === 'paid' ? '#16a34a' : '#d97706',
              border:     order.paymentStatus === 'paid' ? '1px solid #bbf7d0' : '1px solid #fde68a',
            }}
          >
            {order.paymentStatus || 'pending'}
          </span>
        </div>

        {order.orderStatus === 'delivered' && !hasReturn && (
          <button
            onClick={onReturnClick}
            className="flex items-center gap-[6px] text-[12px] font-semibold px-[18px] py-[9px] rounded-[10px] cursor-pointer"
            style={{ background: '#fff7ed', color: '#ea580c', border: '1.5px solid #fed7aa', fontFamily: FONT.body }}
          >
            <RotateCcw size={13} /> Return Items <ChevronRight size={12} />
          </button>
        )}

        {hasReturn && (
          <span
            className="flex items-center gap-[6px] text-[12px] font-semibold px-4 py-[7px] rounded-[10px]"
            style={{ background: C.accentFaint, color: C.accent, border: `1px solid ${C.border}` }}
          >
            <CheckCircle size={13} /> Return Requested
          </span>
        )}
      </div>
    </Card>
  );
}