'use client';

import { useCartStore } from '../../stores/cartStore';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Card         from '../../components/Card';
import CartItem     from '../../components/cart/CartItem';
import OrderSummary from '../../components/cart/OrderSummary';
import EmptyCart    from '../../components/cart/EmptyCart';
import { C, FONT }  from '../../components/profile/profileTheme';

export default function CartPage() {
  const { items, removeItem, clearCart, getTotal } = useCartStore();
  const navigate = useNavigate();

  const totalItems     = items.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice     = getTotal();
  const uniqueProducts = items.length;

  if (items.length === 0) return <EmptyCart />;

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: C.bg, fontFamily: FONT.body }}>
      <div className="max-w-[760px] mx-auto">

        {/* Header */}
        <div className="flex items-end justify-between pb-5 mb-6" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card title="Total Products" value={uniqueProducts} />
          <Card title="Total Quantity" value={totalItems} />
          <Card title="Total Amount"   value={`Rs. ${totalPrice.toFixed(2)}`} />
        </div>

        {/* Cart Items */}
        {items.map(item => (
          <CartItem key={item.id} item={item} onRemove={removeItem} />
        ))}

        {/* Order Summary */}
        <OrderSummary total={getTotal()} />

        {/* Actions */}
        <div className="flex items-center justify-between mt-5">
          <button
            onClick={clearCart}
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
            <Link
              to="/customer/products"
              className="inline-flex items-center gap-[5px] text-[13px] font-medium no-underline"
              style={{ color: C.textSoft }}
            >
              <ArrowLeft size={13} /> Continue Shopping
            </Link>

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