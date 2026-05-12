import { useEffect, useMemo, useState } from "react";
import PageBanner from "../../components/profile/PageBanner";
import BrandCard from "../../components/brands/BrandCard";

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

const C = {
  bg: '#F0F4F8',
  surface: '#ffffff',
  accent: '#1A56DB',
  accentHover: '#1544B8',
  accentLight: '#EBF2FF',
  accentMid: '#C7D9F8',
  dark: '#0B1120',
  darkCard: '#151E2F',
  darkBorder: 'rgba(255,255,255,0.07)',
  textPrimary: '#0D1B2A',
  textSecondary: '#4A5568',
  textMuted: '#718096',
  border: '#D6E4F7',
  success: '#059669',
  successBg: 'rgba(5,150,105,0.12)',
};

const globalBrandCatalog = [
  { name: 'Pfizer', category: 'Vaccines & respiratory', tagline: 'Leading global vaccine and wellness manufacturer', external: true },
  { name: 'Johnson & Johnson', category: 'Health & consumer care', tagline: 'Trusted solutions across consumer health and medical devices', external: true },
  { name: 'Novartis', category: 'Pharmaceutical innovation', tagline: 'Global medicines for specialty and primary care', external: true },
  { name: 'Bayer', category: 'Health & nutrition', tagline: 'Worldwide leader in healthcare and wellness products', external: true },
  { name: 'Sanofi', category: 'Specialty care', tagline: 'Vaccine and treatment expertise for global health', external: true },
  { name: 'Roche', category: 'Diagnostics & pharma', tagline: 'Precision diagnostics and medicine for modern healthcare', external: true },
];

const topicMap = [
  { keywords: ['pain', 'ache', 'headache', 'fever'], label: 'Pain relief' },
  { keywords: ['immune', 'immunity', 'wellness', 'vitamin'], label: 'Immune support' },
  { keywords: ['digestive', 'stomach', 'acid', 'bloating'], label: 'Digestive care' },
  { keywords: ['cold', 'flu', 'cough', 'throat'], label: 'Cold & flu' },
  { keywords: ['daily', 'wellness', 'health', 'energy'], label: 'Daily wellness' },
  { keywords: ['sleep', 'insomnia', 'rest'], label: 'Sleep support' },
  { keywords: ['heart', 'cardio', 'blood pressure'], label: 'Heart health' },
];

const PRESETS = ['Pain relief', 'Immune support', 'Digestive care', 'Cold & flu', 'Daily wellness'];

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [healthGoal, setHealthGoal] = useState('');
  const [recommendation, setRecommendation] = useState({ title: '', summary: '', brands: [] });

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await fetch(`${API_BASE}/brands`);
        const data = await res.json();
        setBrands(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch brands:', err);
      }
    };
    fetchBrands();
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(brands.map((b) => b.category).filter(Boolean)));
    return ['All', ...unique];
  }, [brands]);

  const filteredBrands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return brands.filter((brand) => {
      const matchesQuery = !q || [brand.name, brand.tagline, brand.category, brand.description]
        .filter(Boolean).some((v) => v.toLowerCase().includes(q));
      const matchesCategory = selectedCategory === 'All' || brand.category === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [brands, searchQuery, selectedCategory]);

  const handleRecommendBrands = () => {
    const normalized = healthGoal.trim().toLowerCase();
    if (!normalized) {
      setRecommendation({
        title: 'Try an AI health query',
        summary: 'Enter a health goal to get brand recommendations tailored to your need, including trusted global names.',
        brands: [],
      });
      return;
    }
    const topic = topicMap.find((item) => item.keywords.some((kw) => normalized.includes(kw)));
    const localMatches = brands
      .filter((brand) => {
        const s = [brand.name, brand.tagline, brand.category, brand.description].filter(Boolean).join(' ').toLowerCase();
        return normalized.split(/\s+/).some((t) => t && s.includes(t));
      })
      .map((brand) => ({ ...brand, external: false }));
    const globalMatches = globalBrandCatalog.filter((brand) => {
      const s = [brand.name, brand.tagline, brand.category].join(' ').toLowerCase();
      return normalized.split(/\s+/).some((t) => t && s.includes(t));
    });
    const topicMatches = topic
      ? globalBrandCatalog.filter((brand) =>
          brand.category.toLowerCase().includes(topic.label.toLowerCase()) ||
          brand.tagline.toLowerCase().includes(topic.label.toLowerCase()))
      : [];
    const combined = [...localMatches, ...globalMatches, ...topicMatches];
    const unique = combined.filter((item, i, self) => self.findIndex((o) => o.name === item.name) === i).slice(0, 6);
    if (unique.length === 0) {
      setRecommendation({
        title: `No exact match for "${healthGoal}"`,
        summary: 'We still found trusted global healthcare brands that align with broader health categories. Try another phrase to narrow your results.',
        brands: globalBrandCatalog.slice(0, 4),
      });
      return;
    }
    setRecommendation({
      title: topic ? `${topic.label} brand recommendations` : `Smart health-brand matches for "${healthGoal}"`,
      summary: 'These suggestions combine your brand catalog with respected worldwide health brands for better accuracy.',
      brands: unique,
    });
  };

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <PageBanner
        title="Trusted International Medical Brands"
        subtitle="We partner with global healthcare leaders"
      />

      <div className="max-w-7xl mx-auto px-5 py-7 space-y-5">

        {/* ── STAT STRIP ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { emoji: '💊', value: brands.length, label: 'Catalog brands' },
            { emoji: '🌍', value: globalBrandCatalog.length, label: 'Global brands' },
            { emoji: '🏷️', value: categories.length - 1 || 0, label: 'Categories' },
            { emoji: '✅', value: brands.length + globalBrandCatalog.length, label: 'Total verified' },
          ].map(({ emoji, value, label }) => (
            <div
              key={label}
              className="rounded-2xl px-5 py-4 flex items-center gap-3"
              style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: '0 1px 6px rgba(26,86,219,0.06)' }}
            >
              <span className="text-2xl leading-none">{emoji}</span>
              <div>
                <p className="text-xl font-bold leading-none" style={{ color: C.accent }}>{value}</p>
                <p className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── MAIN TWO-COLUMN: Search+Filter LEFT | AI Advisor RIGHT ── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_420px] items-start">

          {/* LEFT column: hero text + search + filters stacked tightly */}
          <div className="space-y-4">

            {/* Hero text card */}
            <div
              className="rounded-2xl px-8 py-7"
              style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: '0 2px 16px rgba(26,86,219,0.07)' }}
            >
              <span
                className="inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest mb-3"
                style={{ background: C.accentLight, color: C.accent }}
              >
                Trusted Medical Brands
              </span>
              <h1 className="text-[26px] font-bold leading-snug" style={{ color: C.textPrimary }}>
                Explore medicine brands with<br />
                <span style={{ color: C.accent }}>AI-powered health guidance.</span>
              </h1>
              <p className="mt-2 text-sm leading-6" style={{ color: C.textSecondary }}>
                Compare trusted global names with local catalog recommendations. Every brand is verified and categorized for your health needs.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['🌍 Global brands', '🤖 AI matching', '✅ Verified', '💊 7+ categories'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: C.accentLight, color: C.accent, border: `1px solid ${C.accentMid}` }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Search + filter card */}
            <div
              className="rounded-2xl px-6 py-5"
              style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: '0 2px 16px rgba(26,86,219,0.07)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: C.textMuted }}>
                Search & Filter
              </p>
              <div className="flex gap-2">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(searchQuery.trim())}
                  placeholder="Search brands, categories or taglines…"
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{ background: C.accentLight, border: `1px solid ${C.accentMid}`, color: C.textPrimary }}
                />
                <button
                  type="button"
                  onClick={() => setSearchQuery(searchQuery.trim())}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition"
                  style={{ background: C.accent }}
                  onMouseEnter={e => e.currentTarget.style.background = C.accentHover}
                  onMouseLeave={e => e.currentTarget.style.background = C.accent}
                >
                  Search
                </button>
              </div>

              {/* Category chips */}
              <div className="mt-4 flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                    style={
                      selectedCategory === cat
                        ? { background: C.accent, color: '#fff', border: `1px solid ${C.accent}` }
                        : { background: C.accentLight, color: C.textSecondary, border: `1px solid ${C.accentMid}` }
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Results count */}
              {(searchQuery || selectedCategory !== 'All') && (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs" style={{ color: C.textMuted }}>
                    Showing <strong style={{ color: C.accent }}>{filteredBrands.length}</strong> of {brands.length} brands
                  </p>
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                    className="text-xs font-medium underline"
                    style={{ color: C.textMuted }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT column: dark AI Advisor — self-contained, no stretch */}
          <div
            className="rounded-2xl p-6 text-white"
            style={{
              background: C.dark,
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 8px 40px rgba(11,17,32,0.18)',
            }}
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-5">
              <div
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base"
                style={{ background: 'rgba(26,86,219,0.3)', border: '1px solid rgba(99,152,255,0.25)' }}
              >
                🤖
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] font-semibold" style={{ color: '#6B8FD4' }}>
                  AI Health Advisor
                </p>
                <h3 className="text-base font-bold text-white leading-snug mt-0.5">
                  Find brands for your health goal
                </h3>
              </div>
            </div>

            {/* Input */}
            <input
              type="text"
              value={healthGoal}
              onChange={(e) => setHealthGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRecommendBrands()}
              placeholder="e.g. pain relief, immune support…"
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 mb-3"
              style={{ background: C.darkCard, border: '1px solid rgba(255,255,255,0.09)' }}
            />

            {/* Preset chips */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setHealthGoal(preset)}
                  className="rounded-full px-2.5 py-1 text-[11px] font-medium transition"
                  style={{
                    background: healthGoal === preset ? C.accent : 'rgba(255,255,255,0.06)',
                    color: healthGoal === preset ? '#fff' : '#94A3B8',
                    border: `1px solid ${healthGoal === preset ? C.accent : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleRecommendBrands}
              className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition mb-5"
              style={{ background: C.accent }}
              onMouseEnter={e => e.currentTarget.style.background = C.accentHover}
              onMouseLeave={e => e.currentTarget.style.background = C.accent}
            >
              Recommend brands →
            </button>

            {/* Divider */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: '16px' }} />

            {/* Results area */}
            {!recommendation.title ? (
              <div
                className="rounded-xl p-4 text-center"
                style={{ background: C.darkCard, border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-xs" style={{ color: '#4A5F80' }}>
                  Enter a symptom or health goal above and click <strong className="text-slate-400">Recommend brands</strong> to get personalized results.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Suggestion title */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#6B8FD4' }}>
                    Smart Suggestion
                  </p>
                  <p className="text-sm font-semibold text-white">{recommendation.title}</p>
                </div>

                {/* Summary */}
                {recommendation.summary && (
                  <p className="text-xs leading-5 rounded-xl px-3 py-2.5" style={{ color: '#94A3B8', background: C.darkCard }}>
                    {recommendation.summary}
                  </p>
                )}

                {/* Brand result cards */}
                {recommendation.brands.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {recommendation.brands.map((brand) => (
                      <div
                        key={brand.id ?? brand.name}
                        className="rounded-xl p-3"
                        style={{ background: C.darkCard, border: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <p className="text-[9px] uppercase tracking-wider truncate" style={{ color: '#4A5F80' }}>
                            {brand.category?.slice(0, 14) || 'Brand'}
                          </p>
                          <span
                            className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wide"
                            style={{
                              background: brand.external ? 'rgba(26,86,219,0.25)' : C.successBg,
                              color: brand.external ? '#7EB3FF' : '#34D399',
                            }}
                          >
                            {brand.external ? 'Global' : 'Local'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white leading-tight">{brand.name}</p>
                        <p className="text-[11px] leading-4 mt-1 line-clamp-2" style={{ color: '#64748B' }}>
                          {brand.tagline || brand.description?.slice(0, 55)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── BRAND CARDS GRID ── */}
        {filteredBrands.length > 0 ? (
          <>
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>
                All Brands
                <span className="ml-2 text-xs font-normal" style={{ color: C.textMuted }}>
                  ({filteredBrands.length} results)
                </span>
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredBrands.map((brand) => (
                <BrandCard key={brand.id} brand={brand} />
              ))}
            </div>
          </>
        ) : (
          <div
            className="rounded-2xl py-14 text-center"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}
          >
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-base font-semibold" style={{ color: C.textPrimary }}>No brands found</p>
            <p className="text-sm mt-1" style={{ color: C.textMuted }}>Try a different search term or select another category.</p>
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="mt-4 rounded-xl px-5 py-2 text-sm font-semibold text-white"
              style={{ background: C.accent }}
            >
              Clear filters
            </button>
          </div>
        )}

      </div>
    </div>
  );
}