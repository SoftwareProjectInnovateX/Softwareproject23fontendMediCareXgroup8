'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, X, Package } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { C, FONT }      from './categoryConfig';

// Resolve the API base URL from the environment, falling back to localhost
const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

// ── ProductImage ──────────────────────────────────────────────────────────────
// Renders a product image if available, otherwise a centred Package icon fallback.
// `height` and `iconSize` allow callers to size the element differently
// between the card thumbnail and the modal view.
function ProductImage({ imageUrl, name, height = 200, iconSize = 48 }) {
  return imageUrl ? (
    <img src={imageUrl} alt={name} className="w-full object-cover" style={{ height }} />
  ) : (
    <div className="w-full flex items-center justify-center" style={{ height, background: 'rgba(26,135,225,0.06)' }}>
      <Package size={iconSize} color={C.accent} />
    </div>
  );
}

// ── AddToCartButton ───────────────────────────────────────────────────────────
// Full-width button that adds a product to the cart.
// Disabled and visually greyed out when availableStock is 0.
// `size` prop switches between 'sm' (card) and 'lg' (modal) variants.
function AddToCartButton({ availableStock, onClick, size = 'sm' }) {
  const isLarge = size === 'lg';
  return (
    <button
      onClick={onClick}
      disabled={availableStock <= 0}
      className={`w-full rounded-xl font-semibold border-none flex items-center justify-center gap-2 transition-all duration-150 ${isLarge ? 'py-3 text-sm' : 'py-2.5 text-[13px]'}`}
      style={{
        fontFamily: FONT.body,
        cursor:     availableStock > 0 ? 'pointer' : 'not-allowed',
        background: availableStock > 0 ? C.accent : '#e2e8f0',
        color:      availableStock > 0 ? '#ffffff' : C.textMuted,
        boxShadow:  availableStock > 0 ? '0 4px 12px rgba(26,135,225,0.25)' : 'none',
      }}
    >
      <ShoppingCart size={isLarge ? 16 : 14} />
      {availableStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
    </button>
  );
}

// ── ProductCard ───────────────────────────────────────────────────────────────
// Displays a product in the catalogue grid.
// Clicking the card opens a detail modal with a larger image and description.
// Adding to cart: (1) updates Zustand store, (2) optimistically decrements
// local stock, and (3) fires a PUT to the backend to persist the change.
export default function ProductCard({ product }) {
  const addItem        = useCartStore((s) => s.addItem);
  const cartItems      = useCartStore((s) => s.items);

  // Controls visibility of the product detail modal
  const [showModal, setShowModal]   = useState(false);

  // Local stock mirrors product.stock and is decremented optimistically on add-to-cart
  const [localStock, setLocalStock] = useState(product.stock ?? 0);

  // Sync local stock if the parent passes a new product.stock value
  useEffect(() => { setLocalStock(product.stock ?? 0); }, [product.stock]);

  // How many of this product are already in the cart
  const cartQty        = cartItems.find((i) => i.id === product.id)?.qty ?? 0;

  // Available stock = total stock minus what's already in the cart
  const availableStock = localStock - cartQty;

  // Adds one unit to the cart, decrements local stock optimistically,
  // then fires a background PUT to keep the backend in sync.
  const handleAddToCart = async (e) => {
    e?.stopPropagation(); // prevent card click from opening the modal
    if (availableStock <= 0) return;
    addItem(product, 1);
    setLocalStock((prev) => Math.max(0, prev - 1));
    try {
      // Use stockId (productCode) as the identifier for the stock endpoint
      const stockId = product.stockId || product.productCode;
      if (stockId) {
        await fetch(`${API_BASE}/products/${encodeURIComponent(stockId)}/decrement-stock`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ quantity: 1 }),
        });
      }
    } catch (err) {
      console.error('Failed to update stock:', err);
    }
  };

  // Prefer retailPrice over the generic price field; format to 2 decimal places
  const price = product.retailPrice ? Number(product.retailPrice).toFixed(2) : product.price;

  return (
    <>
      {/* ── Product card (catalogue grid item) ── */}
      <div
        onClick={() => setShowModal(true)}
        className="rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-200"
        style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(26,135,225,0.07)', fontFamily: FONT.body }}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 24px rgba(26,135,225,0.15)')}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(26,135,225,0.07)')}
      >
        {/* Product thumbnail */}
        <ProductImage imageUrl={product.imageUrl} name={product.name} />
        <div className="px-[18px] py-4">
          <h3 className="text-[15px] font-bold mb-1.5" style={{ color: C.textPrimary }}>{product.name}</h3>
          {/* Description clamped to 2 lines to keep cards uniform in height */}
          <p className="text-xs leading-relaxed mb-2.5 line-clamp-2" style={{ color: C.textMuted }}>{product.description}</p>
          <p className="text-base font-bold mb-1.5" style={{ color: C.accent }}>Rs. {price}</p>
          <p className="text-xs mb-3.5" style={{ color: C.textMuted }}>Stock: {localStock}</p>
          <AddToCartButton availableStock={availableStock} onClick={handleAddToCart} />
        </div>
      </div>

      {/* ── Product detail modal ── */}
      {showModal && (
        <div className="fixed inset-0 flex justify-center items-center p-4 z-50" style={{ background: 'rgba(15,42,94,0.55)' }}>
          <div
            className="rounded-[20px] w-full max-w-[540px] overflow-hidden"
            style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: '0 24px 48px rgba(15,42,94,0.2)', fontFamily: FONT.body }}
          >
            {/* Modal close button */}
            <div className="flex justify-end px-[18px] py-3.5" style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(26,135,225,0.04)' }}>
              <button
                onClick={() => setShowModal(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer"
                style={{ background: 'rgba(26,135,225,0.08)', border: `1px solid ${C.border}` }}
              >
                <X size={15} color={C.textMuted} />
              </button>
            </div>

            {/* Larger product image for the modal */}
            <ProductImage imageUrl={product.imageUrl} name={product.name} height={240} iconSize={64} />

            <div className="px-6 pt-5 pb-6">
              <h2 className="text-[22px] font-bold mb-2" style={{ color: C.textPrimary }}>{product.name}</h2>
              {/* Full description — no line clamp in the modal */}
              <p className="text-[13px] leading-[1.7] mb-3.5" style={{ color: C.textMuted }}>{product.description}</p>
              <p className="text-xl font-bold mb-2" style={{ color: C.accent }}>Rs. {price}</p>
              <p className="text-xs mb-5" style={{ color: C.textMuted }}>Stock: {localStock}</p>
              {/* Add to cart from modal also closes it on success */}
              <AddToCartButton
                availableStock={availableStock}
                onClick={(e) => { handleAddToCart(e); setShowModal(false); }}
                size="lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}