import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Phone, MapPin, Package, CreditCard,
  RotateCcw, CheckCircle, FileText, Upload, ClipboardList,
  AlertCircle, Clock, XCircle, ChevronRight,
} from 'lucide-react';

const C = {
  bg:          "#f1f5f9",
  surface:     "#ffffff",
  border:      "rgba(26,135,225,0.18)",
  accent:      "#1a87e1",
  accentMid:   "#0284c7",
  textPrimary: "#1e293b",
  textMuted:   "#64748b",
  textSoft:    "#475569",
};

const FONT = { display: "'Playfair Display', serif", body: "'DM Sans', sans-serif" };

export default function OrdersPage() {
  const [orders, setOrders]   = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate              = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const orderSnap = await getDocs(collection(db, 'CustomerOrders'));
        const orderData = orderSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        orderData.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setOrders(orderData);

        const returnSnap = await getDocs(collection(db, 'CustomerReturns'));
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

  const getReturnForOrder = (orderId) =>
    returns.find(r => r.orderId === orderId);

  const returnStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'approved': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'rejected': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      default:         return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
    }
  };

  const refundStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'processed': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'rejected':  return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      default:          return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
    }
  };

  const statusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'delivered':  return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'approved':   return { bg: 'rgba(26,135,225,0.08)', color: '#1a87e1', border: 'rgba(26,135,225,0.25)' };
      case 'processing': return { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' };
      case 'cancelled':  return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      default:           return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
    }
  };

  const StatusIcon = ({ status }) => {
    switch ((status || '').toLowerCase()) {
      case 'delivered':  return <CheckCircle size={12} />;
      case 'approved':   return <CheckCircle size={12} />;
      case 'processing': return <Clock size={12} />;
      case 'cancelled':  return <XCircle size={12} />;
      default:           return <AlertCircle size={12} />;
    }
  };

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

      {/* Page header banner */}
      <div
        className="px-6 pt-14 pb-12 text-center"
        style={{ background: "linear-gradient(135deg, #0f2a5e 0%, #1a87e1 100%)" }}
      >
        <h1
          className="text-[38px] font-bold text-white mb-3"
          style={{ fontFamily: FONT.display }}
        >
          My Orders
        </h1>
        <p
          className="text-[15px] max-w-[520px] mx-auto mb-7"
          style={{ color: "rgba(255,255,255,0.75)" }}
        >
          View your order history, track deliveries, and manage returns.
        </p>

        {/* Prescription action buttons */}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => navigate('/customer/prescription')}
            className="flex items-center gap-2 text-[13px] font-semibold px-[22px] py-[11px] rounded-[10px] bg-white border-none cursor-pointer"
            style={{
              color: C.accent,
              fontFamily: FONT.body,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <Upload size={15} /> Upload Prescription
          </button>

          <button
            onClick={() => navigate('/customer/prescription')}
            className="flex items-center gap-2 text-[13px] font-semibold px-[22px] py-[11px] rounded-[10px] text-white cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.3)',
              fontFamily: FONT.body,
            }}
          >
            <ClipboardList size={15} /> View Prescription History
          </button>
        </div>
      </div>

      {/* Orders list */}
      <div className="max-w-[860px] mx-auto px-6 py-9">

        {/* Empty state */}
        {orders.length === 0 ? (
          <div
            className="rounded-2xl py-[72px] text-center"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
            }}
          >
            <ShoppingCart size={42} color={C.textMuted} className="mx-auto mb-[14px]" />
            <p className="text-[16px] font-bold" style={{ color: C.textSoft }}>No orders yet.</p>
            <p className="text-[13px] mt-[6px]" style={{ color: C.textMuted }}>
              Your orders will appear here once placed.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {orders.map(order => {
              const sc        = statusColor(order.orderStatus);
              const returnDoc = getReturnForOrder(order.id);
              const hasReturn = !!returnDoc;

              const createdAt = order.createdAt?.toDate
                ? order.createdAt.toDate().toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })
                : '—';

              return (
                <div
                  key={order.id}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
                  }}
                >
                  {/* Order header */}
                  <div
                    className="flex justify-between items-center px-5 py-[14px] flex-wrap gap-2"
                    style={{
                      background: 'rgba(26,135,225,0.04)',
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <div>
                      <p className="text-[13px] mb-[2px]" style={{ color: C.textMuted }}>
                        Order <span className="font-bold" style={{ color: C.textPrimary }}>#{order.id.slice(0, 8)}&hellip;</span>
                      </p>
                      <p className="text-[11px]" style={{ color: C.textMuted }}>{createdAt}</p>
                    </div>
                    <span
                      className="flex items-center gap-[5px] text-[11px] font-bold px-[13px] py-[5px] rounded-[20px] uppercase tracking-[0.06em]"
                      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                    >
                      <StatusIcon status={order.orderStatus} />
                      {order.orderStatus || 'Pending'}
                    </span>
                  </div>

                  {/* Delivery details */}
                  <div
                    className="px-5 py-[14px] flex flex-col gap-[6px]"
                    style={{ borderBottom: `1px solid ${C.border}` }}
                  >
                    <p className="text-[14px] font-bold" style={{ color: C.textPrimary }}>
                      {order.customerName}
                    </p>
                    <div className="flex gap-[18px] flex-wrap">
                      <span className="flex items-center gap-[6px] text-[12px]" style={{ color: C.textMuted }}>
                        <Phone size={12} color={C.accent} /> {order.phone}
                      </span>
                      <span className="flex items-center gap-[6px] text-[12px]" style={{ color: C.textMuted }}>
                        <MapPin size={12} color={C.accent} /> {order.address}
                      </span>
                    </div>
                  </div>

                  {/* Ordered items list */}
                  {order.types && order.types.length > 0 && (
                    <div
                      className="px-5 py-[14px]"
                      style={{ borderBottom: `1px solid ${C.border}` }}
                    >
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
                            style={{
                              background: 'rgba(26,135,225,0.04)',
                              border: `1px solid ${C.border}`,
                            }}
                          >
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover"
                                style={{ border: `1px solid ${C.border}` }}
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(26,135,225,0.08)' }}
                              >
                                <Package size={18} color={C.accent} />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-[13px] font-bold" style={{ color: C.textPrimary }}>
                                {item.name}
                              </p>
                              <p className="text-[11px] mt-[2px]" style={{ color: C.textMuted }}>
                                Code: {item.id}
                              </p>
                            </div>
                            <div className="text-right">
                              {item.quantity && (
                                <p
                                  className="text-[12px] font-bold px-2 py-[2px] rounded-[6px] inline-block"
                                  style={{
                                    color: C.accent,
                                    background: 'rgba(26,135,225,0.1)',
                                  }}
                                >
                                  x{item.quantity}
                                </p>
                              )}
                              {item.price && (
                                <p className="text-[11px] mt-1" style={{ color: C.textMuted }}>
                                  Rs. {item.price}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Return request panel */}
                  {hasReturn && (
                    <div
                      className="px-5 py-[14px]"
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: 'rgba(26,135,225,0.02)',
                      }}
                    >
                      <p
                        className="text-[11px] font-bold uppercase tracking-[0.08em] mb-3 flex items-center gap-[6px]"
                        style={{ color: C.textMuted }}
                      >
                        <RotateCcw size={12} color={C.accent} /> Return Request
                      </p>

                      {/* Return items */}
                      <div className="flex flex-col gap-[6px] mb-3">
                        {returnDoc.items?.map((item, i) => (
                          <div
                            key={i}
                            className="flex justify-between text-[12px] rounded-lg px-3 py-[7px]"
                            style={{
                              color: C.textSoft,
                              background: 'rgba(26,135,225,0.04)',
                              border: `1px solid ${C.border}`,
                            }}
                          >
                            <span className="font-semibold">{item.name} &times; {item.quantity}</span>
                            <span style={{ color: C.textMuted }}>{item.reason}</span>
                          </div>
                        ))}
                      </div>

                      {/* Return and refund status badges */}
                      <div className="flex gap-[10px] flex-wrap items-center">
                        <span
                          className="text-[12px] font-semibold px-3 py-1 rounded-lg"
                          style={{
                            color: C.textSoft,
                            background: 'rgba(26,135,225,0.06)',
                            border: `1px solid ${C.border}`,
                          }}
                        >
                          Refund: Rs. {(returnDoc.refundAmount || 0).toFixed(2)}
                        </span>
                        <span
                          className="text-[11px] font-bold px-3 py-1 rounded-[20px] uppercase tracking-[0.05em]"
                          style={(() => {
                            const s = returnStatusColor(returnDoc.returnStatus);
                            return { background: s.bg, color: s.color, border: `1px solid ${s.border}` };
                          })()}
                        >
                          Return: {returnDoc.returnStatus || 'pending'}
                        </span>
                        <span
                          className="text-[11px] font-bold px-3 py-1 rounded-[20px] uppercase tracking-[0.05em]"
                          style={(() => {
                            const s = refundStatusColor(returnDoc.refundStatus);
                            return { background: s.bg, color: s.color, border: `1px solid ${s.border}` };
                          })()}
                        >
                          Refund: {returnDoc.refundStatus || 'pending'}
                        </span>
                      </div>

                      {/* Pharmacist note */}
                      {returnDoc.adjustmentNote && returnDoc.returnStatus !== 'pending' && (
                        <div
                          className="mt-3 rounded-[10px] px-[14px] py-[10px] flex gap-2 items-start"
                          style={{
                            background: 'rgba(26,135,225,0.06)',
                            border: `1px solid ${C.border}`,
                          }}
                        >
                          <FileText size={14} color={C.accent} className="mt-[1px] shrink-0" />
                          <p className="text-[12px] leading-[1.6]" style={{ color: C.accentMid }}>
                            <strong>Pharmacist note:</strong> {returnDoc.adjustmentNote}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Order card footer */}
                  <div className="px-5 py-3 flex justify-between items-center flex-wrap gap-2">
                    <div className="flex gap-2 items-center">
                      <CreditCard size={13} color={C.textMuted} />
                      <span
                        className="text-[12px] font-bold uppercase tracking-[0.04em]"
                        style={{ color: C.textSoft }}
                      >
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

                    {/* Return button */}
                    {order.orderStatus === 'delivered' && !hasReturn && (
                      <button
                        onClick={() => navigate('/customer/returns', { state: { orderId: order.id, order } })}
                        className="flex items-center gap-[6px] text-[12px] font-semibold px-[18px] py-[9px] rounded-[10px] cursor-pointer"
                        style={{
                          background: '#fff7ed',
                          color: '#ea580c',
                          border: '1.5px solid #fed7aa',
                          fontFamily: FONT.body,
                        }}
                      >
                        <RotateCcw size={13} /> Return Items <ChevronRight size={12} />
                      </button>
                    )}

                    {/* Return requested badge */}
                    {hasReturn && (
                      <span
                        className="flex items-center gap-[6px] text-[12px] font-semibold px-4 py-[7px] rounded-[10px]"
                        style={{
                          background: 'rgba(26,135,225,0.06)',
                          color: C.accent,
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        <CheckCircle size={13} /> Return Requested
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}