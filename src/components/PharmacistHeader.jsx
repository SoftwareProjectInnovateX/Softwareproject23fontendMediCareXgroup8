import { useState } from "react";
import { Bell, User, ChevronDown, LogOut, Settings } from "lucide-react";

const C = {
  surface:     "#ffffff",
  border:      "rgba(26,135,225,0.18)",
  accent:      "#1a87e1",
  textPrimary: "#1e293b",
  textMuted:   "#64748b",
  textSoft:    "#475569",
};

const FONT = { body: "'DM Sans', sans-serif" };

export default function PharmacistHeader() {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div style={{
      width: "100%", display: "flex",
      justifyContent: "space-between", alignItems: "center",
      fontFamily: FONT.body,
    }}>

      {/* Left — greeting + date */}
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, lineHeight: 1.2 }}>
          Welcome back, Pharmacist
        </p>
        <p style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
          {dateLabel}
        </p>
      </div>

      {/* Right — actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

        {/* Notification bell */}
        <button style={{
          width: 36, height: 36, borderRadius: 9,
          border: `1px solid ${C.border}`,
          background: C.surface,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", position: "relative",
          boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
        }}>
          <Bell size={15} color={C.textSoft} />
          {/* Unread dot */}
          <span style={{
            position: "absolute", top: 7, right: 7,
            width: 6, height: 6, borderRadius: "50%",
            background: C.accent,
            border: "1.5px solid #ffffff",
          }} />
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: C.border }} />

        {/* Profile dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: 9,
              border: `1px solid ${C.border}`,
              background: C.surface, cursor: "pointer",
              boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
            }}>
            {/* Avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(26,135,225,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <User size={14} color={C.accent} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
              Pharmacist
            </span>
            <ChevronDown size={13} color={C.textMuted}
              style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, minWidth: 160, zIndex: 100,
              boxShadow: "0 4px 16px rgba(26,135,225,0.1)",
              overflow: "hidden",
            }}>
              {[
                { icon: Settings, label: "Settings" },
                { icon: LogOut,   label: "Sign Out",  danger: true },
              ].map(({ icon: Icon, label, danger }) => (
                <button key={label} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 9,
                  padding: "10px 14px", background: "none", border: "none",
                  cursor: "pointer", fontFamily: FONT.body,
                  fontSize: 13, fontWeight: 500,
                  color: danger ? "#dc2626" : C.textPrimary,
                }}>
                  <Icon size={14} color={danger ? "#dc2626" : C.textMuted} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}