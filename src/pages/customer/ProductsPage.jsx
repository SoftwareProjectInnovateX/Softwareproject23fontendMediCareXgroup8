'use client';

import { useEffect, useState } from 'react';
import { Tag } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ProductCard from '../../components/products/ProductCard';
import FilterBar   from '../../components/products/FilterBar';
import { C, FONT } from '../../components/profile/profileTheme';
import PageBanner  from '../../components/profile/PageBanner';

// ── Custom hook: real-time products + stock merge ─────────────────────────────
function useProducts() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let productList = [];
    let stockMap    = {};

    const merge = (list, map) =>
      setProducts(
        list.map((p) => ({
          ...p,
          stock: map[p.stockId || p.productCode]?.stock ?? 0,
        }))
      );

    const unsubProducts = onSnapshot(collection(db, 'pharmacistProducts'), (snap) => {
      productList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      merge(productList, stockMap);
    });

    const unsubStock = onSnapshot(collection(db, 'products'), (snap) => {
      stockMap = {};
      snap.forEach((d) => {
        stockMap[d.data().productCode || d.id] = d.data();
      });
      merge(productList, stockMap);
    });

    return () => { unsubProducts(); unsubStock(); };
  }, []);

  return products;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [searchTerm,       setSearchTerm]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const products = useProducts();

  const filtered = products.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    const matchSearch =
      !term ||
      [p.name, p.productName, p.description, p.category].some((f) =>
        (f || '').toLowerCase().includes(term)
      );
    return matchSearch && (selectedCategory === 'all' || p.category === selectedCategory);
  });

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: FONT.body }}>

      <PageBanner
        title="Our Products"
        subtitle="Browse our complete range of quality healthcare and pharmaceutical products."
      />

      <FilterBar
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategory={setSelectedCategory}
      />

      <div className="max-w-[1200px] mx-auto px-6 py-9">
        {filtered.length === 0 ? (
          <div
            className="rounded-2xl py-[72px] text-center"
            style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: C.cardShadow }}
          >
            <Tag size={40} color={C.textMuted} className="mx-auto mb-3.5" />
            <p className="text-[15px] font-bold" style={{ color: C.textSoft }}>No products found.</p>
            <p className="text-[13px] mt-1.5"    style={{ color: C.textMuted }}>Try a different search or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}