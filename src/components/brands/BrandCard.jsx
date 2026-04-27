import { Star, Package, Calendar, Globe, ShieldCheck, Trophy } from "lucide-react";

const C = {
  bg: "var(--bg-primary)",
  surface: "var(--bg-secondary)",
  border: "var(--card-border)",
  accent: "var(--accent-blue)",
  textPrimary: "var(--text-primary)",
  textMuted: "var(--text-secondary)",
  textSoft: "var(--text-secondary)",
};

export default function BrandCard({ brand, FONT }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
      }}
    >
      {/* Image */}
      {brand.imageUrl ? (
        <img src={brand.imageUrl} alt={brand.name} className="w-full h-[200px] object-cover" />
      ) : (
        <div className="w-full h-[200px] flex items-center justify-center" style={{ background: "rgba(26,135,225,0.06)" }}>
          <span className="text-[72px] font-bold" style={{ color: C.accent }}>
            {brand.name?.charAt(0)}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="px-5 py-[14px] flex justify-between items-start" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-[18px] font-bold" style={{ color: C.textPrimary }}>{brand.name}</p>
          <p className="text-[12px] font-medium mt-[3px]" style={{ color: C.accent }}>{brand.tagline}</p>
        </div>

        <span
          className="text-[10px] font-bold px-[10px] py-[3px] rounded-[20px] uppercase"
          style={{ background: "rgba(26,135,225,0.1)", color: C.accent }}
        >
          {brand.category}
        </span>
      </div>

      {/* Content */}
      <div className="px-5 py-[18px]">

        {/* Stats */}
        <div className="flex justify-between pb-[14px] mb-[14px]" style={{ borderBottom: `1px solid ${C.border}` }}>
          {[
            { icon: Star, value: brand.rating },
            { icon: Package, value: brand.products },
            { icon: Calendar, value: brand.established },
            { icon: Globe, value: brand.country },
          ].map(({ icon: Icon, value }, i) => (
            <div key={i} className="text-center">
              <Icon size={12} color={C.textMuted} />
              <p className="text-[14px] font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Description */}
        <p className="text-[13px] mb-4" style={{ color: C.textSoft }}>
          {brand.description}
        </p>

       
      </div>
    </div>
  );
}