import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import {
  Tag,
  Star,
  Package,
  Calendar,
  Globe,
  ShieldCheck,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { useDarkMode } from "../../context/DarkModeContext";
import { DARK } from "../../constants/theme";

const C = {
  bg: "#f1f5f9",
  surface: "#ffffff",
  border: "rgba(26,135,225,0.18)",
  accent: "#1a87e1",
  accentMid: "#0284c7",
  textPrimary: DARK.surface,
  textMuted: "#64748b",
  textSoft: "#475569",
};

const FONT = {
  display: "'Playfair Display', serif",
  body: "'DM Sans', sans-serif",
};

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: "Certified Quality",
    desc: "All brands meet international quality standards",
    iconBg: "rgba(16,185,129,0.1)",
    iconColor: "#059669",
  },
  {
    icon: Trophy,
    title: "Award Winning",
    desc: "Recognized globally for innovation",
    iconBg: "rgba(26,135,225,0.1)",
    iconColor: "#1a87e1",
  },
  {
    icon: Globe,
    title: "Global Reach",
    desc: "Trusted in over 100 countries worldwide",
    iconBg: "rgba(245,158,11,0.1)",
    iconColor: "#d97706",
  },
  {
    icon: Star,
    title: "Top Rated",
    desc: "Highly rated by healthcare professionals",
    iconBg: "rgba(239,68,68,0.1)",
    iconColor: "#dc2626",
  },
];

export default function BrandsPage() {
  const { isDark } = useDarkMode();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "brands"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setBrands(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const categories = ["All", ...new Set(brands.map((b) => b.category))];
  const filteredBrands =
    selectedCategory === "All"
      ? brands
      : brands.filter((b) => b.category === selectedCategory);

  return (
    <div
      className="min-h-screen"
      style={{ background: isDark ? DARK.bg : C.bg, fontFamily: FONT.body }}
    >
      {/* ── Page header banner ── */}
      <div
        className="py-[72px] px-6 text-center"
        style={{
          background: "linear-gradient(135deg, #0f2a5e 0%, #1a87e1 100%)",
        }}
      >
        <h1
          className="text-[42px] font-bold text-white mb-[14px]"
          style={{ fontFamily: FONT.display }}
        >
          Trusted International Medical Brands
        </h1>
        <p
          className="text-base max-w-[600px] mx-auto"
          style={{ color: "rgba(255,255,255,0.75)" }}
        >
          We partner with the world's leading healthcare brands to bring you
          quality products you can trust.
        </p>
      </div>

      {/* ── Sticky category filter bar ── */}
      <div
        className="sticky top-20 z-40"
        style={{
          background: isDark ? DARK.surface : C.surface,
          borderBottom: `1px solid ${C.border}`,
          boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 py-[14px] flex flex-wrap gap-[10px] justify-center">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="px-5 py-2 rounded-[20px] text-[13px] font-semibold cursor-pointer transition-all duration-150"
                style={{
                  fontFamily: FONT.body,
                  background: active
                    ? C.accent
                    : isDark
                      ? DARK.bg
                      : C.surface,
                  color: active ? "#ffffff" : isDark ? DARK.textMuted : C.textSoft,
                  border: active ? "none" : `1px solid ${C.border}`,
                  boxShadow: active
                    ? "0 4px 12px rgba(26,135,225,0.25)"
                    : "none",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Brands grid ── */}
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        {filteredBrands.length === 0 ? (
          <div
            className="rounded-[14px] py-[60px] text-center"
            style={{
              background: isDark ? DARK.surface : C.surface,
              border: `1px solid ${C.border}`,
              boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
            }}
          >
            <Tag size={40} color={C.textMuted} className="mx-auto mb-3" />
            <p
              className="text-[15px] font-semibold"
              style={{ color: isDark ? DARK.textMuted : C.textSoft }}
            >
              No brands available yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5">
            {filteredBrands.map((brand) => (
              <div
                key={brand.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: isDark ? DARK.surface : C.surface,
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
                }}
              >
                {/* Brand image / fallback */}
                {brand.imageUrl ? (
                  <img
                    src={brand.imageUrl}
                    alt={brand.name}
                    className="w-full h-[200px] object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-[200px] flex items-center justify-center"
                    style={{
                      background: isDark
                        ? "rgba(26,135,225,0.06)"
                        : "rgba(26,135,225,0.06)",
                    }}
                  >
                    <span
                      className="text-[72px] font-bold"
                      style={{ color: C.accent }}
                    >
                      {brand.name?.charAt(0)}
                    </span>
                  </div>
                )}

                {/* Brand name, tagline, category badge */}
                <div
                  className="px-5 py-[14px] flex justify-between items-start"
                  style={{ borderBottom: `1px solid ${C.border}` }}
                >
                  <div>
                    <p
                      className="text-[18px] font-bold"
                      style={{ color: isDark ? DARK.textPrimary : C.textPrimary }}
                    >
                      {brand.name}
                    </p>
                    <p
                      className="text-[12px] font-medium mt-[3px]"
                      style={{ color: isDark ? DARK.textMuted : C.accent }}
                    >
                      {brand.tagline}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-[10px] py-[3px] rounded-[20px] uppercase tracking-[0.06em] whitespace-nowrap"
                    style={{
                      background: isDark
                        ? "rgba(26,135,225,0.1)"
                        : "rgba(26,135,225,0.1)",
                      color: isDark ? DARK.textMuted : C.accent,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    {brand.category}
                  </span>
                </div>

                <div className="px-5 py-[18px]">
                  {/* Quick stats row */}
                  <div
                    className="flex justify-between items-center pb-[14px] mb-[14px]"
                    style={{ borderBottom: `1px solid ${C.border}` }}
                  >
                    {[
                      { icon: Star, value: brand.rating, label: "Rating" },
                      {
                        icon: Package,
                        value: brand.products,
                        label: "Products",
                      },
                      {
                        icon: Calendar,
                        value: brand.established,
                        label: "Est.",
                      },
                      { icon: Globe, value: brand.country, label: "Country" },
                    ].map(({ icon: Icon, value, label }) => (
                      <div key={label} className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Icon size={12} color={C.textMuted} />
                          <span
                            className="text-[14px] font-bold"
                            style={{
                              color: isDark ? DARK.textPrimary : C.textPrimary,
                            }}
                          >
                            {value}
                          </span>
                        </div>
                        <p
                          className="text-[10px] mt-[2px]"
                          style={{ color: isDark ? DARK.textMuted : C.textMuted }}
                        >
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Description — clamped to 2 lines */}
                  <p
                    className="text-[13px] leading-[1.7] mb-4 line-clamp-2"
                    style={{ color: C.textSoft }}
                  >
                    {brand.description}
                  </p>

                  {/* Trust badges */}
                  <div className="grid grid-cols-3 gap-[10px] mb-4">
                    {[
                      {
                        icon: ShieldCheck,
                        label: "Certified",
                        bg: "rgba(16,185,129,0.08)",
                        color: "#059669",
                      },
                      {
                        icon: Trophy,
                        label: "Award Winner",
                        bg: "rgba(26,135,225,0.08)",
                        color: "#1a87e1",
                      },
                      {
                        icon: Star,
                        label: "Top Rated",
                        bg: "rgba(245,158,11,0.08)",
                        color: "#d97706",
                      },
                    ].map(({ icon: Icon, label, bg, color }) => (
                      <div
                        key={label}
                        className="text-center px-[6px] py-[10px] rounded-[10px]"
                        style={{
                          background: bg,
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        <Icon
                          size={18}
                          color={color}
                          className="mx-auto mb-[5px]"
                        />
                        <p className="text-[10px] font-bold" style={{ color }}>
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Link to brand products */}
                  <Link
                    to={`/customer/products?brand=${brand.name}`}
                    className="flex items-center justify-center gap-2 w-full text-white rounded-[10px] py-[11px] text-[13px] font-semibold no-underline box-border"
                    style={{
                      background: C.accent,
                      boxShadow: "0 4px 12px rgba(26,135,225,0.25)",
                    }}
                  >
                    View {brand.name} Products
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Why choose our brands — trust section ── */}
      <div
        className="py-16 px-6"
        style={{
          background: "linear-gradient(135deg, #0f2a5e 0%, #1a87e1 100%)",
        }}
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-[32px] font-bold text-white mb-3"
              style={{ fontFamily: FONT.display }}
            >
              Why Choose Our Brands?
            </h2>
            <p
              className="text-[15px] max-w-[520px] mx-auto"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              We carefully select partners who share our commitment to quality
              and patient care.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-6">
            {TRUST_ITEMS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                >
                  <Icon size={24} color="#ffffff" />
                </div>
                <h3 className="text-[15px] font-bold text-white mb-2">
                  {title}
                </h3>
                <p
                  className="text-[12px] leading-[1.6]"
                  style={{ color: "rgba(255,255,255,0.65)" }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
