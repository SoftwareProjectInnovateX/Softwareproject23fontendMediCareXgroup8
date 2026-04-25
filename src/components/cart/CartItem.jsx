import { useCartStore } from '../../stores/cartStore';
import { Package, X, Trash2 } from 'lucide-react';

const C = {
  bg:          "var(--bg-primary)",
  surface:     "var(--bg-secondary)",
  border:      "var(--card-border)",
  accent:      "var(--accent-blue)",
  textPrimary: "var(--text-primary)",
  textMuted:   "var(--text-secondary)",
  danger:      "#dc2626",
  dangerBg:    "rgba(239,68,68,0.07)",
};

export default function CartItem({ item, onRemove }) {
  const { addItem } = useCartStore();
  const lineTotal = (item.price * item.qty).toFixed(2);
  const imageUrl = item.image || item.imageUrl || item.img || item.picture || null;

  const handleDecrease = () => {
    if (item.qty === 1) onRemove(item.id);
    else addItem({ ...item }, -1);
  };

  return (
    <div
      className="flex items-center gap-[14px] rounded-xl px-[18px] py-[14px] mb-[10px]"
      style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(26,135,225,0.07)" }}
    >
      {/* Image */}
      <div
        className="w-12 h-12 shrink-0 rounded-[10px] overflow-hidden flex items-center justify-center"
        style={{ background: C.bg, border: `1px solid ${C.border}` }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement.innerHTML =
                `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="${C.textMuted}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>`;
            }}
          />
        ) : (
          <Package size={20} color={C.textMuted} />
        )}
      </div>

      {/* Name & price */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold mb-[3px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: C.textPrimary }}>
          {item.name}
        </p>
        <p className="text-[12px]" style={{ color: C.textMuted }}>
          Rs. {Number(item.price).toFixed(2)} each
        </p>
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-[8px] shrink-0">
        <button
          onClick={handleDecrease}
          style={{
            width: 28, height: 28, borderRadius: 7,
            border: `1px solid ${C.border}`,
            background: item.qty === 1 ? C.dangerBg : C.bg,
            color: item.qty === 1 ? C.danger : C.textPrimary,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontWeight: 700, fontSize: 16,
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = item.qty === 1 ? "rgba(239,68,68,0.15)" : "rgba(26,135,225,0.1)"; e.currentTarget.style.borderColor = item.qty === 1 ? C.danger : C.accent; }}
          onMouseLeave={e => { e.currentTarget.style.background = item.qty === 1 ? C.dangerBg : C.bg; e.currentTarget.style.borderColor = C.border; }}
          aria-label="Decrease quantity"
        >
          {item.qty === 1 ? <Trash2 size={12} /> : "−"}
        </button>

        <span style={{ minWidth: 28, textAlign: "center", fontSize: 14, fontWeight: 600, color: C.textPrimary }}>
          {item.qty}
        </span>

        <button
          onClick={() => addItem({ ...item }, 1)}
          style={{
            width: 28, height: 28, borderRadius: 7,
            border: `1px solid ${C.border}`,
            background: C.bg, color: C.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontWeight: 700, fontSize: 16,
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(26,135,225,0.1)"; e.currentTarget.style.borderColor = C.accent; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.border; }}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      {/* Line total */}
      <p className="text-[14px] font-semibold min-w-[96px] text-right shrink-0" style={{ color: C.textPrimary }}>
        Rs. {lineTotal}
      </p>

      {/* Remove */}
      <button
        onClick={() => onRemove(item.id)}
        className="bg-transparent border-none cursor-pointer p-1 flex items-center shrink-0"
        style={{ color: C.textMuted }}
        onMouseEnter={e => (e.currentTarget.style.color = C.danger)}
        onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}
        aria-label="Remove item"
      >
        <X size={14} />
      </button>
    </div>
  );
}