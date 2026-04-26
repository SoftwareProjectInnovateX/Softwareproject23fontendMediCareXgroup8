'use client';
import { useEffect, useState, useCallback } from 'react';
import FilterBar from '../../components/products/FilterBar';
import ProductCard from '../../components/products/ProductCard';
import { C, FONT } from '../../components/profile/profileTheme';
import { Tag } from 'lucide-react';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts]                 = useState([]);
  const [smartResults, setSmartResults]         = useState(null);
  const [loading, setLoading]                   = useState(true);
  // ── ADDED: error state to show user-friendly message ──
  const [error, setError]                       = useState(null);

  const fetchProducts = useCallback(async () => {
    // ── ADDED: reset error on each fetch attempt ──
    setError(null);
    try {
      const res  = await fetch(`${API_BASE}/products`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      // ── ADDED: set error message for UI display ──
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filteredProducts =
    smartResults !== null
      ? smartResults
      : products.filter((p) =>
          selectedCategory === 'all' || p.category === selectedCategory
        );

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: FONT.body }}>

      <div
        className="px-6 pt-14 pb-12 text-center"
        style={{ background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 100%)` }}
      >
        <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: FONT.display }}>
          Our Products
        </h1>
        <p className="text-[15px] text-white/75 max-w-[520px] mx-auto">
          Browse our complete range of quality healthcare and pharmaceutical products.
        </p>
      </div>

      <FilterBar
        selectedCategory={selectedCategory}
        onCategory={setSelectedCategory}
        smartResults={smartResults}
        onSmartResults={setSmartResults}
      />

      <div className="max-w-[1200px] mx-auto px-6 py-9">
        {/* ── ADDED: show error message if fetch failed ── */}
        {error ? (
          <div
            className="rounded-2xl py-[72px] text-center"
            style={{ background: C.surface, border: `1px solid #fca5a5` }}
          >
            <p className="text-[15px] font-bold text-red-500">{error}</p>
            <button
              onClick={fetchProducts}
              className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: C.accent }}
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="text-center py-[72px]" style={{ color: C.textMuted, fontFamily: FONT.body }}>
            Loading products…
          </div>
        ) : filteredProducts.length === 0 ? (
          <div
            className="rounded-2xl py-[72px] text-center"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}
          >
            <Tag size={40} color={C.textMuted} className="mx-auto mb-3.5" />
            <p className="text-[15px] font-bold" style={{ color: C.textSoft }}>No products found.</p>
            <p className="text-[13px] mt-1.5" style={{ color: C.textMuted }}>
              Try a different search or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}