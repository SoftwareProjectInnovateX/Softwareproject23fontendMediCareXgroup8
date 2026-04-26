import { useState } from "react";
import { Star, Copy, CheckCircle } from "lucide-react";
import { C, FONT } from "./profileTheme";

export default function LoyaltyCard({ user }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!user?.customerId) return;
    navigator.clipboard.writeText(user.customerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-[700px] mx-auto px-6 -mt-9 relative z-10">
      <div
        className="rounded-2xl px-[22px] py-[18px] flex items-center justify-between"
        style={{
          background: C.surface,
          border:     `1px solid ${C.border}`,
          boxShadow:  "0 4px 20px rgba(26,135,225,0.15)",
        }}
      >
        {/* Points */}
        <div className="flex items-center gap-[14px]">
          <div
            className="w-[46px] h-[46px] rounded-xl flex items-center justify-center"
            style={{
              background: C.goldGradient,
              boxShadow:  `0 4px 12px ${C.goldShadow}`,
            }}
          >
            <Star size={22} color="#ffffff" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: C.textMuted }}>
              Loyalty Points
            </p>
            <p className="text-[26px] font-bold leading-[1.2]" style={{ color: C.gold }}>
              {user.loyaltyPoints ?? 0}
            </p>
          </div>
        </div>

        {/* Customer ID */}
        <div className="text-right">
          <p className="text-[11px] mb-1" style={{ color: C.textMuted }}>Customer ID</p>
          <button
            onClick={copy}
            className="flex items-center gap-[6px] text-[12px] font-bold px-3 py-[5px] rounded-lg cursor-pointer"
            style={{
              color:      C.accent,
              background: C.accentFaint,
              border:     `1px solid ${C.border}`,
              fontFamily: FONT.body,
            }}
          >
            {copied
              ? <CheckCircle size={12} color={C.successText} />
              : <Copy size={12} />
            }
            {copied ? "Copied!" : user.customerId}
          </button>
        </div>
      </div>
    </div>
  );
}