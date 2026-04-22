'use client';

import { useCartStore } from '../../stores/cartStore';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, X, ArrowLeft, Trash2 } from 'lucide-react';

const C = {
  bg:          "#f1f5f9",
  surface:     "#ffffff",
  border:      "rgba(26,135,225,0.18)",
  accent:      "#1a87e1",
  textPrimary: "#1e293b",
  textMuted:   "#64748b",
  textSoft:    "#475569",
  danger:      "#dc2626",
  dangerBg:    "rgba(239,68,68,0.07)",
  dangerBorder:"rgba(239,68,68,0.25)",
  successText: "#059669",
  successBg:   "rgba(16,185,129,0.08)",
};

const FONT = { display: "'Playfair Display', serif", body: "'DM Sans', sans-serif" };

// ── Single cart item row ─────────────────────────────────────────────────────
function CartItem({ item, onRemove }) {
  const lineTotal = (item.price * item.qty).toFixed(2);

  return (
    <div
      className="flex items-center gap-[14px] rounded-xl px-[18px] py-[14px] mb-[10px]"
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
      }}
    >
      {/* Product icon placeholder */}
      <div
        className="w-12 h-12 shrink-0 rounded-[10px] flex items-center justify-center"
        style={{ background: C.bg, border: `1px solid ${C.border}` }}
      >
        <Package size={20} color={C.textMuted} />
      </div>

      {/* Product name and unit price */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[14px] font-semibold mb-[3px] whitespace-nowrap overflow-hidden text-ellipsis"
          style={{ color: C.textPrimary }}
        >
          {item.name}
        </p>
        <p className="text-[12px]" style={{ color: C.textMuted }}>
          Rs. {Number(item.price).toFixed(2)} each
        </p>
        <p className="text-[12px] mt-[2px]" style={{ color: C.textMuted }}>
          Qty: {item.qty}
        </p>
      </div>

      {/* Line total */}
      <p
        className="text-[14px] font-semibold min-w-[96px] text-right shrink-0"
        style={{ color: C.textPrimary }}
      >
        Rs. {lineTotal}
      </p>

      {/* Remove button */}
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

// ── One row inside the order summary box ────────────────────────────────────
function SummaryRow({ label, value, freeTag }) {
  return (
    <div className="flex justify-between items-center py-[6px]">
      <span className="text-[13px]" style={{ color: C.textSoft }}>{label}</span>
      {freeTag ? (
        <span
          className="text-[11px] font-semibold px-[10px] py-[2px] rounded-lg"
          style={{ background: C.successBg, color: C.successText }}
        >
          Free
        </span>
      ) : (
        <span className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>
          {value}
        </span>
      )}
    </div>
  );
}

// ── Summary card ────────────────────────────────────────────────────────────
function OrderSummary({ total }) {
  return (
    <div
      className="rounded-xl px-5 py-[18px] mt-3"
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
      }}
    >
      <SummaryRow label="Subtotal" value={`Rs. ${total.toFixed(2)}`} />
      <SummaryRow label="Shipping" freeTag />
      <SummaryRow label="Tax (0%)" value="Rs. 0.00" />
      <div className="my-3" style={{ borderTop: `1px solid ${C.border}` }} />
      <div className="flex justify-between items-center">
        <span className="text-[15px] font-semibold" style={{ color: C.textPrimary }}>Total</span>
        <span className="text-[18px] font-bold" style={{ color: C.textPrimary }}>
          Rs. {total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ── Empty cart state ─────────────────────────────────────────────────────────
function EmptyCart() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: C.bg, fontFamily: FONT.body }}
    >
      <div
        className="text-center rounded-2xl px-16 py-12"
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
        }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: C.bg, border: `1px solid ${C.border}` }}
        >
          <ShoppingCart size={24} color={C.textMuted} />
        </div>
        <h1 className="text-[18px] font-bold mb-2" style={{ color: C.textPrimary }}>
          Your cart is empty
        </h1>
        <p className="text-[13px] mb-6" style={{ color: C.textMuted }}>
          Looks like you haven't added anything yet.
        </p>
        <Link
          to="/customer/products"
          className="inline-flex items-center gap-[6px] text-[13px] font-semibold rounded-lg px-[18px] py-2 no-underline"
          style={{
            color: C.accent,
            background: "rgba(26,135,225,0.08)",
            border: `1px solid ${C.border}`,
          }}
        >
          <ArrowLeft size={14} /> Continue Shopping
        </Link>
      </div>
    </div>
  );
}

// ── Main cart page ───────────────────────────────────────────────────────────
export default function CartPage() {
  const { items, removeItem, clearCart, getTotal } = useCartStore();

  if (items.length === 0) return <EmptyCart />;

  return (
    <div
      className="min-h-screen px-4 py-10"
      style={{ background: C.bg, fontFamily: FONT.body }}
    >
      <div className="max-w-[760px] mx-auto">

        {/* Page header */}
        <div
          className="flex items-end justify-between pb-5 mb-6"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <div>
            <h1
              className="text-[26px] font-semibold"
              style={{ fontFamily: FONT.display, color: C.textPrimary }}
            >
              Shopping Cart
            </h1>
            <p className="text-[13px] mt-1" style={{ color: C.textMuted }}>
              {items.length} {items.length === 1 ? "item" : "items"} in your cart
            </p>
          </div>
        </div>

        {/* Cart items */}
        {items.map(item => (
          <CartItem key={item.id} item={item} onRemove={removeItem} />
        ))}

        {/* Price breakdown */}
        <OrderSummary total={getTotal()} />

        {/* Bottom action bar */}
        <div className="flex items-center justify-between mt-5">
          <button
            onClick={clearCart}
            className="inline-flex items-center gap-[6px] text-[12px] font-semibold rounded-lg px-[14px] py-[7px] cursor-pointer"
            style={{
              color: C.danger,
              background: C.dangerBg,
              border: `1px solid ${C.dangerBorder}`,
              fontFamily: FONT.body,
            }}
          >
            <Trash2 size={13} /> Clear Cart
          </button>

          <div className="flex items-center gap-3">
            <Link
              to="/customer/products"
              className="inline-flex items-center gap-[5px] text-[13px] font-medium no-underline"
              style={{ color: C.textSoft }}
            >
              <ArrowLeft size={13} /> Continue Shopping
            </Link>

            <button
              className="text-[14px] font-semibold text-white border-none rounded-[9px] px-6 py-[10px] cursor-pointer"
              style={{
                background: C.accent,
                fontFamily: FONT.body,
                boxShadow: "0 4px 12px rgba(26,135,225,0.25)",
              }}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}