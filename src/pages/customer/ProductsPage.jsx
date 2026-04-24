"use client";

import { useEffect, useState, useRef } from "react";
import { useCartStore } from "../../stores/cartStore";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { CATEGORIES } from "../../data/categories";
import SmartSearch from "../../components/SmartSearch";
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
function ProductCard({ product }) {
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const [showDetails, setShowDetails] = useState(false);
  const [localStock, setLocalStock]   = useState(product.stock ?? 0);

  useEffect(() => {
    setLocalStock(product.stock ?? 0);
  }, [product.stock]);

  const cartQty        = cartItems.find((i) => i.id === product.id)?.qty ?? 0;
  const availableStock = localStock - cartQty;

  const handleAddToCart = async (e) => {
    e?.stopPropagation();
    if (availableStock <= 0) return;

    addItem(product, 1);

    try {
      const stockId = product.stockId || product.productCode;
      if (stockId) {
        const q    = query(collection(db, "products"), where("productCode", "==", stockId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const productDoc   = snap.docs[0];
          const currentStock = productDoc.data().stock ?? 0;
          const newStock     = Math.max(0, currentStock - 1);

          await updateDoc(doc(db, "products", productDoc.id), { stock: newStock });

          const adminQ    = query(collection(db, "adminProducts"), where("productId", "==", productDoc.id));
          const adminSnap = await getDocs(adminQ);
          if (!adminSnap.empty) {
            const adminDoc   = adminSnap.docs[0];
            const adminStock = adminDoc.data().stock ?? 0;
            await updateDoc(doc(db, "adminProducts", adminDoc.id), {
              stock: Math.max(0, adminStock - 1),
            });
          }

          setLocalStock(newStock);
        }
      }
    } catch (err) {
      console.error("Failed to update stock:", err);
    }
  };

  return (
    <>
      <div
        onClick={() => setShowDetails(true)}
        className="rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-200"
        style={{
          background: C.surface,
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
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-[200px] object-cover" />
        ) : (
          <div className="w-full h-[200px] flex items-center justify-center" style={{ background: "rgba(26,135,225,0.06)" }}>
            <Package size={48} color={C.accent} />
          </div>
        )}

        <div className="px-[18px] py-4">
          <h3
            className="text-[15px] font-bold mb-1.5"
            style={{ color: C.textPrimary }}
          >
            {product.name}
          </h3>
          <p className="text-xs leading-relaxed mb-2.5 line-clamp-2" style={{ color: C.textMuted }}>
            {product.description}
          </p>
          <p className="text-base font-bold mb-1.5" style={{ color: C.accent }}>
            Rs. {product.retailPrice ? Number(product.retailPrice).toFixed(2) : product.price}
          </p>
          <p className="text-xs mb-3.5" style={{ color: C.textMuted }}>
            Stock: {localStock}
          </p>
          <button
            onClick={handleAddToCart}
            disabled={availableStock <= 0}
            className="w-full py-2.5 rounded-xl text-[13px] font-semibold border-none flex items-center justify-center gap-1.5 transition-all duration-150"
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
            <ShoppingCart size={14} />
            {availableStock <= 0 ? "Out of Stock" : "Add to Cart"}
          </button>
        </div>
      </div>

      {showDetails && (
        <div
          className="fixed inset-0 flex justify-center items-center p-4 z-50"
          style={{ background: "rgba(15,42,94,0.55)" }}
        >
          <div
            className="rounded-[20px] w-full max-w-[540px] overflow-hidden"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              boxShadow: "0 24px 48px rgba(15,42,94,0.2)",
              fontFamily: FONT.body,
            }}
          >
            <div
              className="flex justify-end px-[18px] py-3.5"
              style={{ borderBottom: `1px solid ${C.border}`, background: "rgba(26,135,225,0.04)" }}
            >
              <button
                onClick={() => setShowDetails(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer"
                style={{ background: "rgba(26,135,225,0.08)", border: `1px solid ${C.border}` }}
              >
                <X size={15} color={C.textMuted} />
              </button>
            </div>

            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-[240px] object-cover" />
            ) : (
              <div className="w-full h-[240px] flex items-center justify-center" style={{ background: "rgba(26,135,225,0.06)" }}>
                <Package size={64} color={C.accent} />
              </div>
            )}

            <div className="px-6 pt-5 pb-6">
              <h2
                className="text-[22px] font-bold mb-2"
                style={{ color: C.textPrimary }}
              >
                {product.name}
              </h2>
              <p
                className="text-[13px] leading-[1.7] mb-3.5"
                style={{ color: C.textMuted }}
              >
                {product.description}
              </p>
              <p className="text-xl font-bold mb-2" style={{ color: C.accent }}>
                Rs. {product.retailPrice ? Number(product.retailPrice).toFixed(2) : product.price}
              </p>
              <p className="text-xs mb-5" style={{ color: C.textMuted }}>
                Stock: {localStock}
              </p>
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
  

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const categories = [
    { id: 'all', name: 'All Products' },
    ...CATEGORIES,
  ];

  useEffect(() => {
    let stockMap = {};
    let productList = [];

    const merge = (productsData, stockData) => {
      const merged = productsData.map((p) => ({
        ...p,
        stock: stockData[p.stockId || p.productCode]?.stock ?? 0,
      }));
      setProducts(merged);
    };

    const unsubProducts = onSnapshot(collection(db, "pharmacistProducts"), (snap) => {
      productList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      merge(productList, stockMap);
    });

    const unsubStock = onSnapshot(collection(db, "products"), (snap) => {
      stockMap = {};
      snap.forEach((d) => {
        const data = d.data();
        const key  = data.productCode || d.id;
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
      style={{ background: C.bg, fontFamily: FONT.body }}
    >
      {/* Page header banner */}
      <div
        className="px-6 pt-14 pb-12 text-center"
        style={{
          background: "linear-gradient(135deg, #0f2a5e 0%, #1a87e1 100%)",
        }}
      >
       <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: FONT.display }}>
          Our Products
        </h1>
        <p className="text-[15px] text-white/75 max-w-[520px] mx-auto">
          Browse our complete range of quality healthcare and pharmaceutical
          products.
        </p>
      </div>

      <div
        className="sticky top-[122px] z-40"
        style={{
          background: C.surface,
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

          <div ref={dropdownRef} className="relative flex-shrink-0">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 px-3.5 py-[9px] rounded-xl text-[13px] font-semibold outline-none cursor-pointer min-w-[180px] transition-all duration-150"
              style={{
                border: `1px solid ${selectedCategory !== "all" ? C.accent : C.border}`,
                color: selectedCategory !== "all" ? C.accent : C.textSoft,
                fontFamily: FONT.body,
                background:
                  selectedCategory !== "all"
                    ? "rgba(26,135,225,0.06)"
                    : C.surface,
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
              <ChevronDown
                size={15}
                color={selectedCategory !== "all" ? C.accent : C.textMuted}
                className="transition-transform duration-200"
                style={{
                  transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            {dropdownOpen && (
              <div
                className="absolute top-[calc(100%+6px)] left-0 min-w-full z-[100] rounded-xl overflow-hidden"
                style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 8px 24px rgba(15,42,94,0.13)" }}
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
                        color: active ? C.accent : C.textPrimary,
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

      <div className="max-w-[1200px] mx-auto px-6 py-9">
        {filteredProducts.length === 0 ? (
          <div
            className="rounded-2xl py-[72px] text-center"
            style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(26,135,225,0.07)" }}
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
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
