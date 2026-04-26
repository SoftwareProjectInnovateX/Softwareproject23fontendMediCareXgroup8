import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, MapPin, Package, CreditCard,
  RotateCcw, CheckCircle, ChevronRight,
  Truck, Receipt, Clock, ShoppingCart
} from 'lucide-react';
import { C, FONT } from '../profile/profileTheme';
import { StatusBadge } from './orderStatusUtils';
import ReturnPanel from './ReturnPanel';
import Card from '../Card';

export default function OrderCard({ order, returnDoc, onReturnClick }) {
  const [showBill, setShowBill] = useState(false);
  const navigate = useNavigate();
  const hasReturn = !!returnDoc;
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
              {order.type === 'prescription' ? 'Prescription' : 'Order'} <span className="font-bold" style={{ color: C.textPrimary }}>#{order.id.slice(0, 8)}&hellip;</span>
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

      {/* Items Section (Hidden if expanded bill is shown to reduce clutter) */}
      {!showBill && order.types && order.types.length > 0 && (
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

      {/* Prescription-specific Detailed Status Blocks (Dynamic) */}
      {order.type === 'prescription' && (
        <div className="mt-4 px-1 pb-2">
          {order.orderStatus === 'Pending' && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-3 animate-pulse">
               <Clock className="text-amber-500" size={18} />
               <div className="flex-1">
                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Pending Verification</p>
                  <p className="text-[9px] text-amber-600 font-bold">Pharmacist is reviewing your prescription...</p>
               </div>
            </div>
          )}

          {order.orderStatus === 'Approved' && !showBill && (
            <div className="p-4 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-100 flex items-center justify-between group cursor-pointer" onClick={() => setShowBill(true)}>
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
            <div className="p-5 rounded-2xl bg-slate-50 border-2 border-blue-100 shadow-inner animate-in fade-in slide-in-from-top-2">
               <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                  <h4 className="font-black text-slate-800 text-[10px] uppercase tracking-widest flex items-center gap-2">
                     <Receipt size={14} className="text-blue-600" /> Digital Invoice
                  </h4>
                  <button onClick={() => setShowBill(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600">Close</button>
               </div>

               <div className="space-y-2 mb-4">
                  {(order.types || []).map((m, idx) => (
                     <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">{m.name} <span className="text-[9px] text-slate-400 font-medium">x {m.quantity}</span></span>
                        <span className="font-black text-slate-900">Rs. {(m.quantity * m.price).toFixed(2)}</span>
                     </div>
                  ))}
               </div>

               <div className="flex justify-between items-center pt-3 border-t-2 border-dashed border-slate-200 mb-6">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Total Amount</span>
                  <span className="text-lg font-black text-blue-700">Rs. {(order.total || 0).toFixed(2)}</span>
               </div>

               <button 
                  onClick={handleGoToCheckout}
                  className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all"
               >
                  <ShoppingCart size={16} /> Confirm & Pay Now
               </button>
            </div>
          )}

          {order.orderStatus === 'Packing' && (
            <div className="p-3 rounded-xl bg-blue-50 border-2 border-blue-200 flex items-center gap-3 animate-pulse">
               <Package className="text-blue-600" size={18} />
               <div className="flex-1">
                  <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Medications Packing</p>
                  <p className="text-[9px] text-blue-600 font-bold">Your order is being prepared for delivery.</p>
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
            <div className="p-4 rounded-xl bg-emerald-100 border-2 border-emerald-500/20 text-center shadow-inner">
               <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle size={20} className="text-emerald-600" />
                  <span className="font-black uppercase tracking-[0.2em] text-[11px] text-emerald-800">Delivered</span>
               </div>
               <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest opacity-80">Medications received successfully</p>
            </div>
          )}
        </div>
      )}

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

        {/* ── Return button: only for COD orders that are delivered and have no existing return ── */}
        {order.orderStatus === 'delivered' && !hasReturn && isCOD && (
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