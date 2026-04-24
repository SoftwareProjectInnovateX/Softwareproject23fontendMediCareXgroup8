import { useNavigate } from "react-router-dom";
import { ShoppingBag, FileText, RotateCcw, Settings, ChevronRight } from "lucide-react";
import { C, FONT } from "./profileTheme";

// ── QuickLinkCard ─────────────────────────────────────────────────────────────
function QuickLinkCard({ icon: Icon, label, sub, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-[14px] rounded-xl cursor-pointer transition-shadow duration-150"
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(26,135,225,0.14)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 4px rgba(26,135,225,0.07)"}
    >
      <div
        className="w-[38px] h-[38px] rounded-[10px] shrink-0 flex items-center justify-center"
        style={{ background: color + "18" }}
      >
        <Icon size={18} color={color} />
      </div>
      <div className="flex-1">
        <p className="text-[13px] font-bold" style={{ color: C.textPrimary }}>{label}</p>
        {sub && <p className="text-[11px] mt-[2px]" style={{ color: C.textMuted }}>{sub}</p>}
      </div>
      <ChevronRight size={15} color={C.textMuted} />
    </div>
  );
}

// ── QuickLinks ────────────────────────────────────────────────────────────────
export default function QuickLinks() {
  const navigate = useNavigate();

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-[14px]"
        style={{ background: "rgba(26,135,225,0.04)", borderBottom: `1px solid ${C.border}` }}
      >
        <p
          className="text-[11px] font-bold uppercase tracking-[0.08em] flex items-center gap-[6px]"
          style={{ color: C.textMuted }}
        >
          <Settings size={12} color={C.accent} /> Quick Links
        </p>
      </div>

      {/* Links */}
      <div className="px-4 py-[14px] flex flex-col gap-[10px]">
        <QuickLinkCard
          icon={ShoppingBag} label="My Orders"
          sub="View order history and track deliveries"
          color={C.accent}
          onClick={() => navigate("/customer/orders")}
        />
        <QuickLinkCard
          icon={FileText} label="My Prescriptions"
          sub="Upload and manage prescriptions"
          color="#8b5cf6"
          onClick={() => navigate("/customer/prescription")}
        />
        <QuickLinkCard
          icon={RotateCcw} label="Returns"
          sub="Request returns and track refunds"
          color="#f59e0b"
          onClick={() => navigate("/customer/returns")}
        />
      </div>
    </div>
  );
}