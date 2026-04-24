"use client";

import { useEffect, useState, useRef } from "react";
import { useCartStore } from "../../stores/cartStore";
import { db } from "../../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { CATEGORIES } from "../../data/categories";
import SmartSearch from "../../components/SmartSearch";
import { useDarkMode } from "../../context/DarkModeContext";
import { DARK } from "../../constants/theme";
import {
  ShoppingCart,
  X,
  Package,
  Tag,
  ChevronDown,
  Pill,
  Heart,
  Baby,
  Eye,
  Ear,
  Bone,
  Brain,
  Stethoscope,
  Thermometer,
  Syringe,
  FlaskConical,
  Leaf,
  Sun,
  Droplets,
  Shield,
  Smile,
  Dumbbell,
  Apple,
  Wind,
  Bandage,
  Microscope,
  Activity,
  HandHeart,
  Star,
  LayoutGrid,
} from "lucide-react";

// Picks a lucide icon based on keywords found in the category name
// Falls back to <Pill> if nothing matches
function getCategoryIcon(name = "", size = 14, color = "currentColor") {
  const n = name.toLowerCase();
  if (n.includes("all")) return <LayoutGrid size={size} color={color} />;
  if (n.includes("pain") || n.includes("relief"))
    return <Activity size={size} color={color} />;
  if (n.includes("vitamin") || n.includes("supplement"))
    return <Apple size={size} color={color} />;
  if (n.includes("baby") || n.includes("infant") || n.includes("child"))
    return <Baby size={size} color={color} />;
  if (n.includes("eye") || n.includes("vision"))
    return <Eye size={size} color={color} />;
  if (n.includes("ear")) return <Ear size={size} color={color} />;
  if (n.includes("skin") || n.includes("derma") || n.includes("cream"))
    return <Sun size={size} color={color} />;
  if (n.includes("heart") || n.includes("cardiac"))
    return <Heart size={size} color={color} />;
  if (n.includes("bone") || n.includes("joint") || n.includes("ortho"))
    return <Bone size={size} color={color} />;
  if (n.includes("brain") || n.includes("neuro") || n.includes("mental"))
    return <Brain size={size} color={color} />;
  if (n.includes("diabetes") || n.includes("sugar") || n.includes("blood"))
    return <Droplets size={size} color={color} />;
  if (n.includes("antibiotic") || n.includes("infection"))
    return <Shield size={size} color={color} />;
  if (
    n.includes("cold") ||
    n.includes("flu") ||
    n.includes("fever") ||
    n.includes("cough")
  )
    return <Thermometer size={size} color={color} />;
  if (n.includes("injection") || n.includes("vaccine"))
    return <Syringe size={size} color={color} />;
  if (n.includes("herbal") || n.includes("natural") || n.includes("ayur"))
    return <Leaf size={size} color={color} />;
  if (n.includes("lab") || n.includes("test") || n.includes("diagnostic"))
    return <Microscope size={size} color={color} />;
  if (n.includes("dental") || n.includes("oral") || n.includes("tooth"))
    return <Smile size={size} color={color} />;
  if (n.includes("fitness") || n.includes("sport") || n.includes("protein"))
    return <Dumbbell size={size} color={color} />;
  if (
    n.includes("breath") ||
    n.includes("lung") ||
    n.includes("respir") ||
    n.includes("asthma")
  )
    return <Wind size={size} color={color} />;
  if (n.includes("wound") || n.includes("first aid") || n.includes("bandage"))
    return <Bandage size={size} color={color} />;
  if (n.includes("care") || n.includes("wellness"))
    return <HandHeart size={size} color={color} />;
  if (n.includes("generic") || n.includes("pharma"))
    return <FlaskConical size={size} color={color} />;
  if (n.includes("special") || n.includes("premium"))
    return <Star size={size} color={color} />;
  if (n.includes("doctor") || n.includes("clinic"))
    return <Stethoscope size={size} color={color} />;
  return <Pill size={size} color={color} />;
}

// Shared color tokens
const C = {
  bg: "#f1f5f9",
  surface: "#ffffff",
  border: "rgba(26,135,225,0.18)",
  accent: "#1a87e1",
  accentDark: "#0f2a5e",
  accentMid: "#0284c7",
  textPrimary: "#1e293b",
  textMuted: "#64748b",
  textSoft: "#475569",
};

const FONT = {
  display: "'Playfair Display', serif",
  body: "'DM Sans', sans-serif",
};

// ========================================
// PRODUCT CARD
// ========================================
function ProductCard({ product, isDark = false }) {
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const [showDetails, setShowDetails] = useState(false);

  // How many of this product are already in the cart
  const cartQty = cartItems.find((i) => i.id === product.id)?.qty ?? 0;
  // Real available stock = total stock minus what's already in the cart
  const availableStock = (product.stock ?? 0) - cartQty;

  const handleAddToCart = (e) => {
    e?.stopPropagation();
    if (availableStock <= 0) return;
    addItem(product, 1);
  };

  return (
    <>
      {/* Card — clicking it opens the detail modal */}
      <div
        onClick={() => setShowDetails(true)}
        className="rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-200"
        style={{
          background:isDark ? DARK.surface : C.surface,
          border: `1px solid ${C.border}`,
          boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
          fontFamily: FONT.body,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.boxShadow = "0 8px 24px rgba(26,135,225,0.15)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.boxShadow = "0 1px 4px rgba(26,135,225,0.07)")
        }
      >
        {/* Product image or fallback icon */}
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-[200px] object-cover"
          />
        ) : (
          <div
            className="w-full h-[200px] flex items-center justify-center"
            style={{ background: "rgba(26,135,225,0.06)" }}
          >
            <Package size={48} color={C.accent} />
          </div>
        )}

        <div className="px-[18px] py-4">
          <h3
            className="text-[15px] font-bold mb-1.5"
            style={{ color: isDark ? DARK.textPrimary : C.textPrimary }}
          >
            {product.name}
          </h3>

          {/* Description clamped to 2 lines */}
          <p
            className="text-xs leading-relaxed mb-2.5 line-clamp-2"
            style={{ color: isDark ? DARK.textMuted : C.textMuted }}
          >
            {product.description}
          </p>

          <p className="text-base font-bold mb-1.5" style={{ color: isDark ? DARK.textPrimary : C.accent }}>
            Rs. {product.price}
          </p>

          {/* Stock count + "in cart" badge if applicable */}
          <p className="text-xs mb-3.5" style={{ color: C.textMuted }}>
            Stock: {product.stock ?? 0}
            {cartQty > 0 && (
              <span
                className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-md"
                style={{
                  background: "rgba(234,88,12,0.1)",
                  color: "#ea580c",
                  border: "1px solid rgba(234,88,12,0.2)",
                }}
              >
                {cartQty} in cart
              </span>
            )}
          </p>

          {/* Add to cart — disabled when out of stock */}
          <button
            onClick={handleAddToCart}
            disabled={availableStock <= 0}
            className="w-full py-2.5 rounded-xl text-[13px] font-semibold border-none flex items-center justify-center gap-1.5 transition-all duration-150"
            style={{
              fontFamily: FONT.body,
              cursor: availableStock > 0 ? "pointer" : "not-allowed",
              background: availableStock > 0 ? C.accent : DARK.textPrimary,
              color: availableStock > 0 ? "#ffffff" : C.textMuted,
              boxShadow:
                availableStock > 0
                  ? "0 4px 12px rgba(26,135,225,0.25)"
                  : "none",
            }}
          >
            <ShoppingCart size={14} />
            {availableStock <= 0 ? "Out of Stock" : "Add to Cart"}
          </button>
        </div>
      </div>

      {/* Detail modal — shown when card is clicked */}
      {showDetails && (
        <div
          className="fixed inset-0 flex justify-center items-center p-4 z-50"
          style={{ background: "rgba(15,42,94,0.55)" }}
        >
          <div
            className="rounded-[20px] w-full max-w-[540px] overflow-hidden"
            style={{
              background:isDark ? DARK.surface : C.surface,
              border: `1px solid ${C.border}`,
              boxShadow: "0 24px 48px rgba(15,42,94,0.2)",
              fontFamily: FONT.body,
            }}
          >
            {/* Close button */}
            <div
              className="flex justify-end px-[18px] py-3.5"
              style={{
                borderBottom: `1px solid ${C.border}`,
                background: "rgba(26,135,225,0.04)",
              }}
            >
              <button
                onClick={() => setShowDetails(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer"
                style={{
                  background: "rgba(26,135,225,0.08)",
                  border: `1px solid ${C.border}`,
                }}
              >
                <X size={15} color={C.textMuted} />
              </button>
            </div>

            {/* Larger product image in modal */}
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-[240px] object-cover"
              />
            ) : (
              <div
                className="w-full h-[240px] flex items-center justify-center"
                style={{ background: "rgba(26,135,225,0.06)" }}
              >
                <Package size={64} color={C.accent} />
              </div>
            )}

            <div className="px-6 pt-5 pb-6">
              <h2
                className="text-[22px] font-bold mb-2"
                style={{ color: isDark ? DARK.textPrimary : C.textPrimary }}
              >
                {product.name}
              </h2>
              <p
                className="text-[13px] leading-[1.7] mb-3.5"
                style={{ color: isDark ? DARK.textPrimary : C.textPtimary }}
              >
                {product.description}
              </p>
              <p className="text-xl font-bold mb-2" style={{ color: C.accent }}>
                Rs. {product.price}
              </p>
              <p className="text-xs mb-5" style={{ color: C.textMuted }}>
                Stock: {product.stock ?? 0}
                {cartQty > 0 && (
                  <span
                    className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-md"
                    style={{
                      background: "rgba(234,88,12,0.1)",
                      color: "#ea580c",
                      border: "1px solid rgba(234,88,12,0.2)",
                    }}
                  >
                    {cartQty} in cart
                  </span>
                )}
              </p>

              {/* Add to cart from modal — also closes the modal */}
              <button
                onClick={(e) => {
                  handleAddToCart(e);
                  setShowDetails(false);
                }}
                disabled={availableStock <= 0}
                className="w-full py-3 rounded-xl text-sm font-semibold border-none flex items-center justify-center gap-2"
                style={{
                  fontFamily: FONT.body,
                  cursor: availableStock > 0 ? "pointer" : "not-allowed",
                  background: availableStock > 0 ? C.accent : "#e2e8f0",
                  color: availableStock > 0 ? "#ffffff" : C.textMuted,
                  boxShadow:
                    availableStock > 0
                      ? "0 4px 12px rgba(26,135,225,0.25)"
                      : "none",
                }}
              >
                <ShoppingCart size={16} />
                {availableStock <= 0 ? "Out of Stock" : "Add to Cart"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ========================================
// MAIN PAGE
// ========================================
export default function ProductsPage() {
  const { isDark } = useDarkMode();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [products, setProducts] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [smartResults, setSmartResults] = useState(null);

  // Ref to the dropdown wrapper — used to detect clicks outside and close it
  const dropdownRef = useRef(null);

  // Close the category dropdown when clicking anywhere outside it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // "All Products" is always first in the list
  const categories = [{ id: "all", name: "All Products" }, ...CATEGORIES];

  // Listen in real-time to both product and stock collections
  useEffect(() => {
    let stockMap = {};
    let productList = [];

    // Merges product info with stock levels from the separate stock collection
    const merge = (productsData, stockData) => {
      const merged = productsData.map((p) => ({
        ...p,
        stock: stockData[p.productCode || p.stockId]?.stock ?? 0,
      }));
      setProducts(merged);
    };

    // Listen for product details (name, price, image, etc.)
    const unsubProducts = onSnapshot(
      collection(db, "pharmacistProducts"),
      (snap) => {
        productList = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        merge(productList, stockMap);
      },
    );

    // Listen for live stock levels
    const unsubStock = onSnapshot(collection(db, "products"), (snap) => {
      stockMap = {};
      snap.forEach((doc) => {
        const data = doc.data();
        const key = data.productCode || doc.id;
        stockMap[key] = data;
      });
      merge(productList, stockMap);
    });

    // Clean up both listeners when the component unmounts
    return () => {
      unsubProducts();
      unsubStock();
    };
  }, []);

  // Filter products by search term (checks multiple fields) and selected category
  const filteredProducts =
    smartResults !== null
      ? smartResults
      : products.filter((p) => {
          const term = "";
          const matchSearch =
            !term ||
            (p.name || "").toLowerCase().includes(term) ||
            (p.productName || "").toLowerCase().includes(term) ||
            (p.title || "").toLowerCase().includes(term) ||
            (p.description || "").toLowerCase().includes(term) ||
            (p.category || "").toLowerCase().includes(term) ||
            (p.brand || "").toLowerCase().includes(term) ||
            (p.genericName || "").toLowerCase().includes(term);
          const matchCategory =
            selectedCategory === "all" || p.category === selectedCategory;
          return matchSearch && matchCategory;
        });

  return (
    <div
      className="min-h-screen"
      style={{ background: isDark ? DARK.bg : C.bg, fontFamily: FONT.body }}
    >
      {/* Page header banner */}
      <div
        className="px-6 pt-14 pb-12 text-center"
        style={{
          background: "linear-gradient(135deg, #0f2a5e 0%, #1a87e1 100%)",
        }}
      >
        <h1
          className="text-[38px] font-bold text-white mb-3"
          style={{ fontFamily: FONT.display }}
        >
          Our Products
        </h1>
        <p className="text-[15px] text-white/75 max-w-[520px] mx-auto">
          Browse our complete range of quality healthcare and pharmaceutical
          products.
        </p>
      </div>

      {/* Sticky search and category filter bar */}
      <div
        className="sticky top-[122px] z-40"
        style={{
          background: isDark ? DARK.surface : C.surface,
          borderBottom: `1px solid ${C.border}`,
          boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 py-3.5 flex gap-3 items-center flex-wrap">
          {/* Smart Search */}
          <div className="flex-1 min-w-[200px] flex items-center gap-2">
            <SmartSearch
              onResults={(results) => setSmartResults(results)}
              onLoading={() => {}}
            />
            {smartResults !== null && (
              <button
                onClick={() => setSmartResults(null)}
                className="px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 whitespace-nowrap border border-slate-200 rounded-lg"
              >
                ← Show All
              </button>
            )}
          </div>

          {/* Custom category dropdown — always opens downward */}
          <div ref={dropdownRef} className="relative flex-shrink-0">
            {/* Trigger button shows selected category with its icon */}
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 px-3.5 py-[9px] rounded-xl text-[13px] font-semibold outline-none cursor-pointer min-w-[180px] transition-all duration-150"
              style={{
                border: `1px solid ${selectedCategory !== "all" ? C.accent : C.border}`,
                color: selectedCategory !== "all" ? C.accent :isDark ? DARK.textPrimary : C.textSoft,
                fontFamily: FONT.body,
                background:
                  selectedCategory !== "all"
                    ? "rgba(26,135,225,0.06)"
                    :isDark ? DARK.surface : C.surface,
                boxShadow:
                  selectedCategory !== "all"
                    ? "0 2px 8px rgba(26,135,225,0.12)"
                    : "none",
              }}
            >
              <span className="flex items-center gap-1.5 flex-1">
                {getCategoryIcon(
                  categories.find((c) => c.id === selectedCategory)?.name ||
                    "all",
                  14,
                  selectedCategory !== "all" ? C.accent : C.textMuted,
                )}
                {categories.find((c) => c.id === selectedCategory)?.name ||
                  "All Products"}
              </span>
              {/* Arrow rotates 180° when open */}
              <ChevronDown
                size={15}
                color={selectedCategory !== "all" ? C.accent : C.textMuted}
                className="transition-transform duration-200"
                style={{
                  transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            {/* Dropdown list — rendered below the trigger */}
            {dropdownOpen && (
              <div
                className="absolute top-[calc(100%+6px)] left-0 min-w-full z-[100] rounded-xl overflow-hidden"
                style={{
                  background:isDark ? DARK.surface : C.surface,
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 8px 24px rgba(15,42,94,0.13)",
                }}
              >
                {categories.map((cat) => {
                  const active = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setDropdownOpen(false);
                      }}
                      className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-[13px] border-none cursor-pointer transition-colors duration-[120ms]"
                      style={{
                        fontWeight: active ? 700 : 500,
                        fontFamily: FONT.body,
                        color: active ? C.accent : isDark ? DARK.textPrimary : C.textPrimary,
                        background: active
                          ? "rgba(26,135,225,0.07)"
                          : "transparent",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                      onMouseEnter={(e) => {
                        if (!active)
                          e.currentTarget.style.background =
                            "rgba(26,135,225,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        if (!active)
                          e.currentTarget.style.background = active
                            ? "rgba(26,135,225,0.07)"
                            : "transparent";
                      }}
                    >
                      {getCategoryIcon(
                        cat.name,
                        14,
                        active ? C.accent : C.textMuted,
                      )}
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products grid */}
      <div className="max-w-[1200px] mx-auto px-6 py-9">
        {/* Empty state when search/filter returns nothing */}
        {filteredProducts.length === 0 ? (
          <div
            className="rounded-2xl py-[72px] text-center"
            style={{
              background:isDark ? DARK.surface : C.surface,
              border: `1px solid ${C.border}`,
              boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
            }}
          >
            <Tag size={40} color={C.textMuted} className="mx-auto mb-3.5" />
            <p className="text-[15px] font-bold" style={{ color: C.textSoft }}>
              No products found.
            </p>
            <p className="text-[13px] mt-1.5" style={{ color: C.textMuted }}>
              Try a different search or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} isDark={isDark} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
