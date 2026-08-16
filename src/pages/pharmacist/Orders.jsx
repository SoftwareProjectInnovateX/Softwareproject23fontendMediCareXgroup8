import { useState, useEffect, useCallback, useRef } from "react";
import {
  ShoppingCart, Clock, CheckCircle, XCircle,
  Phone, MapPin, ChevronDown, ChevronUp,
  Truck, Settings, Check, X, Banknote,
  TrendingUp, Package, AlertCircle,
  CreditCard, BadgeCheck, RefreshCw
} from "lucide-react";

// ── API base (unchanged) ──────────────────────────────────────────────────────
const API_BASE = `${import.meta.env.VITE_API_URL_RAILWAY}/api`;

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          "#f8fafc",
  surface:     "#ffffff",
  border:      "rgba(148,163,184,0.25)",
  borderHover: "rgba(148,163,184,0.45)",
  accent:      "#2563eb",
  accentLight: "#eff6ff",
  textPrimary: "#0f172a",
  textMuted:   "#64748b",
  textSoft:    "#475569",
};

const FONT = {
  display: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
  body:    "'DM Sans', 'Inter', sans-serif",
};

// ── Status helpers ─────────────────────────────────────────────────────────────
function orderStatusStyle(status) {
  switch ((status || "").toLowerCase()) {
    case "delivered":  return { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", dot: "#22c55e" };
    case "approved":   return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", dot: "#3b82f6" };
    case "cancelled":  return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", dot: "#ef4444" };
    case "processing": return { bg: "#faf5ff", color: "#7e22ce", border: "#e9d5ff", dot: "#a855f7" };
    default:           return { bg: "#fffbeb", color: "#b45309", border: "#fde68a", dot: "#f59e0b" };
  }
}

function paymentStatusStyle(status) {
  switch ((status || "").toLowerCase()) {
    case "paid":    return { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", dot: "#22c55e" };
    case "failed":  return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", dot: "#ef4444" };
    default:        return { bg: "#fffbeb", color: "#b45309", border: "#fde68a", dot: "#f59e0b" };
  }
}

function statusBorderColor(order) {
  const s = (order.orderStatus || "pending").toLowerCase();
  const p = (order.paymentStatus || "pending").toLowerCase();
  if (p === "paid") return "#22c55e";
  switch (s) {
    case "delivered":  return "#22c55e";
    case "approved":   return "#3b82f6";
    case "cancelled":  return "#ef4444";
    case "processing": return "#a855f7";
    default:           return "#f59e0b";
  }
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ label, style: s }) {
  return (
    <span style={{
      fontSize: "11px", fontWeight: 600,
      padding: "3px 9px", borderRadius: "20px",
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      display: "inline-flex", alignItems: "center", gap: "4px",
      whiteSpace: "nowrap", letterSpacing: "0.02em",
      fontFamily: 'inherit',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 14,
      border: `1px solid ${C.border}`,
      padding: "16px 18px",
      display: "flex", alignItems: "center", gap: 14,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 11,
        background: bg, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={19} color={color} strokeWidth={2} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, fontFamily: 'inherit' }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.textPrimary, lineHeight: 1.15, marginTop: 2, fontFamily: 'inherit' }}>{value}</div>
      </div>
    </div>
  );
}

// ── Weekly Bar Chart ──────────────────────────────────────────────────────────
function WeeklyChart({ orders }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date().getDay();
  const counts = new Array(7).fill(0);
  orders.forEach(o => {
    if (o.createdAt?._seconds) {
      counts[new Date(o.createdAt._seconds * 1000).getDay()]++;
    }
  });
  const max = Math.max(...counts, 1);
  const reordered = Array.from({ length: 7 }, (_, i) => {
    const idx = (today - 6 + i + 7) % 7;
    return { day: days[idx], count: counts[idx], isToday: idx === today };
  });

  return (
    <div style={{
      background: C.surface, borderRadius: 14,
      border: `1px solid ${C.border}`,
      padding: "18px 20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, fontFamily: 'inherit' }}>Orders this week</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary, lineHeight: 1.2, marginTop: 2, fontFamily: 'inherit' }}>{orders.length} total</div>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <TrendingUp size={16} color="#2563eb" />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64 }}>
        {reordered.map(({ day, count, isToday }, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div
              title={`${count} orders`}
              style={{
                width: "100%",
                height: Math.max((count / max) * 48, count > 0 ? 8 : 3),
                borderRadius: "4px 4px 0 0",
                background: isToday
                  ? "linear-gradient(180deg, #3b82f6, #1d4ed8)"
                  : count > 0 ? "#bfdbfe" : "#f1f5f9",
                minHeight: 3, cursor: "default",
                transition: "height 0.3s ease",
              }}
            />
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: "uppercase",
              color: isToday ? "#2563eb" : "#94a3b8",
              fontFamily: 'inherit',
            }}>{day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Payment Donut Chart ───────────────────────────────────────────────────────
function PaymentChart({ orders }) {
  const canvasRef = useRef(null);
  const cod        = orders.filter(o => (o.paymentMethod || "").toLowerCase() === "cod");
  const codPaid    = cod.filter(o => (o.paymentStatus || "").toLowerCase() === "paid").length;
  const codPending = cod.filter(o => (o.paymentStatus || "").toLowerCase() !== "paid").length;
  const online     = orders.filter(o => (o.paymentMethod || "").toLowerCase() !== "cod");
  const onlinePaid = online.filter(o => (o.paymentStatus || "").toLowerCase() === "paid").length;
  const total      = orders.length;
  const paidTotal  = orders.filter(o => (o.paymentStatus || "").toLowerCase() === "paid").length;
  const pct        = total > 0 ? Math.round((paidTotal / total) * 100) : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 80, 80);
    const segments = [
      { value: codPaid,    color: "#22c55e" },
      { value: codPending, color: "#f59e0b" },
      { value: onlinePaid, color: "#3b82f6" },
      { value: Math.max(0, total - codPaid - codPending - onlinePaid), color: "#e2e8f0" },
    ].filter(s => s.value > 0);

    const cx = 40, cy = 40, r = 34, ir = 22;
    let start = -Math.PI / 2;
    const tot = total || 1;
    segments.forEach(seg => {
      const angle = (seg.value / tot) * (2 * Math.PI);
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + angle);
      ctx.closePath(); ctx.fillStyle = seg.color; ctx.fill();
      start += angle;
    });
    ctx.beginPath(); ctx.arc(cx, cy, ir, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#0f172a"; ctx.font = "bold 13px sans-serif";
    ctx.fillText(pct + "%", cx, cy);
  }, [orders]);

  return (
    <div style={{
      background: C.surface, borderRadius: 14,
      border: `1px solid ${C.border}`, padding: "18px 20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, fontFamily: 'inherit', marginBottom: 14 }}>Payment overview</div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <canvas ref={canvasRef} width={80} height={80} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { dot: "#22c55e", label: "COD settled",  val: codPaid    },
            { dot: "#f59e0b", label: "COD pending",  val: codPending },
            { dot: "#3b82f6", label: "Online paid",  val: onlinePaid },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 7, fontFamily: 'inherit' }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.dot, flexShrink: 0 }} />
                {r.label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: r.dot, fontFamily: 'inherit' }}>{r.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Action Button ─────────────────────────────────────────────────────────────
function ActionBtn({ label, icon: Icon, onClick, disabled, color, bg, border }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 12, fontWeight: 600,
        padding: "7px 14px", borderRadius: 8,
        display: "flex", alignItems: "center", gap: 6,
        background: disabled ? "#f8fafc" : bg,
        color: disabled ? "#94a3b8" : color,
        border: `1px solid ${disabled ? "#e2e8f0" : border}`,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: 'inherit',
        transition: "opacity 0.15s, transform 0.1s",
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.82"; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = "1"; }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {label}
    </button>
  );
}

// ── Order Row ─────────────────────────────────────────────────────────────────
function OrderRow({ order, onStatusUpdate, onPaymentSettle, updating }) {
  const [expanded, setExpanded] = useState(false);

  const oStyle = orderStatusStyle(order.orderStatus);
  const pStyle = paymentStatusStyle(order.paymentStatus);
  const isCOD  = (order.paymentMethod || "").toLowerCase() === "cod";
  const status        = (order.orderStatus  || "pending").toLowerCase();
  const paymentStatus = (order.paymentStatus || "pending").toLowerCase();
  const isTerminal    = status === "delivered" || status === "cancelled";
  const isPaid        = paymentStatus === "paid";
  const borderColor   = statusBorderColor(order);

  const createdAt = order.createdAt?._seconds
    ? new Date(order.createdAt._seconds * 1000).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return (
    <div style={{
      background: C.surface,
      borderRadius: 12,
      border: `1px solid ${C.border}`,
      borderLeft: `3.5px solid ${borderColor}`,
      overflow: "hidden",
      transition: "box-shadow 0.15s",
      boxShadow: expanded ? "0 4px 16px rgba(0,0,0,0.07)" : "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      {/* Paid accent strip */}
      {isPaid && (
        <div style={{ height: 2, background: "linear-gradient(90deg,#22c55e,#86efac)", width: "100%" }} />
      )}

      {/* Summary row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1.1fr 0.7fr 1fr 1fr 90px",
        gap: 12, padding: "13px 18px", alignItems: "center",
      }}>
        {/* Customer */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: 'inherit' }}>
              {order.customerName || "—"}
            </span>
            {isCOD && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6,
                background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>COD</span>
            )}
            {isPaid && isCOD && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6,
                background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0",
                textTransform: "uppercase", letterSpacing: "0.06em",
                display: "inline-flex", alignItems: "center", gap: 3,
              }}>
                <BadgeCheck size={9} />Settled
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3, display: "flex", alignItems: "center", gap: 4, fontFamily: 'inherit' }}>
            <Phone size={10} /> {order.phone || "—"}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, display: "flex", alignItems: "center", gap: 4, fontFamily: 'inherit' }}>
            <MapPin size={10} /> {order.address || "—"}
          </div>
        </div>

        {/* Date */}
        <div style={{ fontSize: 11, color: C.textSoft, fontFamily: 'inherit' }}>{createdAt}</div>

        {/* Items */}
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: 'inherit' }}>
          {order.types?.length ?? 0} item{order.types?.length !== 1 ? "s" : ""}
        </div>

        {/* Payment */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <Badge
            label={order.paymentMethod || "—"}
            style={{ bg: "#f8fafc", color: "#475569", border: "#e2e8f0", dot: "#94a3b8" }}
          />
          <Badge label={order.paymentStatus || "pending"} style={pStyle} />
        </div>

        {/* Order status */}
        <Badge label={order.orderStatus || "pending"} style={oStyle} />

        {/* Toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            fontSize: 12, fontWeight: 600, padding: "7px 12px",
            borderRadius: 8, background: expanded ? "#eff6ff" : "#f8fafc",
            border: `1px solid ${expanded ? "#bfdbfe" : C.border}`,
            color: expanded ? "#1d4ed8" : C.textSoft,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            fontFamily: 'inherit', transition: "all 0.15s",
          }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? "Hide" : "Details"}
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{
          borderTop: `1px solid ${C.border}`,
          padding: "16px 18px",
          background: "#fafbfc",
        }}>
          {/* Settled banner */}
          {isPaid && isCOD && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: 10, marginBottom: 14,
              background: "#f0fdf4", border: "1px solid #bbf7d0",
            }}>
              <BadgeCheck size={15} color="#15803d" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#15803d", fontFamily: 'inherit' }}>
                Cash payment has been settled for this order
              </span>
            </div>
          )}

          {/* Order items */}
          {order.types && order.types.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontFamily: 'inherit' }}>
                Order items
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {order.types.map((item, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: C.surface, borderRadius: 9,
                    padding: "10px 14px", border: `1px solid ${C.border}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.name} style={{
                          width: 38, height: 38, borderRadius: 7,
                          objectFit: "cover", border: `1px solid ${C.border}`,
                        }} />
                      )}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: 'inherit' }}>{item.name || "—"}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'inherit' }}>Code: {item.id || "—"}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", fontFamily: 'inherit' }}>
                        {item.quantity ? `×${item.quantity}` : ""}
                      </div>
                      {item.price && (
                        <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'inherit' }}>Rs. {item.price}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          {order.totalnumber !== undefined && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 9, padding: "7px 14px",
                fontSize: 13, fontWeight: 600, color: "#2563eb",
                fontFamily: 'inherit',
              }}>
                Total items: {order.totalnumber}
              </div>
            </div>
          )}

          {/* Feedback */}
          {order.feedback && (
            <div style={{
              background: "#f8fbff", border: "1px solid #dbeafe",
              borderRadius: 9, padding: "10px 14px", marginBottom: 14,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, fontFamily: 'inherit' }}>
                Customer feedback
              </div>
              <div style={{ fontSize: 13, color: C.textSoft, fontFamily: 'inherit' }}>{order.feedback}</div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ActionBtn
              label="Approve" icon={Check}
              disabled={isTerminal || status === "approved" || status === "processing" || updating}
              onClick={() => onStatusUpdate(order.id, "approved")}
              color="#15803d" bg="#f0fdf4" border="#bbf7d0"
            />
            <ActionBtn
              label="Mark delivered" icon={Truck}
              disabled={isTerminal || updating}
              onClick={() => onStatusUpdate(order.id, "delivered")}
              color="#1d4ed8" bg="#eff6ff" border="#bfdbfe"
            />
            <ActionBtn
              label="Processing" icon={Settings}
              disabled={isTerminal || status === "processing" || updating}
              onClick={() => onStatusUpdate(order.id, "processing")}
              color="#7e22ce" bg="#faf5ff" border="#e9d5ff"
            />
            <ActionBtn
              label="Cancel" icon={X}
              disabled={isTerminal || updating}
              onClick={() => onStatusUpdate(order.id, "cancelled")}
              color="#b91c1c" bg="#fef2f2" border="#fecaca"
            />
            {isCOD && (
              <ActionBtn
                label="Payment settled" icon={Banknote}
                disabled={isPaid || updating}
                onClick={() => onPaymentSettle(order.id)}
                color="#15803d" bg="#f0fdf4" border="#bbf7d0"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 50,
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 18px", borderRadius: 12,
      background: type === "success" ? "#15803d" : "#b91c1c",
      color: "#fff", fontSize: 13, fontWeight: 600,
      fontFamily: 'inherit', minWidth: 260,
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      animation: "slideInUp 0.22s ease",
    }}>
      {type === "success" ? <BadgeCheck size={16} /> : <AlertCircle size={16} />}
      {message}
    </div>
  );
}

// ── Filter Button ─────────────────────────────────────────────────────────────
function FilterBtn({ active, label, onClick, accentColor, accentBg, accentBorder }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12, fontWeight: 600,
        padding: "7px 14px", borderRadius: 8,
        border: `1px solid ${active ? accentBorder : C.border}`,
        background: active ? accentBg : C.surface,
        color: active ? accentColor : C.textSoft,
        cursor: "pointer", fontFamily: 'inherit',
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

// ── Main Orders Page ──────────────────────────────────────────────────────────
export default function Orders() {
  const [orders,   setOrders]   = useState([]);
  const [filter,   setFilter]   = useState("all");
  const [search,   setSearch]   = useState("");
  const [updating, setUpdating] = useState(false);
  const [toast,    setToast]    = useState(null);

  // ── Fetch (unchanged paths) ────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/pharmacist/orders`);
      const data = await res.json();
      data.sort((a, b) => (b.createdAt?._seconds ?? 0) - (a.createdAt?._seconds ?? 0));
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 300000); // 5 minutes instead of 30s to save Firebase limit
    return () => clearInterval(interval);
  }, [fetchAll]);

  // ── Status update (unchanged) ──────────────────────────────────────────────
  const handleStatusUpdate = async (id, status) => {
    setUpdating(true);
    const prev = orders;
    setOrders(o => o.map(x => x.id === id ? { ...x, orderStatus: status } : x));
    try {
      const res = await fetch(`${API_BASE}/pharmacist/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: status }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchAll();
      setToast({ message: `Order marked as ${status}`, type: "success" });
    } catch (err) {
      setOrders(prev);
      setToast({ message: `Failed to update: ${err.message}`, type: "error" });
    } finally {
      setUpdating(false);
    }
  };

  // ── Payment settle (unchanged path) ───────────────────────────────────────
  const handlePaymentSettle = async (orderId) => {
    setUpdating(true);
    const prev = orders;
    setOrders(o => o.map(x => x.id === orderId ? { ...x, paymentStatus: "paid" } : x));
    try {
      const res = await fetch(
        `${(import.meta.env.VITE_API_URL_RAILWAY && import.meta.env.VITE_API_URL_RAILWAY !== 'undefined' ? import.meta.env.VITE_API_URL_RAILWAY : 'http://localhost:5000')}/api/customer-orders/${orderId}/settle-payment`,
        { method: "PUT", headers: { "Content-Type": "application/json" } }
      );
      if (!res.ok) throw new Error(await res.text());
      await fetchAll();
      setToast({ message: "Payment settled successfully!", type: "success" });
    } catch (err) {
      setOrders(prev);
      setToast({ message: `Failed to settle payment: ${err.message}`, type: "error" });
    } finally {
      setUpdating(false);
    }
  };

  // ── Derived counts ─────────────────────────────────────────────────────────
  const total      = orders.length;
  const pending    = orders.filter(o => (o.orderStatus || "Pending-COD") === "Pending-COD").length;
  
  const delivered  = orders.filter(o => o.orderStatus === "delivered").length;
  const cancelled  = orders.filter(o => o.orderStatus === "cancelled").length;
  const approved   = orders.filter(o => o.orderStatus === "approved").length;
  const processing = orders.filter(o => o.orderStatus === "processing").length;
  const cod        = orders.filter(o => (o.paymentMethod || "").toLowerCase() === "cod").length;
  const codSettled = orders.filter(o =>
    (o.paymentMethod  || "").toLowerCase() === "cod" &&
    (o.paymentStatus  || "").toLowerCase() === "paid"
  ).length;
  const paidOrders = orders.filter(o => (o.paymentStatus || "").toLowerCase() === "paid").length;

  // ── Filter logic ───────────────────────────────────────────────────────────
  const visible = orders.filter(o => {
    const matchFilter =
      filter === "all"        ? true :
      filter === "pending"    ? (o.orderStatus || "pending") === "pending" :
      filter === "approved"   ? o.orderStatus === "approved"   :
      filter === "processing" ? o.orderStatus === "processing" :
      filter === "delivered"  ? o.orderStatus === "delivered"  :
      filter === "cancelled"  ? o.orderStatus === "cancelled"  :
      filter === "cod"        ? (o.paymentMethod || "").toLowerCase() === "cod" :
      filter === "paid"       ? (o.paymentStatus || "").toLowerCase() === "paid" : true;

    const matchSearch =
      !search ||
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.phone?.toLowerCase().includes(search.toLowerCase()) ||
      o.address?.toLowerCase().includes(search.toLowerCase());

    return matchFilter && matchSearch;
  });

  const filters = [
    { key: "all",        label: `All (${total})`,              accent: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
    { key: "pending",    label: `Pending (${pending})`,        accent: "#b45309", bg: "#fffbeb", border: "#fde68a" },
    { key: "approved",   label: `Approved (${approved})`,      accent: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
    { key: "processing", label: `Processing (${processing})`,  accent: "#7e22ce", bg: "#faf5ff", border: "#e9d5ff" },
    { key: "delivered",  label: `Delivered (${delivered})`,    accent: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
    { key: "cancelled",  label: `Cancelled (${cancelled})`,    accent: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
    { key: "cod",        label: `COD (${cod})`,                accent: "#b45309", bg: "#fffbeb", border: "#fde68a" },
    { key: "paid",       label: `Paid (${paidOrders})`,        accent: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Orders</h1>
            <p className="text-slate-500 font-medium mt-1">Manage orders, approve delivery, and handle payments</p>
          </div>
          {updating && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 14px", borderRadius: 10,
              background: "#eff6ff", border: "1px solid #bfdbfe",
              fontSize: 12, fontWeight: 600, color: "#1d4ed8",
              fontFamily: 'inherit',
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: "50%",
                border: "2px solid #bfdbfe",
                borderTopColor: "#2563eb",
                animation: "spin 0.7s linear infinite",
              }} />
              Updating…
            </div>
          )}
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
          <StatCard icon={ShoppingCart} label="Total orders"      value={total}      color="#2563eb" bg="#eff6ff" />
          <StatCard icon={Clock}        label="Pending"            value={pending}    color="#b45309" bg="#fffbeb" />
          <StatCard icon={CheckCircle}  label="Delivered"          value={delivered}  color="#15803d" bg="#f0fdf4" />
          <StatCard icon={XCircle}      label="Cancelled"          value={cancelled}  color="#b91c1c" bg="#fef2f2" />
          <StatCard icon={Banknote}     label="COD orders"         value={cod}        color="#b45309" bg="#fffbeb" />
          <StatCard icon={BadgeCheck}   label="Payment settled"    value={codSettled} color="#15803d" bg="#f0fdf4" />
        </div>

        {/* ── Charts ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
          <WeeklyChart  orders={orders} />
          <PaymentChart orders={orders} />
        </div>

        {/* ── Filter tabs + search ── */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
          {filters.map(f => (
            <FilterBtn
              key={f.key}
              active={filter === f.key}
              label={f.label}
              onClick={() => setFilter(f.key)}
              accentColor={f.accent}
              accentBg={f.bg}
              accentBorder={f.border}
            />
          ))}
          <input
            placeholder="Search name, phone, address…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              marginLeft: "auto", padding: "7px 12px",
              fontSize: 12, borderRadius: 8, outline: "none",
              border: `1px solid ${C.border}`, background: C.surface,
              color: C.textPrimary, fontFamily: 'inherit', width: 220,
            }}
          />
        </div>

        {/* ── Table header ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.1fr 0.7fr 1fr 1fr 90px",
          gap: 12, padding: "10px 18px",
          background: "linear-gradient(135deg,#f0f9ff,#f8fafc)",
          border: `1px solid ${C.border}`,
          borderRadius: "12px 12px 0 0",
          borderBottom: "none",
        }}>
          {["Customer", "Date", "Items", "Payment", "Status", ""].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: 'inherit' }}>
              {h}
            </div>
          ))}
        </div>

        {/* ── Order list ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
          {visible.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "56px 20px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: "0 0 12px 12px",
            }}>
              <Package size={40} color={C.textMuted} style={{ margin: "0 auto 12px" }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: C.textSoft, fontFamily: 'inherit' }}>No orders found</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontFamily: 'inherit' }}>Try changing your filter or search query</div>
            </div>
          ) : (
            visible.map(order => (
              <OrderRow
                key={order.id}
                order={order}
                onStatusUpdate={handleStatusUpdate}
                onPaymentSettle={handlePaymentSettle}
                updating={updating}
              />
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textMuted, fontFamily: 'inherit' }}>
            <RefreshCw size={11} />
            Auto-refreshes every 30 seconds
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, fontFamily: 'inherit' }}>
            Showing <strong style={{ color: "#2563eb" }}>{visible.length}</strong> of <strong style={{ color: C.textPrimary }}>{total}</strong> orders
          </div>
        </div>

      {/* ── Toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}