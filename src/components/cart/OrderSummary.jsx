const C = {
  surface:     "var(--bg-secondary)",
  border:      "var(--card-border)",
  textPrimary: "var(--text-primary)",
  textSoft:    "var(--text-secondary)",
  successText: "#059669",
  successBg:   "rgba(16,185,129,0.08)",
};

function SummaryRow({ label, value, freeTag }) {
  return (
    <div className="flex justify-between items-center py-[6px]">
      <span className="text-[13px]" style={{ color: C.textSoft }}>{label}</span>
      {freeTag ? (
        <span className="text-[11px] font-semibold px-[10px] py-[2px] rounded-lg" style={{ background: C.successBg, color: C.successText }}>
          Free
        </span>
      ) : (
        <span className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>{value}</span>
      )}
    </div>
  );
}

export default function OrderSummary({ total }) {
  return (
    <div
      className="rounded-xl px-5 py-[18px] mt-3"
      style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(26,135,225,0.07)" }}
    >
      <SummaryRow label="Subtotal"  value={`Rs. ${total.toFixed(2)}`} />
      <SummaryRow label="Shipping"  freeTag />
      <SummaryRow label="Tax (0%)"  value="Rs. 0.00" />
      <div className="my-3" style={{ borderTop: `1px solid ${C.border}` }} />
      <div className="flex justify-between items-center">
        <span className="text-[15px] font-semibold" style={{ color: C.textPrimary }}>Total</span>
        <span className="text-[18px] font-bold"     style={{ color: C.textPrimary }}>Rs. {total.toFixed(2)}</span>
      </div>
    </div>
  );
}