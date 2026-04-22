
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import {
  Package, AlertTriangle, XCircle, Clock, AlertCircle
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

// ── Helper functions ──────────────────────────────────────────────────────────

/** Returns the number of days until expiry (negative = already expired). */
function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const today  = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

/** Maps days value to a status key: "expired" | "soon" (≤30d) | "ok" | "unknown" */
function getExpiryStatus(days) {
  if (days === null) return "unknown";
  if (days < 0)      return "expired";
  if (days <= 30)    return "soon";
  return "ok";
}

/** Maps stock level to: "out" | "low" (below minStock) | "ok" */
function getStockStatus(stock, minStock = 10) {
  if (stock === 0)        return "out";
  if (stock < minStock)   return "low";
  return "ok";
}

// ── Badge ─────────────────────────────────────────────────────────────────────
/**
 * Badge – coloured pill using a status type key for styling.
 * Supported types: expired | soon | out | low | ok | unknown.
 */
function Badge({ label, type }) {
  const styles = {
    expired: { bg: "rgba(239,68,68,0.1)",   color: "#dc2626", border: "rgba(239,68,68,0.25)"   },
    soon:    { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.25)"  },
    out:     { bg: "rgba(239,68,68,0.1)",   color: "#dc2626", border: "rgba(239,68,68,0.25)"   },
    low:     { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.25)"  },
    ok:      { bg: "rgba(16,185,129,0.1)",  color: "#059669", border: "rgba(16,185,129,0.25)"  },
    unknown: { bg: "rgba(26,135,225,0.08)", color: "#1a87e1", border: "rgba(26,135,225,0.2)"   },
  };
  const s = styles[type] || styles.unknown;
  return (
    <span
      className="text-[10px] font-bold px-[10px] py-[3px] rounded-[20px] uppercase tracking-[0.06em] whitespace-nowrap"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {label}
    </span>
  );
}

/** StatCard – summary metric tile (reused from Dashboard pattern) */
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

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter]     = useState("all");  // active tab key
  const [search, setSearch]     = useState("");      // name / code / category search

  // Real-time listener on the supplier "products" collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "products"), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(data);
    });
    return () => unsub();
  }, []);

  // Derived counts for stat cards and filter tab labels
  const totalProducts = products.length;
  const outOfStock    = products.filter(p => p.stock === 0).length;
  const lowStock      = products.filter(p => p.stock > 0 && p.stock < (p.minStock ?? 10)).length;
  const expiredCount  = products.filter(p => {
    const d = getDaysUntilExpiry(p.expiryDate);
    return d !== null && d < 0;
  }).length;
  const expiringSoon  = products.filter(p => {
    const d = getDaysUntilExpiry(p.expiryDate);
    return d !== null && d >= 0 && d <= 30;
  }).length;

  /**
   * Applies active filter tab and search string to produce the visible row set.
   * Filter "low" captures both low-stock AND out-of-stock rows.
   */
  const visible = products.filter(p => {
    const days         = getDaysUntilExpiry(p.expiryDate);
    const stockStatus  = getStockStatus(p.stock, p.minStock ?? 10);
    const expiryStatus = getExpiryStatus(days);

    const matchFilter =
      filter === "all"      ? true :
      filter === "low"      ? (stockStatus === "low" || stockStatus === "out") :
      filter === "expiring" ? expiryStatus === "soon" :
      filter === "expired"  ? expiryStatus === "expired" : true;

    const matchSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.productCode?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());

    return matchFilter && matchSearch;
  });

  /**
   * Returns a tinted row background based on the product's worst status
   * (expired → red tint, expiring soon / low stock → amber tint).
   */
  function rowBg(p) {
    const days = getDaysUntilExpiry(p.expiryDate);
    if (days !== null && days < 0)    return "rgba(239,68,68,0.04)";
    if (days !== null && days <= 30)  return "rgba(245,158,11,0.04)";
    if (p.stock === 0)                return "rgba(239,68,68,0.04)";
    if (p.stock < (p.minStock ?? 10)) return "rgba(245,158,11,0.04)";
    return "transparent";
  }

  return (
    <div className="font-['DM_Sans',sans-serif]">

      <div className="mb-6">
        <h1 className="font-['Playfair_Display',serif] text-[26px] text-[#1e293b] font-semibold">
          Inventory
        </h1>
        <p className="text-[13px] text-[#64748b] mt-[5px]">
          Real-time stock levels, expiry tracking, and alerts.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-4 gap-[14px] mb-6">
        <StatCard icon={Package}       label="Total Products" value={totalProducts} iconBg="rgba(26,135,225,0.1)"  iconColor="#1a87e1" />
        <StatCard icon={AlertTriangle} label="Low Stock"      value={lowStock}      iconBg="rgba(245,158,11,0.1)"  iconColor="#d97706" />
        <StatCard icon={XCircle}       label="Out of Stock"   value={outOfStock}    iconBg="rgba(239,68,68,0.1)"   iconColor="#dc2626" />
        <StatCard icon={Clock}         label="Expiring Soon"  value={expiringSoon}  iconBg="rgba(245,158,11,0.1)"  iconColor="#d97706" />
      </div>

      {/* ── Red alert banner: shown only when expired or out-of-stock products exist ── */}
      {(expiredCount > 0 || outOfStock > 0) && (
        <div className="bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.2)] rounded-[10px] px-4 py-3 mb-5 flex items-center gap-[10px] flex-wrap">
          <AlertCircle size={16} color="#dc2626" />
          {expiredCount > 0 && (
            <span className="text-[13px] text-red-600 font-medium">
              {expiredCount} product{expiredCount > 1 ? "s" : ""} have expired — remove from shelves immediately.
            </span>
          )}
          {outOfStock > 0 && (
            <span className="text-[13px] text-red-600 font-medium">
              {outOfStock} product{outOfStock > 1 ? "s" : ""} are out of stock.
            </span>
          )}
        </div>
      )}

      {/* ── Filter tabs + search ── */}
      <div className="flex gap-2 mb-[18px] flex-wrap items-center">
        {[
          { key: "all",      label: "All" },
          { key: "low",      label: `Low / Out (${lowStock + outOfStock})` },
          { key: "expiring", label: `Expiring Soon (${expiringSoon})` },
          { key: "expired",  label: `Expired (${expiredCount})` },
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
          placeholder="Search by name, code, category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[7px] text-[12px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-60"
        />
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[14px] overflow-hidden shadow-[0_1px_4px_rgba(26,135,225,0.07)]">

        {/* Column header row */}
        <div className="grid gap-0 px-[18px] py-[11px] border-b border-[rgba(26,135,225,0.18)] bg-[#e0f2fe]"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr" }}
        >
          {["Product", "Code", "Category", "Stock", "Expiry", "Status"].map(h => (
            <div key={h} className="text-[11px] font-bold text-[#1a87e1] uppercase tracking-[0.08em]">
              {h}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {visible.length === 0 ? (
          <div className="text-center py-[60px]">
            <Package size={40} color={C.textMuted} className="mx-auto mb-3" />
            <p className="text-[14px] text-[#475569]">No products match your filter.</p>
          </div>
        ) : (
          visible.map((p, i) => {
            const days         = getDaysUntilExpiry(p.expiryDate);
            const expiryStatus = getExpiryStatus(days);
            const stockStatus  = getStockStatus(p.stock, p.minStock ?? 10);

            // Human-readable expiry label for the cell sub-line
            const expiryLabel =
              days === null ? "N/A" :
              days < 0      ? `Expired ${Math.abs(days)}d ago` :
              days === 0    ? "Expires today" :
              `${days}d left`;

            return (
              <div
                key={p.id}
                className="grid px-[18px] py-[13px] items-center"
                style={{
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
                  borderBottom: i < visible.length - 1 ? `1px solid ${C.border}` : "none",
                  background: rowBg(p),
                }}
              >
                <div className="text-[13px] font-semibold text-[#1e293b]">
                  {p.name || "—"}
                </div>

                <div className="text-[12px] text-[#475569] font-mono">
                  {p.productCode || "—"}
                </div>

                <div className="text-[12px] text-[#475569] capitalize">
                  {p.category || "—"}
                </div>

                {/* Stock column: colour shifts green/amber/red based on stockStatus */}
                <div className={`text-[14px] font-bold ${
                  stockStatus === "ok" ? "text-[#059669]" :
                  stockStatus === "low" ? "text-[#d97706]" : "text-red-600"
                }`}>
                  {p.stock ?? "—"}
                  {p.minStock && (
                    <span className="text-[10px] text-[#64748b] font-normal ml-1">
                      / min {p.minStock}
                    </span>
                  )}
                </div>

                {/* Expiry column: date + relative label */}
                <div className={`text-[12px] ${
                  expiryStatus === "expired" ? "text-red-600" :
                  expiryStatus === "soon"    ? "text-[#d97706]" : "text-[#475569]"
                }`}>
                  {p.expiryDate
                    ? new Date(p.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                    : "N/A"}
                  <div className="text-[10px] mt-[2px]">{expiryLabel}</div>
                </div>

                {/* Status column: can show multiple badges (stock + expiry) */}
                <div className="flex flex-col gap-1">
                  {stockStatus === "out" && <Badge label="Out of Stock" type="out"     />}
                  {stockStatus === "low" && <Badge label="Low Stock"    type="low"     />}
                  {stockStatus === "ok" && expiryStatus === "ok" && <Badge label="In Stock" type="ok" />}
                  {expiryStatus === "expired" && <Badge label="Expired"   type="expired" />}
                  {expiryStatus === "soon"    && <Badge label="Exp. Soon" type="soon"    />}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: visible / total count */}
      <div className="text-[12px] text-[#64748b] mt-3 text-right">
        Showing {visible.length} of {totalProducts} products
      </div>

    </div>
  );
}