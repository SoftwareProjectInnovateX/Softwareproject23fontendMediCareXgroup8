// Match exactly what your NestJS server exposes

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart, Clock, CheckCircle, XCircle,
  Phone, MapPin, ChevronDown, ChevronUp,
  Truck, Settings, Check, X, Banknote, RotateCcw
} from "lucide-react";

const API_BASE = "http://localhost:5000/api/pharmacist/orders";

// ── Design tokens ─────────────────────────────────────────────────────────────
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

const FONT = {
  display: "'Playfair Display', serif",
  body:    "'DM Sans', sans-serif",
};

// ── Style helpers ─────────────────────────────────────────────────────────────
function orderStatusStyle(status) {
  switch ((status || "").toLowerCase()) {
    case "delivered":  return { bg: "rgba(16,185,129,0.1)",  color: "#059669", border: "rgba(16,185,129,0.25)" };
    case "approved":   return { bg: "rgba(26,135,225,0.1)",  color: "#1a87e1", border: "rgba(26,135,225,0.25)" };
    case "cancelled":  return { bg: "rgba(239,68,68,0.1)",   color: "#dc2626", border: "rgba(239,68,68,0.25)"  };
    case "processing": return { bg: "rgba(139,92,246,0.1)",  color: "#7c3aed", border: "rgba(139,92,246,0.25)" };
    default:           return { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.25)" };
  }
}

function paymentStatusStyle(status) {
  switch ((status || "").toLowerCase()) {
    case "paid":    return { bg: "rgba(16,185,129,0.1)",  color: "#059669", border: "rgba(16,185,129,0.25)" };
    case "failed":  return { bg: "rgba(239,68,68,0.1)",   color: "#dc2626", border: "rgba(239,68,68,0.25)"  };
    default:        return { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.25)" };
  }
}

function returnStatusStyle(status) {
  switch ((status || "").toLowerCase()) {
    case "approved": return { bg: "rgba(16,185,129,0.1)",  color: "#059669", border: "rgba(16,185,129,0.25)" };
    case "rejected": return { bg: "rgba(239,68,68,0.1)",   color: "#dc2626", border: "rgba(239,68,68,0.25)"  };
    default:         return { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.25)" };
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, iconBg, iconColor }) {
  return (
    <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[14px] px-5 py-[18px] flex items-center gap-[14px] shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
      <div className="w-11 h-11 rounded-[11px] shrink-0 flex items-center justify-center" style={{ background: iconBg }}>
        <Icon size={20} color={iconColor} strokeWidth={2} />
      </div>
      <div>
        <div className="text-[11px] text-[#64748b] uppercase tracking-[0.08em] font-semibold">{label}</div>
        <div className="text-[24px] font-bold text-[#1e293b] leading-[1.2] mt-[2px]">{value}</div>
      </div>
    </div>
  );
}

function Badge({ label, style: s }) {
  return (
    <span
      className="text-[10px] font-bold px-[10px] py-[3px] rounded-[20px] uppercase tracking-[0.06em] whitespace-nowrap"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {label}
    </span>
  );
}

function ActionBtn({ label, icon: Icon, onClick, disabled, color, bg, border }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-[12px] font-semibold px-[14px] py-[7px] rounded-lg flex items-center gap-[6px] transition-all duration-150"
      style={{
        background: disabled ? "#f1f5f9" : bg,
        color:      disabled ? C.textMuted : color,
        border:     `1px solid ${disabled ? C.border : border}`,
        cursor:     disabled ? "not-allowed" : "pointer",
        fontFamily: FONT.body,
      }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {label}
    </button>
  );
}

// ── OrderRow ──────────────────────────────────────────────────────────────────
function OrderRow({ order, returnDoc, onStatusUpdate, updating }) {
  const [expanded, setExpanded] = useState(false);
  const oStyle    = orderStatusStyle(order.orderStatus);
  const pStyle    = paymentStatusStyle(order.paymentStatus);
  const isCOD     = (order.paymentMethod || "").toLowerCase() === "cod";
  const hasReturn = !!returnDoc;
  const rStyle    = hasReturn ? returnStatusStyle(returnDoc.returnStatus) : null;

  const createdAt = order.createdAt?._seconds
    ? new Date(order.createdAt._seconds * 1000).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return (
    <div
      className="bg-white rounded-[12px] overflow-hidden"
      style={{
        border:     hasReturn ? "1.5px solid rgba(234,88,12,0.4)" : "1px solid rgba(26,135,225,0.18)",
        boxShadow:  hasReturn ? "0 2px 8px rgba(234,88,12,0.08)" : "0 1px 3px rgba(26,135,225,0.06)",
      }}
    >
      {hasReturn && (
        <div
          className="flex items-center justify-between px-[18px] py-[9px]"
          style={{ background: "rgba(234,88,12,0.06)", borderBottom: "1px solid rgba(234,88,12,0.2)" }}
        >
          <div className="flex items-center gap-2">
            <RotateCcw size={13} color="#ea580c" />
            <span className="text-[12px] font-semibold" style={{ color: "#ea580c" }}>
              Return Request —&nbsp;
              <span className="capitalize">{returnDoc.returnStatus || "pending"}</span>
            </span>
            {returnDoc.items?.length > 0 && (
              <span className="text-[11px]" style={{ color: "#9a3412" }}>
                · {returnDoc.items.length} item{returnDoc.items.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <Badge label={returnDoc.returnStatus || "pending"} style={rStyle} />
        </div>
      )}

      <div
        className="grid px-[18px] py-[14px] items-center gap-3"
        style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto" }}
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-semibold text-[#1e293b]">{order.customerName || "—"}</p>
            {isCOD && (
              <span
                className="text-[9px] font-bold px-[8px] py-[2px] rounded-[6px] uppercase tracking-[0.08em]"
                style={{ background: "rgba(245,158,11,0.12)", color: "#d97706", border: "1px solid rgba(245,158,11,0.3)" }}
              >
                COD
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#64748b] mt-[3px] flex items-center gap-1">
            <Phone size={11} /> {order.phone || "—"}
          </p>
          <p className="text-[11px] text-[#64748b] mt-[2px] flex items-center gap-1">
            <MapPin size={11} /> {order.address || "—"}
          </p>
        </div>

        <div className="text-[11px] text-[#475569]">{createdAt}</div>

        <div className="text-[13px] font-semibold text-[#1e293b]">
          {order.types?.length ?? 0} item{order.types?.length !== 1 ? "s" : ""}
        </div>

        <div className="flex flex-col gap-[5px]">
          <Badge label={order.paymentMethod || "—"} style={{ bg: "rgba(26,135,225,0.08)", color: "#1a87e1", border: "rgba(26,135,225,0.2)" }} />
          <Badge label={order.paymentStatus || "pending"} style={pStyle} />
        </div>

        <Badge label={order.orderStatus || "pending"} style={oStyle} />

        <button
          onClick={() => setExpanded(e => !e)}
          className="bg-[#f1f5f9] border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[6px] cursor-pointer text-[#475569] text-[12px] flex items-center gap-[5px] font-semibold"
          style={{ fontFamily: FONT.body }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? "Hide" : "Details"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[rgba(26,135,225,0.18)] px-[18px] py-4 bg-[#f8fafc]">

          {isCOD && (
            <div
              className="flex items-center gap-2 mb-4 px-[14px] py-[10px] rounded-lg"
              style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <Banknote size={14} color="#d97706" />
              <p className="text-[12px] font-semibold" style={{ color: "#d97706" }}>
                Cash on Delivery — payment collected upon delivery. Returns eligible for this order.
              </p>
            </div>
          )}

          {hasReturn && (
            <div className="mb-4 rounded-[10px] overflow-hidden"
              style={{ border: "1.5px solid rgba(234,88,12,0.3)" }}>
              <div
                className="flex items-center justify-between px-[14px] py-[10px]"
                style={{ background: "rgba(234,88,12,0.07)", borderBottom: "1px solid rgba(234,88,12,0.2)" }}
              >
                <div className="flex items-center gap-2">
                  <RotateCcw size={13} color="#ea580c" />
                  <p className="text-[12px] font-bold uppercase tracking-[0.07em]" style={{ color: "#ea580c" }}>
                    Return Request Details
                  </p>
                </div>
                <Badge label={returnDoc.returnStatus || "pending"} style={rStyle} />
              </div>

              <div className="px-[14px] py-3 bg-white flex flex-col gap-2">
                {returnDoc.items?.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center rounded-lg px-3 py-[8px]"
                    style={{ background: "#fff7ed", border: "1px solid rgba(234,88,12,0.15)" }}
                  >
                    <div>
                      <p className="text-[12px] font-semibold" style={{ color: C.textPrimary }}>{item.name}</p>
                      <p className="text-[11px]" style={{ color: C.textMuted }}>
                        Code: {item.id} · Qty: {item.quantity} · Reason: {item.reason}
                      </p>
                    </div>
                    <p className="text-[12px] font-bold" style={{ color: "#ea580c" }}>
                      Rs. {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </p>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: C.textMuted }}>
                    Refund Amount
                  </span>
                  <span className="text-[13px] font-bold" style={{ color: "#059669" }}>
                    Rs. {(returnDoc.refundAmount || 0).toFixed(2)}
                  </span>
                </div>

                {returnDoc.adjustmentNote && (
                  <div
                    className="rounded-lg px-3 py-[8px] mt-1"
                    style={{ background: "rgba(26,135,225,0.04)", border: "1px solid rgba(26,135,225,0.15)" }}
                  >
                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: C.textMuted }}>Customer Note</p>
                    <p className="text-[12px]" style={{ color: C.textSoft }}>{returnDoc.adjustmentNote}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {order.types && order.types.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-[0.08em] mb-[10px]">Order Items</p>
              <div className="flex flex-col gap-2">
                {order.types.map((item, i) => (
                  <div key={i} className="flex justify-between items-center bg-white rounded-lg px-[14px] py-[10px] border border-[rgba(26,135,225,0.18)]">
                    <div className="flex items-center gap-[10px]">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.name}
                          className="w-10 h-10 rounded-[6px] object-cover border border-[rgba(26,135,225,0.18)]" />
                      )}
                      <div>
                        <p className="text-[13px] font-semibold text-[#1e293b]">{item.name || "—"}</p>
                        <p className="text-[11px] text-[#64748b]">Code: {item.id || "—"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold text-[#1a87e1]">{item.quantity ? `x${item.quantity}` : ""}</p>
                      {item.price && <p className="text-[11px] text-[#64748b]">Rs. {item.price}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {order.totalnumber !== undefined && (
            <div className="flex justify-end mb-4">
              <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-4 py-2 text-[13px] font-semibold text-[#1a87e1]">
                Total Items: {order.totalnumber}
              </div>
            </div>
          )}

          {order.feedback && (
            <div className="bg-[rgba(26,135,225,0.04)] border border-[rgba(26,135,225,0.15)] rounded-lg px-[14px] py-[10px] mb-4">
              <p className="text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-[0.08em]">Customer Feedback</p>
              <p className="text-[13px] text-[#475569]">{order.feedback}</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <ActionBtn
              label="Approve" icon={Check}
              disabled={order.orderStatus === "approved" || order.orderStatus === "delivered" || updating}
              onClick={() => onStatusUpdate(order.id, "approved")}
              color="#059669" bg="rgba(16,185,129,0.1)" border="rgba(16,185,129,0.25)"
            />
            <ActionBtn
              label="Mark Delivered" icon={Truck}
              disabled={order.orderStatus === "delivered" || order.orderStatus === "cancelled" || updating}
              onClick={() => onStatusUpdate(order.id, "delivered")}
              color="#1a87e1" bg="rgba(26,135,225,0.1)" border="rgba(26,135,225,0.25)"
            />
            <ActionBtn
              label="Processing" icon={Settings}
              disabled={order.orderStatus === "processing" || order.orderStatus === "delivered" || updating}
              onClick={() => onStatusUpdate(order.id, "processing")}
              color="#7c3aed" bg="rgba(139,92,246,0.1)" border="rgba(139,92,246,0.25)"
            />
            <ActionBtn
              label="Cancel" icon={X}
              disabled={order.orderStatus === "cancelled" || order.orderStatus === "delivered" || updating}
              onClick={() => onStatusUpdate(order.id, "cancelled")}
              color="#dc2626" bg="rgba(239,68,68,0.1)" border="rgba(239,68,68,0.25)"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Orders() {
  const [orders, setOrders]     = useState([]);
  const [returns, setReturns]   = useState([]);
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [ordersRes, returnsRes] = await Promise.all([
        fetch(API_BASE),
        fetch(`${API_BASE}/returns`),
      ]);
      const ordersData  = await ordersRes.json();
      const returnsData = await returnsRes.json();

      ordersData.sort((a, b) => {
        const aS = a.createdAt?._seconds ?? 0;
        const bS = b.createdAt?._seconds ?? 0;
        return bS - aS;
      });

      setOrders(ordersData);
      setReturns(returnsData);
    } catch (err) {
      console.error("Failed to fetch orders/returns:", err);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [fetchAll]);

  const getReturnForOrder = (orderId) => returns.find(r => r.orderId === orderId);

  const handleStatusUpdate = async (id, status) => {
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: status }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchAll(); // refresh after update
    } catch (err) {
      alert(`Failed to update: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const total      = orders.length;
  const pending    = orders.filter(o => (o.orderStatus || "pending") === "pending").length;
  const delivered  = orders.filter(o => o.orderStatus === "delivered").length;
  const cancelled  = orders.filter(o => o.orderStatus === "cancelled").length;
  const cod        = orders.filter(o => (o.paymentMethod || "").toLowerCase() === "cod").length;
  const withReturn = orders.filter(o => !!getReturnForOrder(o.id)).length;

  const visible = orders.filter(o => {
    const isRx = !!(o.rxId || o.isPrescription);
    if (isRx) return false;

    const matchFilter =
      filter === "all"        ? true :
      filter === "pending"    ? (o.orderStatus || "pending") === "pending" :
      filter === "approved"   ? o.orderStatus === "approved"   :
      filter === "processing" ? o.orderStatus === "processing" :
      filter === "delivered"  ? o.orderStatus === "delivered"  :
      filter === "cancelled"  ? o.orderStatus === "cancelled"  :
      filter === "cod"        ? (o.paymentMethod || "").toLowerCase() === "cod" :
      filter === "returns"    ? !!getReturnForOrder(o.id) : true;

    const matchSearch =
      !search ||
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.phone?.toLowerCase().includes(search.toLowerCase()) ||
      o.address?.toLowerCase().includes(search.toLowerCase());

    return matchFilter && matchSearch;
  });

  return (
    <div className="font-['DM_Sans',sans-serif]">
      <div className="mb-6">
        <h1 className="font-['Playfair_Display',serif] text-[26px] text-[#1e293b] font-semibold">Orders</h1>
        <p className="text-[13px] text-[#64748b] mt-[5px]">Manage orders, approve delivery, and handle feedback.</p>
      </div>

      <div className="grid grid-cols-3 gap-[14px] mb-3">
        <StatCard icon={ShoppingCart} label="Total Orders" value={total}      iconBg="rgba(26,135,225,0.1)"  iconColor="#1a87e1" />
        <StatCard icon={Clock}        label="Pending"       value={pending}    iconBg="rgba(245,158,11,0.1)"  iconColor="#d97706" />
        <StatCard icon={CheckCircle}  label="Delivered"     value={delivered}  iconBg="rgba(16,185,129,0.1)"  iconColor="#059669" />
      </div>
      <div className="grid grid-cols-3 gap-[14px] mb-6">
        <StatCard icon={XCircle}   label="Cancelled"    value={cancelled}  iconBg="rgba(239,68,68,0.1)"   iconColor="#dc2626" />
        <StatCard icon={Banknote}  label="COD Orders"   value={cod}        iconBg="rgba(245,158,11,0.08)" iconColor="#d97706" />
        <StatCard icon={RotateCcw} label="With Returns" value={withReturn} iconBg="rgba(234,88,12,0.08)"  iconColor="#ea580c" />
      </div>

      <div className="flex gap-2 mb-[18px] flex-wrap items-center">
        {[
          { key: "all",        label: `All (${total})`           },
          { key: "pending",    label: `Pending (${pending})`     },
          { key: "approved",   label: "Approved"                 },
          { key: "processing", label: "Processing"               },
          { key: "delivered",  label: `Delivered (${delivered})` },
          { key: "cancelled",  label: `Cancelled (${cancelled})` },
          { key: "cod",        label: `COD (${cod})`             },
          { key: "returns",    label: `Returns (${withReturn})`  },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="text-[12px] font-semibold px-[14px] py-[7px] rounded-lg cursor-pointer transition-all duration-150 border"
            style={{
              fontFamily: FONT.body,
              background:
                filter === f.key
                  ? f.key === "cod"     ? "rgba(245,158,11,0.12)"
                  : f.key === "returns" ? "rgba(234,88,12,0.10)"
                  : "rgba(26,135,225,0.12)"
                  : C.surface,
              color:
                filter === f.key
                  ? f.key === "cod"     ? "#d97706"
                  : f.key === "returns" ? "#ea580c"
                  : "#1a87e1"
                  : C.textSoft,
              border:
                filter === f.key
                  ? f.key === "cod"     ? "1px solid rgba(245,158,11,0.35)"
                  : f.key === "returns" ? "1px solid rgba(234,88,12,0.35)"
                  : "1px solid rgba(26,135,225,0.35)"
                  : `1px solid ${C.border}`,
            }}
          >
            {f.label}
          </button>
        ))}

        <input
          placeholder="Search by name, phone, address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[7px] text-[12px] text-[#1e293b] outline-none w-60"
          style={{ fontFamily: FONT.body }}
        />
      </div>

      <div
        className="grid px-[18px] py-[10px] gap-3 bg-[#e0f2fe] border border-[rgba(26,135,225,0.18)] rounded-[10px_10px_0_0]"
        style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto" }}
      >
        {["Customer", "Date", "Items", "Payment", "Status", ""].map((h, i) => (
          <div key={i} className="text-[11px] font-bold text-[#1a87e1] uppercase tracking-[0.08em]">{h}</div>
        ))}
      </div>

      <div className="flex flex-col gap-[2px] mt-[2px]">
        {visible.length === 0 ? (
          <div className="text-center py-[60px] bg-white border border-[rgba(26,135,225,0.18)] rounded-[0_0_10px_10px]">
            <ShoppingCart size={40} color={C.textMuted} className="mx-auto mb-3" />
            <p className="text-[14px] text-[#475569]">No orders found.</p>
          </div>
        ) : (
          visible.map(order => (
            <OrderRow
              key={order.id}
              order={order}
              returnDoc={getReturnForOrder(order.id)}
              onStatusUpdate={handleStatusUpdate}
              updating={updating}
            />
          ))
        )}
      </div>

      <div className="text-[12px] text-[#64748b] mt-3 text-right">
        Showing {visible.length} of {total} orders
      </div>
    </div>
  );
}