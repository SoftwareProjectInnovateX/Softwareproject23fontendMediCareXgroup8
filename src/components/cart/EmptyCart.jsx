import { Link } from 'react-router-dom';
import { ShoppingCart, ArrowLeft } from 'lucide-react';

const C = {
  bg:          "#f1f5f9",
  surface:     "#ffffff",
  border:      "rgba(26,135,225,0.18)",
  accent:      "#1a87e1",
  textPrimary: "#1e293b",
  textMuted:   "#64748b",
};

const FONT = { body: "'DM Sans', sans-serif" };

export default function EmptyCart() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg, fontFamily: FONT.body }}>
      <div
        className="text-center rounded-2xl px-16 py-12"
        style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(26,135,225,0.07)" }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: C.bg, border: `1px solid ${C.border}` }}
        >
          <ShoppingCart size={24} color={C.textMuted} />
        </div>
        <h1 className="text-[18px] font-bold mb-2" style={{ color: C.textPrimary }}>Your cart is empty</h1>
        <p className="text-[13px] mb-6"              style={{ color: C.textMuted }}>Looks like you haven't added anything yet.</p>
        <Link
          to="/customer/products"
          className="inline-flex items-center gap-[6px] text-[13px] font-semibold rounded-lg px-[18px] py-2 no-underline"
          style={{ color: C.accent, background: "rgba(26,135,225,0.08)", border: `1px solid ${C.border}` }}
        >
          <ArrowLeft size={14} /> Continue Shopping
        </Link>
      </div>
    </div>
  );
}