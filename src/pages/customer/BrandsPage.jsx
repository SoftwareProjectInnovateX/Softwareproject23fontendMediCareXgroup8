import { useEffect, useMemo, useState } from "react";
import { Pill, Globe, Tag, CheckCircle, Search, Bot, Verified, Lightbulb, ExternalLink, Hospital, Stethoscope } from "lucide-react";
import PageBanner from "../../components/profile/PageBanner";
import BrandCard from "../../components/brands/BrandCard";

const API_BASE = `${import.meta.env.VITE_API_URL || 'https://backendg08innovatex-production.up.railway.app'}/api`;

const C = {
  bg: 'var(--bg-primary)',
  surface: 'var(--bg-secondary)',
  accent: 'var(--accent-blue)',
  accentHover: 'var(--accent-blue)',
  accentLight: 'var(--accent-blue-soft)',
  accentMid: 'var(--navbar-border)',
  dark: 'var(--text-primary)',
  darkCard: 'var(--bg-secondary)',
  darkBorder: 'var(--navbar-border)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-secondary)',
  border: 'var(--navbar-border)',
  success: 'var(--accent-blue)',
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

const brandUrls = {
  Pfizer: 'https://www.pfizer.com',
  'Johnson & Johnson': 'https://www.jnj.com',
  Novartis: 'https://www.novartis.com',
  Bayer: 'https://www.bayer.com',
  Sanofi: 'https://www.sanofi.com',
  Roche: 'https://www.roche.com',
};

const whoLinks = {
  'Pain relief': 'https://www.who.int/news-room/fact-sheets/detail/pain-management',
  'Immune support': 'https://www.who.int/health-topics/immunization',
  'Digestive care': 'https://www.who.int/health-topics/diarrhoeal-disease',
  'Cold & flu': 'https://www.who.int/health-topics/influenza',
  'Daily wellness': 'https://www.who.int/health-topics/healthy-diet',
  'Diabetes care': 'https://www.who.int/health-topics/diabetes',
  'Mental wellness': 'https://www.who.int/health-topics/mental-health',
  "Women's health": 'https://www.who.int/health-topics/women-s-health',
  'Child health': 'https://www.who.int/health-topics/child-health',
  'Heart health': 'https://www.who.int/health-topics/cardiovascular-diseases',
};

const whoFacts = [
  'Regular physical activity reduces the risk of noncommunicable diseases like heart disease and diabetes.',
  'Vaccines are one of the safest and most effective ways to prevent illness and save lives.',
  'Balanced nutrition supports immune function and lowers the risk of chronic disease.',
  'Mental health is just as important as physical health; early support improves outcomes.',
  'Protecting children with routine health checks improves long-term growth and development.',
];

const topicMap = [ 
  { keywords: ['pain', 'ache', 'headache', 'fever'], label: 'Pain relief' },
  { keywords: ['immune', 'immunity', 'wellness', 'vitamin'], label: 'Immune support' },
  { keywords: ['digestive', 'stomach', 'acid', 'bloating'], label: 'Digestive care' },
  { keywords: ['cold', 'flu', 'cough', 'throat'], label: 'Cold & flu' },
  { keywords: ['daily', 'wellness', 'health', 'energy'], label: 'Daily wellness' },
  { keywords: ['sleep', 'insomnia', 'rest'], label: 'Sleep support' },
  { keywords: ['diabetes', 'blood sugar', 'glucose', 'insulin'], label: 'Diabetes care' },
  { keywords: ['mental', 'stress', 'anxiety', 'mood'], label: 'Mental wellness' },
  { keywords: ['women', 'female', 'pregnancy', 'menstrual'], label: "Women's health" },
  { keywords: ['child', 'kid', 'pediatric', 'infant'], label: 'Child health' },
  { keywords: ['heart', 'cardio', 'blood pressure'], label: 'Heart health' },
];

const PRESETS = ['Pain relief', 'Immune support', 'Digestive care', 'Cold & flu', 'Daily wellness', 'Diabetes care', 'Mental wellness', "Women's health", 'Child health', 'Heart health'];

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [healthGoal, setHealthGoal] = useState('');
  const [recommendation, setRecommendation] = useState({ title: '', summary: '', brands: [] });
  const [topic, setTopic] = useState('');
  const [factIndex, setFactIndex] = useState(0);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % whoFacts.length);
    }, 8000);
    return () => clearInterval(timer);
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
      setTopic('');
      setRecommendation({
        title: 'Try an AI health query',
        summary: 'Enter a health goal to get brand recommendations tailored to your need, including trusted global names.',
        brands: [],
      });
      return;
    }
    const matchedTopic = topicMap.find((item) => item.keywords.some((kw) => normalized.includes(kw)));
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
    const topicMatches = matchedTopic
      ? globalBrandCatalog.filter((brand) =>
          brand.category.toLowerCase().includes(matchedTopic.label.toLowerCase()) ||
          brand.tagline.toLowerCase().includes(matchedTopic.label.toLowerCase()))
      : [];
    const combined = [...localMatches, ...globalMatches, ...topicMatches];
    const unique = combined.filter((item, i, self) => self.findIndex((o) => o.name === item.name) === i).slice(0, 6);
    setTopic(matchedTopic?.label || '');
    if (unique.length === 0) {
      setRecommendation({
        title: `No exact match for "${healthGoal}"`,
        summary: 'We still found trusted global healthcare brands that align with broader health categories. Try another phrase to narrow your results.',
        brands: globalBrandCatalog.slice(0, 4),
      });
      return;
    }
    setRecommendation({
      title: matchedTopic ? `${matchedTopic.label} brand recommendations` : `Smart health-brand matches for "${healthGoal}"`,
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

        {/* ── HERO SECTION ── */}
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
            {[
              { icon: Globe, text: 'Global brands' },
              { icon: Bot, text: 'AI matching' },
              { icon: Verified, text: 'Verified' },
              { icon: Pill, text: '7+ categories' },
            ].map(({ icon: Icon, text }) => (
              <span
                key={text}
                className="rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1"
                style={{ background: C.accentLight, color: C.accent, border: `1px solid ${C.accentMid}` }}
              >
                <Icon size={12} />
                {text}
              </span>
            ))}
          </div>
        </div>

        {/* ── MAIN TWO-COLUMN: Brands LEFT | AI Advisor RIGHT ── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_500px] items-start">

          {/* LEFT column: Search + Brands */}
          <div className="flex flex-col gap-5">

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
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                    className="text-xs font-medium underline"
                    style={{ color: C.textMuted }}
                  >
                    Clear filters
                  </button>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
                <Search size={48} style={{ color: C.textMuted, marginBottom: '12px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
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

          {/* RIGHT column: blue AI Advisor — cleaner, simpler and more helpful */}
          <div
            className="rounded-[32px] p-6 h-full min-h-[380px] overflow-hidden"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              boxShadow: '0 16px 45px rgba(26,135,225,0.08)',
              color: C.textPrimary
            }}
          >
            <div className="mb-5">
              <div className="inline-flex h-9 min-w-[3rem] items-center justify-center rounded-2xl shadow-sm" style={{ background: C.accentLight, color: C.accent }}>
                <Bot size={20} />
              </div>
              <p className="mt-4 text-[10px] uppercase tracking-[0.35em] font-semibold" style={{ color: C.accent }}>
                AI Health Advisor
              </p>
              <h3 className="mt-3 text-2xl font-semibold" style={{ color: C.dark }}>
                Easy health brand guidance
              </h3>
              <p className="mt-3 text-sm leading-6" style={{ color: C.textSecondary }}>
                Type a health need or pick one of the quick actions to get a curated list of trusted brands, including top global and local options.
              </p>
            </div>

            <label className="block text-sm font-semibold mb-2" style={{ color: C.dark }}>
              What do you need help with?
            </label>
            <input
              type="text"
              value={healthGoal}
              onChange={(e) => setHealthGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRecommendBrands()}
              placeholder="e.g. immune support, pain relief, digestion"
              className="w-full rounded-3xl px-4 py-3 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.textPrimary }}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setHealthGoal(preset)}
                  className="rounded-full px-4 py-2 text-sm font-medium transition"
                  style={
                    healthGoal === preset
                      ? { background: C.accent, color: '#fff', border: `1px solid ${C.accent}` }
                      : { background: C.bg, color: C.textPrimary, border: `1px solid ${C.border}` }
                  }
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleRecommendBrands}
                className="rounded-3xl px-4 py-3 text-sm font-semibold text-white transition"
                style={{ background: C.accent }}
                onMouseEnter={e => e.currentTarget.style.background = C.accentHover}
                onMouseLeave={e => e.currentTarget.style.background = C.accent}
              >
                Recommend brands
              </button>
              <button
                type="button"
                onClick={() => setHealthGoal('')}
                className="rounded-3xl border px-4 py-3 text-sm font-semibold transition"
                style={{ background: C.bg, borderColor: C.accentMid, color: C.accent }}
              >
                Reset query
              </button>
            </div>

            <div className="mt-6 rounded-[28px] border p-4 shadow-sm" style={{ maxHeight: '420px', overflowY: 'auto', background: C.bg, borderColor: C.border }}>
              {!recommendation.title ? (
                <div className="space-y-3 text-sm">
                  <p className="font-semibold" style={{ color: C.textPrimary }}>Try a quick health goal</p>
                  <p style={{ color: C.textSecondary }}>Our AI will match you with the most relevant brands from your catalog and trusted global names.</p>
                  <p className="text-sm leading-6" style={{ color: C.textSecondary }}><Lightbulb size={16} className="inline mr-1" /> WHO Fact: {whoFacts[factIndex]}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] font-semibold" style={{ color: C.accent }}>Recommendation</p>
                    <p className="mt-2 text-base font-semibold" style={{ color: C.textPrimary }}>{recommendation.title}</p>
                  </div>
                  {recommendation.summary && (
                    <p className="text-sm leading-6" style={{ color: C.textSecondary }}>{recommendation.summary}</p>
                  )}
                  <div className="grid gap-3">
                    {recommendation.brands.length > 0 ? (
                      recommendation.brands.map((brand) => (
                        <div key={brand.id ?? brand.name} className="rounded-3xl border p-4" style={{ background: C.accentLight, borderColor: C.accentMid }}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs uppercase tracking-[0.24em]" style={{ color: C.accent }}>{brand.category || 'Health brand'}</p>
                            <span className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: C.surface, color: C.accent }}>
                              {brand.external ? 'Global' : 'Local'}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-semibold" style={{ color: C.textPrimary }}>{brand.name}</p>
                          <p className="mt-1 text-xs leading-5" style={{ color: C.textSecondary }}>{brand.tagline || brand.description?.slice(0, 65)}</p>
                          {brand.external && brandUrls[brand.name] ? (
                            <a
                              href={brandUrls[brand.name]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 text-xs font-semibold text-blue-700 flex items-center gap-1"
                            >
                              <ExternalLink size={12} />
                              Visit official site
                            </a>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-3xl border p-4 text-sm" style={{ background: C.accentLight, borderColor: C.accentMid, color: C.textSecondary }}>
                        No exact brand match yet. Try another keyword like “sleep support” or “joint care.”
                      </div>
                    )}
                  </div>
                  {topic && whoLinks[topic] ? (
                    <div className="pt-3">
                      <a
                        href={whoLinks[topic]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold flex items-center gap-1"
                        style={{ color: C.accent }}
                      >
                        <Hospital size={16} />
                        Read WHO guidance on {topic}
                      </a>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            <p className="mt-4 text-[12px] flex items-center gap-1" style={{ color: C.textMuted }}>
              <Stethoscope size={14} />
              Brand suggestions are informational only. Always consult a licensed pharmacist or physician before starting any medication.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}