import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, Clock, CheckCircle, XCircle,
  Phone, Hash, ChevronDown, ChevronUp, Check, X
} from "lucide-react";

// Base URL for all pharmacist return API calls
const API_BASE = "http://localhost:5000/api/pharmacist/returns";

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

// ── Typography ────────────────────────────────────────────────────────────────
const FONT = {
  display: "'Playfair Display', serif",
  body:    "'DM Sans', sans-serif",
};

// Returns colour tokens based on return request status (approved / rejected / pending)
function returnStatusStyle(status) {
  switch ((status || "").toLowerCase()) {
    case "approved": return { bg: "rgba(16,185,129,0.1)",  color: "#059669", border: "rgba(16,185,129,0.25)" };
    case "rejected": return { bg: "rgba(239,68,68,0.1)",   color: "#dc2626", border: "rgba(239,68,68,0.25)"  };
    default:         return { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.25)" };
  }
}

// Returns colour tokens based on refund status (processed / rejected / pending)
function refundStatusStyle(status) {
  switch ((status || "").toLowerCase()) {
    case "processed": return { bg: "rgba(16,185,129,0.1)",  color: "#059669", border: "rgba(16,185,129,0.25)" };
    case "rejected":  return { bg: "rgba(239,68,68,0.1)",   color: "#dc2626", border: "rgba(239,68,68,0.25)"  };
    default:          return { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.25)" };
  }
}

// Pill-shaped status label
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

// Summary card shown at the top of the page (e.g. Total Returns, Pending, Approved)
function StatCard({ icon: Icon, label, value, iconBg, iconColor }) {
  return (
    <div
      className="bg-white rounded-[14px] p-[18px_20px] flex items-center gap-[14px]"
      style={{ border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(26,135,225,0.07)" }}
    >
      {/* Coloured icon container */}
      <div
        className="w-11 h-11 rounded-[11px] shrink-0 flex items-center justify-center"
        style={{ background: iconBg }}
      >
        <Icon size={20} color={iconColor} strokeWidth={2} />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.08em] font-semibold" style={{ color: C.textMuted }}>
          {label}
        </div>
        <div className="text-2xl font-bold leading-[1.2] mt-0.5" style={{ color: C.textPrimary }}>
          {value}
        </div>
      </div>
    </div>
  );
}

// Generic action button used for Approve & Restock / Reject Return
function ActionBtn({ label, icon: Icon, onClick, disabled, color, bg, border }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-xs font-semibold px-[14px] py-[7px] rounded-lg flex items-center gap-[6px] transition-all duration-150"
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

// ── ReturnRow ─────────────────────────────────────────────────────────────────

// Renders a single return request as a collapsible row.
// Pharmacist can expand it to review items, add an adjustment note,
// then approve (restock) or reject the return.
function ReturnRow({ ret, onAction, updating }) {
  // Controls whether the detail panel is visible
  const [expanded, setExpanded] = useState(false);

  // Local state for the pharmacist's adjustment note — pre-filled if one already exists
  const [adjNote, setAdjNote]   = useState(ret.adjustmentNote || "");

  const rs = returnStatusStyle(ret.returnStatus);
  const rf = refundStatusStyle(ret.refundStatus);

  // Convert Firestore timestamp (_seconds) to a readable date string
  const createdAt = ret.createdAt?._seconds
    ? new Date(ret.createdAt._seconds * 1000).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return (
    <div
      className="bg-white rounded-xl overflow-hidden"
      style={{ border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(26,135,225,0.06)" }}
    >
      {/* ── Collapsed summary row ── */}
      <div
        className="grid items-center gap-3 px-[18px] py-[14px]"
        style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto" }}
      >
        {/* Customer info: name, phone, and truncated order ID */}
        <div>
          <p className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>{ret.customerName || "—"}</p>
          <p className="text-[11px] mt-[3px] flex items-center gap-1" style={{ color: C.textMuted }}>
            <Phone size={11} /> {ret.phone || "—"}
          </p>
          <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: C.textMuted }}>
            {/* Show first 8 chars of orderId to keep the row compact */}
            <Hash size={11} /> Order: {ret.orderId?.slice(0, 8)}...
          </p>
        </div>

        {/* Return request creation date */}
        <div className="text-[11px]" style={{ color: C.textSoft }}>{createdAt}</div>

        {/* Number of distinct items in the return */}
        <div className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>
          {ret.items?.length ?? 0} item{ret.items?.length !== 1 ? "s" : ""}
        </div>

        {/* Calculated refund amount */}
        <div className="text-sm font-bold text-[#059669]">
          Rs. {(ret.refundAmount || 0).toFixed(2)}
        </div>

        {/* Return status and refund status badges stacked vertically */}
        <div className="flex flex-col gap-[5px]">
          <Badge label={ret.returnStatus || "pending"} style={rs} />
          <Badge label={`Refund: ${ret.refundStatus || "pending"}`} style={rf} />
        </div>

        {/* Toggle details panel */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="bg-[#f1f5f9] rounded-lg px-3 py-[6px] cursor-pointer text-xs font-semibold flex items-center gap-[5px]"
          style={{ border: `1px solid ${C.border}`, color: C.textSoft, fontFamily: FONT.body }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? "Hide" : "Details"}
        </button>
      </div>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div className="border-t px-[18px] py-4 bg-[#f8fafc]" style={{ borderColor: C.border }}>

          {/* Returned items list with product code, quantity, reason, and line total */}
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-[10px]" style={{ color: C.textMuted }}>
            Returned Items
          </p>
          <div className="flex flex-col gap-2 mb-4">
            {ret.items?.map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center bg-white rounded-lg px-[14px] py-[10px]"
                style={{ border: `1px solid ${C.border}` }}
              >
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>{item.name}</p>
                  <p className="text-[11px]" style={{ color: C.textMuted }}>
                    {/* productCode may be missing for legacy records */}
                    Code: {item.productCode || "⚠️ missing"} · Qty: {item.quantity} · Reason: {item.reason}
                  </p>
                </div>
                {/* Line total: unit price × quantity */}
                <p className="text-[13px] font-semibold" style={{ color: C.accent }}>
                  Rs. {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Customer note submitted with the return request, if any */}
          {ret.adjustmentNote && (
            <div
              className="rounded-lg px-[14px] py-[10px] mb-4"
              style={{ background: "rgba(26,135,225,0.04)", border: "1px solid rgba(26,135,225,0.15)" }}
            >
              <p className="text-[11px] font-bold uppercase mb-1" style={{ color: C.textMuted }}>Customer Note</p>
              <p className="text-[13px]" style={{ color: C.textSoft }}>{ret.adjustmentNote}</p>
            </div>
          )}

          {/* Pharmacist can write an internal adjustment note before approving or rejecting.
              The textarea is locked once the return is no longer pending.              */}
          <div className="mb-4">
            <label
              className="text-[11px] font-bold uppercase tracking-[0.08em] block mb-[6px]"
              style={{ color: C.textMuted }}
            >
              Pharmacist Adjustment Note
            </label>
            <textarea
              value={adjNote}
              onChange={e => setAdjNote(e.target.value)}
              placeholder="Add note about this return/adjustment..."
              rows={2}
              disabled={ret.returnStatus !== "pending"}
              className="w-full bg-white rounded-lg px-3 py-2 text-xs outline-none resize-y box-border"
              style={{
                border: `1px solid rgba(26,135,225,0.4)`,
                color: C.textPrimary,
                fontFamily: FONT.body,
                // Visually dim the textarea once the return has been actioned
                opacity: ret.returnStatus !== "pending" ? 0.5 : 1,
              }}
            />
          </div>

          {/* ── Action buttons — only enabled while the return is still pending ── */}
          <div className="flex gap-2 flex-wrap">
            {/* Approve: marks return as approved, triggers refund processing and stock restock */}
            <ActionBtn
              label="Approve & Restock" icon={Check}
              disabled={ret.returnStatus !== "pending" || updating}
              onClick={() => onAction(ret.id, "approved", "processed", adjNote, ret.items)}
              color="#059669" bg="rgba(16,185,129,0.1)" border="rgba(16,185,129,0.25)"
            />
            {/* Reject: marks return as rejected, no refund or restock occurs */}
            <ActionBtn
              label="Reject Return" icon={X}
              disabled={ret.returnStatus !== "pending" || updating}
              onClick={() => onAction(ret.id, "rejected", "rejected", adjNote, [])}
              color="#dc2626" bg="rgba(239,68,68,0.1)" border="rgba(239,68,68,0.25)"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

// Returns page — fetches all return requests, displays summary stats,
// filter tabs, search, and a list of ReturnRow components.
export default function Returns() {
  const [returns, setReturns]   = useState([]);
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [updating, setUpdating] = useState(false); // prevents double-submission during API calls

  // Fetches all return requests from the API
  const fetchReturns = useCallback(async () => {
    try {
      const res  = await fetch(API_BASE);
      const data = await res.json();
      setReturns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch returns:", err);
    }
  }, []);

  // Initial fetch + poll every 30 seconds for live updates
  useEffect(() => {
    fetchReturns();
    const interval = setInterval(fetchReturns, 30000);
    return () => clearInterval(interval);
  }, [fetchReturns]);

  // Handles approve or reject actions.
  // Approve  → PUT /returns/:id/approve (restocks items)
  // Reject   → PUT /returns/:id/reject  (no restock)
  const handleAction = async (id, returnStatus, refundStatus, adjNote, items) => {
    setUpdating(true);
    try {
      if (returnStatus === "approved") {
        // Approve + restock via dedicated endpoint
        const res = await fetch(`${API_BASE}/${id}/approve`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ adjNote, items }),
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        // Reject via dedicated endpoint
        const res = await fetch(`${API_BASE}/${id}/reject`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ adjNote }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      await fetchReturns();
    } catch (err) {
      console.error("handleAction error:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // ── Derived counts for stat cards and filter tab labels ───────────────────
  const total    = returns.length;
  const pending  = returns.filter(r => (r.returnStatus || "pending") === "pending").length;
  const approved = returns.filter(r => r.returnStatus === "approved").length;
  const rejected = returns.filter(r => r.returnStatus === "rejected").length;

  // Apply active filter tab and search query to produce the visible subset
  const visible = returns.filter(r => {
    const matchFilter =
      filter === "all"      ? true :
      filter === "pending"  ? (r.returnStatus || "pending") === "pending" :
      filter === "approved" ? r.returnStatus === "approved" :
      filter === "rejected" ? r.returnStatus === "rejected" : true;

    // Search matches against customer name, phone, or order ID
    const matchSearch =
      !search ||
      r.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      r.phone?.toLowerCase().includes(search.toLowerCase()) ||
      r.orderId?.toLowerCase().includes(search.toLowerCase());

    return matchFilter && matchSearch;
  });

  return (
    <div style={{ fontFamily: FONT.body }}>
      {/* ── Page heading ── */}
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold" style={{ fontFamily: FONT.display, color: C.textPrimary }}>
          Returns &amp; Adjustments
        </h1>
        <p className="text-[13px] mt-[5px]" style={{ color: C.textMuted }}>
          Process customer returns, refunds, and stock adjustments.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-4 gap-[14px] mb-6">
        <StatCard icon={RefreshCw}   label="Total Returns" value={total}    iconBg="rgba(26,135,225,0.1)"  iconColor="#1a87e1" />
        <StatCard icon={Clock}       label="Pending"       value={pending}  iconBg="rgba(245,158,11,0.1)"  iconColor="#d97706" />
        <StatCard icon={CheckCircle} label="Approved"      value={approved} iconBg="rgba(16,185,129,0.1)"  iconColor="#059669" />
        <StatCard icon={XCircle}     label="Rejected"      value={rejected} iconBg="rgba(239,68,68,0.1)"   iconColor="#dc2626" />
      </div>

      {/* ── Filter tabs + search bar ── */}
      <div className="flex gap-2 mb-[18px] flex-wrap items-center">
        {[
          { key: "all",      label: `All (${total})`         },
          { key: "pending",  label: `Pending (${pending})`   },
          { key: "approved", label: `Approved (${approved})` },
          { key: "rejected", label: `Rejected (${rejected})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="text-xs font-semibold px-[14px] py-[7px] rounded-lg cursor-pointer"
            style={{
              fontFamily: FONT.body,
              // Active tab gets a blue tint
              background: filter === f.key ? "rgba(26,135,225,0.12)" : C.surface,
              color:      filter === f.key ? C.accent : C.textSoft,
              border:     filter === f.key ? "1px solid rgba(26,135,225,0.35)" : `1px solid ${C.border}`,
            }}
          >
            {f.label}
          </button>
        ))}

        {/* Live search — filters by customer name, phone, or order ID */}
        <input
          placeholder="Search by name, phone, order ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto bg-white rounded-lg px-3 py-[7px] text-xs outline-none w-60"
          style={{ border: `1px solid ${C.border}`, color: C.textPrimary, fontFamily: FONT.body }}
        />
      </div>

      {/* ── Table header row ── */}
      <div
        className="grid px-[18px] py-[11px] gap-3 bg-[#e0f2fe] rounded-t-[10px]"
        style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", border: `1px solid ${C.border}` }}
      >
        {["Customer", "Date", "Items", "Refund", "Status", ""].map((h, i) => (
          <div key={i} className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: C.accent }}>
            {h}
          </div>
        ))}
      </div>

      {/* ── Returns list ── */}
      <div className="flex flex-col gap-0.5 mt-0.5">
        {visible.length === 0 ? (
          // Empty state when no returns match the current filter/search
          <div
            className="text-center py-[60px] bg-white rounded-b-[10px]"
            style={{ border: `1px solid ${C.border}` }}
          >
            <RefreshCw size={40} color={C.textMuted} className="mx-auto mb-3" />
            <p className="text-sm" style={{ color: C.textSoft }}>No return requests found.</p>
          </div>
        ) : (
          visible.map(ret => (
            <ReturnRow key={ret.id} ret={ret} onAction={handleAction} updating={updating} />
          ))
        )}
      </div>

      {/* Pagination-style count shown below the list */}
      <div className="text-xs text-right mt-3" style={{ color: C.textMuted }}>
        Showing {visible.length} of {total} returns
      </div>
    </div>
  );
}