
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import {
  Package, FileText, CheckCircle, ArrowRight,
  ClipboardList, AlertTriangle, ShoppingBag, Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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

// ── Sub-components ─────────────────────────────────────────────────────────────

/**
 * StatCard – summary metric tile used in the top stats row.
 * @param {LucideIcon} icon      - Icon to display in the coloured circle.
 * @param {string}     label     - Metric label (uppercase caption).
 * @param {string|number} value  - Main figure displayed prominently.
 */
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

/**
 * SectionHeader – titled row with an optional "View All" navigation link.
 * @param {string}   title      - Section heading text.
 * @param {string}   linkLabel  - Text for the right-side action link.
 * @param {Function} onLink     - Click handler for the action link.
 */
function SectionHeader({ title, linkLabel, onLink }) {
  return (
    <div className="flex justify-between items-center mb-[14px]">
      <h2 className="text-[15px] font-bold text-[#1e293b]">{title}</h2>
      {linkLabel && (
        <button
          onClick={onLink}
          className="text-[12px] font-semibold text-[#1a87e1] bg-transparent border-none cursor-pointer flex items-center gap-1 font-['DM_Sans',sans-serif]"
        >
          {linkLabel} <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
}

/**
 * StatusBadge – colour-coded pill for prescription status.
 * Maps: Approved → green, Rejected → red, Pending → amber.
 */
function StatusBadge({ status }) {
  const map = {
    Approved: { bg: "rgba(16,185,129,0.1)",  color: "#059669", border: "rgba(16,185,129,0.25)" },
    Rejected: { bg: "rgba(239,68,68,0.1)",   color: "#dc2626", border: "rgba(239,68,68,0.25)"  },
    Pending:  { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.25)" },
  };
  const s = map[status] || map.Pending;
  return (
    <span
      className="text-[10px] font-bold px-[10px] py-[3px] rounded-[20px] uppercase tracking-[0.06em] whitespace-nowrap"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {status || "Pending"}
    </span>
  );
}

/**
 * QuickAction – card-button that navigates to a named route on click.
 */
function QuickAction({ icon: Icon, label, iconColor, iconBg, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[12px] p-4 cursor-pointer flex flex-col items-start gap-[10px] shadow-[0_1px_4px_rgba(26,135,225,0.07)] font-['DM_Sans',sans-serif] text-left w-full"
    >
      <div
        className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center"
        style={{ background: iconBg }}
      >
        <Icon size={18} color={iconColor} />
      </div>
      <span className="text-[13px] font-semibold text-[#1e293b]">{label}</span>
    </button>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();

  const [productCount, setProductCount]               = useState(0);
  const [prescriptionCount, setPrescriptionCount]     = useState(0);
  const [recentPrescriptions, setRecentPrescriptions] = useState([]);
  const [lowStockProducts, setLowStockProducts]       = useState([]);

  useEffect(() => {
    // Total product count from pharmacistProducts collection
    const unsubP = onSnapshot(collection(db, "pharmacistProducts"), s => setProductCount(s.size));

    // Total prescription count
    const unsubR = onSnapshot(collection(db, "prescriptions"), s => setPrescriptionCount(s.size));

    // Latest 5 prescriptions for the recent-activity panel
    const prescQ = query(collection(db, "prescriptions"), orderBy("createdAt", "desc"), limit(5));
    const unsubRecent = onSnapshot(prescQ, snap => {
      setRecentPrescriptions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Products where current stock is below the defined minimum threshold
    const unsubStock = onSnapshot(collection(db, "pharmacistProducts"), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLowStockProducts(all.filter(p => (p.stock ?? 0) < (p.minStock ?? 10)));
    });

    return () => { unsubP(); unsubR(); unsubRecent(); unsubStock(); };
  }, []);

  // Derive pending count from the already-fetched recent list
  const pendingCount = recentPrescriptions.filter(p => !p.status || p.status === "Pending").length;

  return (
    <div className="font-['DM_Sans',sans-serif]">

      <div className="mb-7">
        <h1 className="font-['Playfair_Display',serif] text-[26px] text-[#1e293b] font-semibold">
          Dashboard
        </h1>
        <p className="text-[13px] text-[#64748b] mt-[5px]">
          Here's an overview of your pharmacy store.
        </p>
      </div>

      {/* ── Top stat cards ── */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        <StatCard
          icon={Package}
          label="Total Products" value={productCount}
          iconBg="rgba(26,135,225,0.1)" iconColor="#1a87e1"
        />
        <StatCard
          icon={FileText}
          label="Prescriptions" value={prescriptionCount}
          iconBg="rgba(16,185,129,0.1)" iconColor="#10b981"
        />
        <StatCard
          icon={CheckCircle}
          label="Store Status" value="Active"
          iconBg="rgba(245,158,11,0.1)" iconColor="#f59e0b"
        />
      </div>

      {/* ── Amber alert banner: only shown when prescriptions are awaiting review ── */}
      {pendingCount > 0 && (
        <div className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.25)] rounded-[10px] px-4 py-3 mb-6 flex items-center gap-[10px]">
          <Clock size={15} color="#d97706" />
          <span className="text-[13px] text-[#d97706] font-medium">
            {pendingCount} prescription{pendingCount > 1 ? "s are" : " is"} awaiting review.
          </span>
          <button
            onClick={() => navigate("prescriptions")}
            className="ml-auto text-[12px] font-semibold text-[#d97706] bg-transparent border border-[rgba(245,158,11,0.35)] rounded-[7px] px-3 py-[5px] cursor-pointer font-['DM_Sans',sans-serif]"
          >
            Review Now
          </button>
        </div>
      )}

      {/* ── Two-panel grid: Recent Prescriptions | Low Stock Alerts ── */}
      <div className="grid grid-cols-2 gap-4 mb-7">

        {/* Recent Prescriptions panel */}
        <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[14px] px-5 py-[18px] shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
          <SectionHeader title="Recent Prescriptions" linkLabel="View All" onLink={() => navigate("prescriptions")} />
          {recentPrescriptions.length === 0 ? (
            <div className="text-center py-7">
              <ClipboardList size={28} color={C.textMuted} className="mx-auto mb-2" />
              <p className="text-[13px] text-[#475569]">No prescriptions yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-[10px]">
              {recentPrescriptions.map(p => (
                <div
                  key={p.id}
                  className="flex justify-between items-center px-3 py-[10px] rounded-[10px] bg-[#f1f5f9] border border-[rgba(26,135,225,0.18)]"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-[#1e293b]">{p.customerName || "—"}</p>
                    <p className="text-[11px] text-[#64748b] mt-[2px]">{p.customerPhone || "—"}</p>
                  </div>
                  <StatusBadge status={p.status || "Pending"} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts panel – products where stock < minStock (default 10) */}
        <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[14px] px-5 py-[18px] shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
          <SectionHeader title="Low Stock Alerts" linkLabel="View Inventory" onLink={() => navigate("inventory")} />
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-7">
              <Package size={28} color={C.textMuted} className="mx-auto mb-2" />
              <p className="text-[13px] text-[#475569]">All products are well stocked.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-[10px]">
              {/* Cap at 5 items to keep the panel concise */}
              {lowStockProducts.slice(0, 5).map(p => (
                <div
                  key={p.id}
                  className="flex justify-between items-center px-3 py-[10px] rounded-[10px] bg-[rgba(245,158,11,0.04)] border border-[rgba(245,158,11,0.18)]"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-[#1e293b]">{p.name || "—"}</p>
                    <p className="text-[11px] text-[#64748b] mt-[2px]">{p.category || "—"}</p>
                  </div>
                  <div className="text-right">
                    {/* Stock turns red when fully out */}
                    <p className={`text-[14px] font-bold ${p.stock === 0 ? "text-red-600" : "text-[#d97706]"}`}>
                      {p.stock ?? 0}
                    </p>
                    <p className="text-[10px] text-[#64748b]">/ min {p.minStock ?? 10}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Quick Actions: 4-button shortcut row ── */}
      <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[14px] px-5 py-[18px] shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
        <SectionHeader title="Quick Actions" />
        <div className="grid grid-cols-4 gap-3">
          <QuickAction
            icon={ShoppingBag} label="Add Product"
            iconBg="rgba(26,135,225,0.1)" iconColor="#1a87e1"
            onClick={() => navigate("add-product")}
          />
          <QuickAction
            icon={ClipboardList} label="View Prescriptions"
            iconBg="rgba(16,185,129,0.1)" iconColor="#10b981"
            onClick={() => navigate("prescriptions")}
          />
          <QuickAction
            icon={Package} label="Inventory"
            iconBg="rgba(245,158,11,0.1)" iconColor="#f59e0b"
            onClick={() => navigate("inventory")}
          />
          <QuickAction
            icon={AlertTriangle} label="Low Stock"
            iconBg="rgba(239,68,68,0.1)" iconColor="#dc2626"
            onClick={() => navigate("inventory")}
          />
        </div>
      </div>

    </div>
  );
}