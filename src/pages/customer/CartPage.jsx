'use client';

import { useEffect } from 'react';
import { useCartStore } from '../../stores/cartStore';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Card         from '../../components/Card';
import CartItem     from '../../components/cart/CartItem';
import OrderSummary from '../../components/cart/OrderSummary';
import EmptyCart    from '../../components/cart/EmptyCart';
import { C, FONT }  from '../../components/profile/profileTheme';

export default function CartPage() {
  const { items, removeItem, clearCart, getTotal, fetchItems } = useCartStore();
  const navigate = useNavigate();

  // Sync cart state with backend on every mount to ensure fresh data
  useEffect(() => {
    fetchItems();
  }, []);

  // Derived totals calculated from current cart items
  const totalItems     = items.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice     = getTotal();
  const uniqueProducts = items.length;

  // Show empty state if cart has no items
  if (items.length === 0) return <EmptyCart />;

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: C.bg, fontFamily: FONT.body }}>
      <div className="max-w-[760px] mx-auto">

        {/* Page header divider */}
        <div className="flex items-end justify-between pb-5 mb-6" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div></div>
        </div>

        {/* Summary cards — shows product count, total quantity, total price */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card key="products" title="Total Products" value={uniqueProducts} />
          <Card key="quantity" title="Total Quantity" value={totalItems} />
          <Card key="amount"   title="Total Amount"   value={`Rs. ${totalPrice.toFixed(2)}`} />
        </div>

        {/* Render each cart item — item.id is the Firestore document ID */}
        {items.map(item => (
          <CartItem
            key={item.id}
            item={item}
            onRemove={async () => {
              await removeItem(item.id);  // item.id = Firestore doc ID
            }}
          />
        ))}

        {/* Order total with fixed courier charge */}
        <OrderSummary total={getTotal()} courierCharge={400} />

        {/* Cart action buttons — clear cart, continue shopping, checkout */}
        <div className="flex items-center justify-between mt-5">

          {/* Danger-styled button to wipe all items from cart */}
          <button
            onClick={async () => { await clearCart(); }}
            className="inline-flex items-center gap-[6px] text-[12px] font-semibold rounded-lg px-[14px] py-[7px] cursor-pointer"
            style={{
              color:      C.dangerText,
              background: C.dangerBg,
              border:     `1px solid ${C.dangerBorder}`,
              fontFamily: FONT.body,
            }}
          >
            <Trash2 size={13} /> Clear Cart
          </button>

          <div className="flex items-center gap-3">
            {/* Link back to products page */}
            <Link
              to="/customer/products"
              className="inline-flex items-center gap-[5px] text-[13px] font-medium no-underline"
              style={{ color: C.textSoft }}
            >
              <ArrowLeft size={13} /> Continue Shopping
            </Link>

            {/* Primary CTA — navigates to checkout */}
            <button
              onClick={() => navigate('/customer/checkout')}
              className="text-[14px] font-semibold text-white border-none rounded-[9px] px-6 py-[10px] cursor-pointer"
              style={{ background: C.accent, fontFamily: FONT.body, boxShadow: C.accentShadow }}
            >
              Proceed to Checkout
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}