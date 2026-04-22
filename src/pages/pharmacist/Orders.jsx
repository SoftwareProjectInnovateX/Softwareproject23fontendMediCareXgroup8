
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import {
  ShoppingCart, Clock, CheckCircle, XCircle,
  Phone, MapPin, ChevronDown, ChevronUp,
  Truck, Settings, Check, X
} from "lucide-react";

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

/** Maps order status to bg/text/border colour triple */
function orderStatusStyle(status) {
  switch ((status || "").toLowerCase()) {
    case "delivered":  return { bg: "rgba(16,185,129,0.1)",  color: "#059669", border: "rgba(16,185,129,0.25)" };
    case "approved":   return { bg: "rgba(26,135,225,0.1)",  color: "#1a87e1", border: "rgba(26,135,225,0.25)" };
    case "cancelled":  return { bg: "rgba(239,68,68,0.1)",   color: "#dc2626", border: "rgba(239,68,68,0.25)"  };
    case "processing": return { bg: "rgba(139,92,246,0.1)",  color: "#7c3aed", border: "rgba(139,92,246,0.25)" };
    default:           return { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.25)" };
  }
}

/** Maps payment status to colour triple */
function paymentStatusStyle(status) {
  switch ((status || "").toLowerCase()) {
    case "paid":    return { bg: "rgba(16,185,129,0.1)",  color: "#059669", border: "rgba(16,185,129,0.25)" };
    case "failed":  return { bg: "rgba(239,68,68,0.1)",   color: "#dc2626", border: "rgba(239,68,68,0.25)"  };
    default:        return { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.25)" };
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/** StatCard – summary metric tile (shared pattern across admin pages) */
function StatCard({ icon: Icon, label, value, iconBg, iconColor }) {
  return (
    <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[14px] px-5 py-[18px] flex items-center gap-[14px] shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
      <div
        className="w-11 h-11 rounded-[11px] shrink-0 flex items-center justify-center"
        style={{ background: iconBg }}
      >
        <Icon size={20} color={iconColor} strokeWidth={2} />
      </div>
      <div>
        <div className="text-[11px] text-[#64748b] uppercase tracking-[0.08em] font-semibold">
          {label}
        </div>
        <div className="text-[24px] font-bold text-[#1e293b] leading-[1.2] mt-[2px]">
          {value}
        </div>
      </div>
    </div>
  );
}

/** Badge – generic coloured pill, style passed as a pre-computed object */
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

/**
 * ActionBtn – inline action button used inside the expanded order detail.
 * Automatically dims when disabled (order already in target/final state).
 */
function ActionBtn({ label, icon: Icon, onClick, disabled, color, bg, border }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-[12px] font-semibold px-[14px] py-[7px] rounded-lg flex items-center gap-[6px] font-['DM_Sans',sans-serif] transition-all duration-150"
      style={{
        background: disabled ? "#f1f5f9" : bg,
        color:      disabled ? C.textMuted : color,
        border:     `1px solid ${disabled ? C.border : border}`,
        cursor:     disabled ? "not-allowed" : "pointer",
      }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {label}
    </button>
  );
}

/**
 * OrderRow – a single collapsible order card.
 * Summary row always visible; expanded section shows items, total, feedback, and actions.
 */
function OrderRow({ order, onStatusUpdate, updating }) {
  const [expanded, setExpanded] = useState(false);
  const oStyle = orderStatusStyle(order.orderStatus);
  const pStyle = paymentStatusStyle(order.paymentStatus);

  // Format Firestore Timestamp to readable date-time string
  const createdAt = order.createdAt?.toDate
    ? order.createdAt.toDate().toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return (
    <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(26,135,225,0.06)]">

      {/* ── Summary row (always visible) ── */}
      <div
        className="grid px-[18px] py-[14px] items-center gap-3"
        style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto" }}
      >
        {/* Customer info */}
        <div>
          <p className="text-[13px] font-semibold text-[#1e293b]">{order.customerName || "—"}</p>
          <p className="text-[11px] text-[#64748b] mt-[3px] flex items-center gap-1">
            <Phone size={11} /> {order.phone || "—"}
          </p>
          <p className="text-[11px] text-[#64748b] mt-[2px] flex items-center gap-1">
            <MapPin size={11} /> {order.address || "—"}
          </p>
        </div>

        <div className="text-[11px] text-[#475569]">{createdAt}</div>

        {/* Item count derived from the types array length */}
        <div className="text-[13px] font-semibold text-[#1e293b]">
          {order.types?.length ?? 0} item{order.types?.length !== 1 ? "s" : ""}
        </div>

        {/* Payment method + payment status stacked */}
        <div className="flex flex-col gap-[5px]">
          <Badge label={order.paymentMethod || "—"} style={{ bg: "rgba(26,135,225,0.08)", color: "#1a87e1", border: "rgba(26,135,225,0.2)" }} />
          <Badge label={order.paymentStatus || "pending"} style={pStyle} />
        </div>

        <Badge label={order.orderStatus || "pending"} style={oStyle} />

        {/* Expand / collapse toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="bg-[#f1f5f9] border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[6px] cursor-pointer text-[#475569] text-[12px] font-['DM_Sans',sans-serif] flex items-center gap-[5px] font-semibold"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? "Hide" : "Details"}
        </button>
      </div>

      {/* ── Expanded detail section ── */}
      {expanded && (
        <div className="border-t border-[rgba(26,135,225,0.18)] px-[18px] py-4 bg-[#f8fafc]">

          {/* Order items list */}
          {order.types && order.types.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-[0.08em] mb-[10px]">
                Order Items
              </p>
              <div className="flex flex-col gap-2">
                {order.types.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center bg-white rounded-lg px-[14px] py-[10px] border border-[rgba(26,135,225,0.18)]"
                  >
                    <div className="flex items-center gap-[10px]">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-10 h-10 rounded-[6px] object-cover border border-[rgba(26,135,225,0.18)]"
                        />
                      )}
                      <div>
                        <p className="text-[13px] font-semibold text-[#1e293b]">{item.name || "—"}</p>
                        <p className="text-[11px] text-[#64748b]">Code: {item.id || "—"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold text-[#1a87e1]">
                        {item.quantity ? `x${item.quantity}` : ""}
                      </p>
                      {item.price && (
                        <p className="text-[11px] text-[#64748b]">Rs. {item.price}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total item count summary */}
          {order.totalnumber !== undefined && (
            <div className="flex justify-end mb-4">
              <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-4 py-2 text-[13px] font-semibold text-[#1a87e1]">
                Total Items: {order.totalnumber}
              </div>
            </div>
          )}

          {/* Customer feedback (optional field) */}
          {order.feedback && (
            <div className="bg-[rgba(26,135,225,0.04)] border border-[rgba(26,135,225,0.15)] rounded-lg px-[14px] py-[10px] mb-4">
              <p className="text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-[0.08em]">
                Customer Feedback
              </p>
              <p className="text-[13px] text-[#475569]">{order.feedback}</p>
            </div>
          )}

          {/* Status action buttons – disabled states prevent illegal transitions */}
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
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [updating, setUpdating] = useState(false); // global write lock to prevent double-updates

  // Real-time listener – sorted client-side by createdAt descending
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "CustomerOrders"), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setOrders(data);
    });
    return () => unsub();
  }, []);

  /** Updates a single order's orderStatus field in Firestore */
  const handleStatusUpdate = async (id, status) => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, "CustomerOrders", id), { orderStatus: status });
    } catch (err) {
      alert(`Failed to update: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // Derived counts for stat cards and filter tab labels
  const total      = orders.length;
  const pending    = orders.filter(o => (o.orderStatus || "pending") === "pending").length;
  const delivered  = orders.filter(o => o.orderStatus === "delivered").length;
  const cancelled  = orders.filter(o => o.orderStatus === "cancelled").length;

  /** Filters orders by the active tab key and search string */
  const visible = orders.filter(o => {
    const matchFilter =
      filter === "all"        ? true :
      filter === "pending"    ? (o.orderStatus || "pending") === "pending" :
      filter === "approved"   ? o.orderStatus === "approved"   :
      filter === "processing" ? o.orderStatus === "processing" :
      filter === "delivered"  ? o.orderStatus === "delivered"  :
      filter === "cancelled"  ? o.orderStatus === "cancelled"  : true;

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
        <h1 className="font-['Playfair_Display',serif] text-[26px] text-[#1e293b] font-semibold">
          Orders
        </h1>
        <p className="text-[13px] text-[#64748b] mt-[5px]">
          Manage orders, approve delivery, and handle feedback.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-4 gap-[14px] mb-6">
        <StatCard icon={ShoppingCart} label="Total Orders" value={total}     iconBg="rgba(26,135,225,0.1)"  iconColor="#1a87e1" />
        <StatCard icon={Clock}        label="Pending"       value={pending}   iconBg="rgba(245,158,11,0.1)"  iconColor="#d97706" />
        <StatCard icon={CheckCircle}  label="Delivered"     value={delivered} iconBg="rgba(16,185,129,0.1)"  iconColor="#059669" />
        <StatCard icon={XCircle}      label="Cancelled"     value={cancelled} iconBg="rgba(239,68,68,0.1)"   iconColor="#dc2626" />
      </div>

      {/* ── Filter tabs + search ── */}
      <div className="flex gap-2 mb-[18px] flex-wrap items-center">
        {[
          { key: "all",        label: `All (${total})`           },
          { key: "pending",    label: `Pending (${pending})`     },
          { key: "approved",   label: "Approved"                 },
          { key: "processing", label: "Processing"               },
          { key: "delivered",  label: `Delivered (${delivered})` },
          { key: "cancelled",  label: `Cancelled (${cancelled})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[12px] font-semibold px-[14px] py-[7px] rounded-lg cursor-pointer font-['DM_Sans',sans-serif] transition-all duration-150 border ${
              filter === f.key
                ? "bg-[rgba(26,135,225,0.12)] text-[#1a87e1] border-[rgba(26,135,225,0.35)]"
                : "bg-white text-[#475569] border-[rgba(26,135,225,0.18)]"
            }`}
          >
            {f.label}
          </button>
        ))}

        <input
          placeholder="Search by name, phone, address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[7px] text-[12px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-60"
        />
      </div>

      {/* ── Table column header ── */}
      <div
        className="grid px-[18px] py-[10px] gap-3 bg-[#e0f2fe] border border-[rgba(26,135,225,0.18)] rounded-[10px_10px_0_0]"
        style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto" }}
      >
        {["Customer", "Date", "Items", "Payment", "Status", ""].map((h, i) => (
          <div key={i} className="text-[11px] font-bold text-[#1a87e1] uppercase tracking-[0.08em]">
            {h}
          </div>
        ))}
      </div>

      {/* ── Order rows ── */}
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