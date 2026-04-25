'use client';
import { useEffect, useState, useCallback } from 'react';
import FilterBar from '../../components/products/FilterBar';
import ProductCard from '../../components/products/ProductCard';
import { C, FONT } from '../../components/profile/profileTheme';
import { Tag } from 'lucide-react';

// Base URL for all API calls — falls back to localhost in development
const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

export default function ProductsPage() {
  // Active category filter — 'all' shows every product
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts]                 = useState([]);
  // null means no smart/AI search is active; array means smart results are shown
  const [smartResults, setSmartResults]         = useState(null);
  const [loading, setLoading]                   = useState(true);

  // Wrapped in useCallback so it can be safely listed as a useEffect dependency
  const fetchProducts = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/products`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all products from backend on initial mount
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Smart search results take priority over category filtering
  const filteredProducts =
    smartResults !== null
      ? smartResults
      : products.filter((p) =>
          selectedCategory === 'all' || p.category === selectedCategory
        );

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: FONT.body }}>

      {/* Page header banner with gradient background */}
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

      {/* Filter bar — handles both category tabs and smart search */}
      <FilterBar
        selectedCategory={selectedCategory}
        onCategory={setSelectedCategory}
        smartResults={smartResults}
        onSmartResults={setSmartResults}
      />

      {/* Product grid — handles loading, empty, and populated states */}
      <div className="max-w-[1200px] mx-auto px-6 py-9">
        {loading ? (
          // Loading state while backend request is in flight
          <div className="text-center py-[72px]" style={{ color: C.textMuted, fontFamily: FONT.body }}>
            Loading products…
          </div>
        ) : filteredProducts.length === 0 ? (
          // Empty state when no products match the current filter or search
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
          // 3-column product grid
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