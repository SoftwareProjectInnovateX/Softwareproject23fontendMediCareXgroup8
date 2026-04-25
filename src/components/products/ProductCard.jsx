'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, X, Package } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { C, FONT } from './categoryConfig';

function ProductImage({ imageUrl, name, height = 200, iconSize = 48 }) {
  return imageUrl ? (
    <img src={imageUrl} alt={name} className="w-full object-cover" style={{ height }} />
  ) : (
    <div
      className="w-full flex items-center justify-center"
      style={{ height, background: 'rgba(26,135,225,0.06)' }}
    >
      <Package size={iconSize} color={C.accent} />
    </div>
  );
}

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

export default function ProductCard({ product }) {
  const addItem        = useCartStore((s) => s.addItem);
  const cartItems      = useCartStore((s) => s.items);
  const [showModal, setShowModal]   = useState(false);
  const [localStock, setLocalStock] = useState(product.stock ?? 0);

  useEffect(() => { setLocalStock(product.stock ?? 0); }, [product.stock]);

  const cartQty        = cartItems.find((i) => i.id === product.id)?.qty ?? 0;
  const availableStock = localStock - cartQty;

  const handleAddToCart = async (e) => {
    e?.stopPropagation();
    if (availableStock <= 0) return;
    addItem(product, 1);
    try {
      const stockId = product.stockId || product.productCode;
      if (!stockId) return;
      const snap = await getDocs(query(collection(db, 'products'), where('productCode', '==', stockId)));
      if (snap.empty) return;
      const productDoc = snap.docs[0];
      const newStock   = Math.max(0, (productDoc.data().stock ?? 0) - 1);
      await updateDoc(doc(db, 'products', productDoc.id), { stock: newStock });

      const adminSnap = await getDocs(query(collection(db, 'adminProducts'), where('productId', '==', productDoc.id)));
      if (!adminSnap.empty) {
        await updateDoc(doc(db, 'adminProducts', adminSnap.docs[0].id), {
          stock: Math.max(0, (adminSnap.docs[0].data().stock ?? 0) - 1),
        });
      }
      setLocalStock(newStock);
    } catch (err) {
      console.error('Failed to update stock:', err);
    }
  };

  const price = product.retailPrice ? Number(product.retailPrice).toFixed(2) : product.price;

  return (
    <>
      {/* Card */}
      <div
        onClick={() => setShowModal(true)}
        className="rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-200"
        style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(26,135,225,0.07)', fontFamily: FONT.body }}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 24px rgba(26,135,225,0.15)')}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(26,135,225,0.07)')}
      >
        <ProductImage imageUrl={product.imageUrl} name={product.name} />
        <div className="px-[18px] py-4">
          <h3 className="text-[15px] font-bold mb-1.5" style={{ color: C.textPrimary }}>{product.name}</h3>
          <p className="text-xs leading-relaxed mb-2.5 line-clamp-2" style={{ color: C.textMuted }}>{product.description}</p>
          <p className="text-base font-bold mb-1.5" style={{ color: C.accent }}>Rs. {price}</p>
          <p className="text-xs mb-3.5" style={{ color: C.textMuted }}>Stock: {localStock}</p>
          <AddToCartButton availableStock={availableStock} onClick={handleAddToCart} />
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex justify-center items-center p-4 z-50"
          style={{ background: 'rgba(15,42,94,0.55)' }}
        >
          <div
            className="rounded-[20px] w-full max-w-[540px] overflow-hidden"
            style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: '0 24px 48px rgba(15,42,94,0.2)', fontFamily: FONT.body }}
          >
            <div className="flex justify-end px-[18px] py-3.5" style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(26,135,225,0.04)' }}>
              <button
                onClick={() => setShowModal(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer"
                style={{ background: 'rgba(26,135,225,0.08)', border: `1px solid ${C.border}` }}
              >
                <X size={15} color={C.textMuted} />
              </button>
            </div>
            <ProductImage imageUrl={product.imageUrl} name={product.name} height={240} iconSize={64} />
            <div className="px-6 pt-5 pb-6">
              <h2 className="text-[22px] font-bold mb-2" style={{ color: C.textPrimary }}>{product.name}</h2>
              <p className="text-[13px] leading-[1.7] mb-3.5" style={{ color: C.textMuted }}>{product.description}</p>
              <p className="text-xl font-bold mb-2" style={{ color: C.accent }}>Rs. {price}</p>
              <p className="text-xs mb-5" style={{ color: C.textMuted }}>Stock: {localStock}</p>
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