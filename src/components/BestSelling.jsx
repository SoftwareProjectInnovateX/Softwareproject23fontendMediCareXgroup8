import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";


// Centralised colour map — update here to restyle the entire component.
const C = {
  bg:          "var(--bg-primary)",
  surface:     "var(--bg-secondary)",
  border:      "var(--card-border)",
  accent:      "var(--accent-blue)",
  accentDark:  "var(--accent-blue)",
  textPrimary: "var(--text-primary)",
  textMuted:   "var(--text-secondary)",
  gold:        "#d97706",
};

// Font families used across the component.
const FONT = { display: "'Playfair Display', serif", body: "'DM Sans', sans-serif" };

export default function BestSelling() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);

  /**
   * Subscribe to Firestore on mount.The unsub function is returned as cleanup to detach the listener on unmount,
  
   */
  useEffect(() => {
    const q = query(
      collection(db, "pharmacistProducts"),
      where("tags", "array-contains", "bestSelling")
    );

    const unsub = onSnapshot(q, (snap) => {
      // Map each Firestore document to a plain object, merging the doc ID in.
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub(); // Detach Firestore listener on component unmount.
  }, []);

  // Show a lightweight placeholder while the first snapshot arrives.
  if (loading) return (
    <section style={{ padding: "80px 0", textAlign: "center", fontFamily: FONT.body }}>
      <p style={{ fontSize: 15, color: C.textMuted }}>Loading best sellers…</p>
    </section>
  );

  // Don't render the section at all if there are no tagged products.
  if (products.length === 0) return null;

  return (
    <section style={{ padding: "56px 0", background: C.bg, fontFamily: FONT.body }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>

        {/* ── Section heading ─────────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: C.accent,
            textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8,
          }}>
            Top Picks
          </p>
          <h2 style={{
            fontSize: 30, fontWeight: 700, color: C.accent,
            color: C.accentDark, margin: 0,
          }}>
            Best Selling
          </h2>
          {/* Decorative gradient underline beneath the heading. */}
          <div style={{
            width: 48, height: 3, borderRadius: 4,
            background: `linear-gradient(90deg, ${C.accentDark}, ${C.accent})`,
            margin: "12px auto 0",
          }} />
        </div>

        {/* ── Product grid ────────────────────────────────────────────────────── */}
        {/* auto-fill + minmax creates a fluid grid that reflows on resize. */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 22,
        }}>
          {products.map((p) => (
            /**
             * Product card. Hover effects are applied via inline style mutation on mouseEnter/Leave since this component doesn't use a CSS-in-JS library.
             */
            <div
              key={p.id}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 1px 6px rgba(26,135,225,0.07)",
                display: "flex",
                flexDirection: "column",
                transition: "box-shadow 0.18s, transform 0.18s",
                cursor: "pointer",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = "0 8px 28px rgba(26,135,225,0.16)";
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = "0 1px 6px rgba(26,135,225,0.07)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* Product image — contained within a fixed-height area. */}
              <div style={{
                background: "rgba(26,135,225,0.04)",
                borderBottom: `1px solid ${C.border}`,
                padding: "18px 14px",
                display: "flex", alignItems: "center", justifyContent: "center",
                height: 160,
              }}>
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                />
              </div>

              {/* Card body — flex column so the price always sits at the bottom. */}
              <div style={{ padding: "14px 16px 18px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>

                {/* Category pill badge. */}
                <span style={{
                  alignSelf: "flex-start",
                  fontSize: 10, fontWeight: 700,
                  color: C.accent,
                  background: "rgba(26,135,225,0.10)",
                  border: `1px solid rgba(26,135,225,0.22)`,
                  borderRadius: 20, padding: "2px 10px",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  {p.category}
                </span>

                {/* Product name. */}
                <h3 style={{
                  fontSize: 14, fontWeight: 700, color: C.textPrimary,
                  margin: 0, lineHeight: 1.4,
                }}>
                  {p.name}
                </h3>

                {/* Description — clamped to 2 lines to keep card heights consistent. */}
                <p style={{
                  fontSize: 12.5, color: C.textMuted, margin: 0,
                  lineHeight: 1.6,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {p.description}
                </p>

                {/* Price — marginTop: auto pushes it to the card bottom. */}
                <p style={{
                  fontSize: 15, fontWeight: 700, color: C.accentDark,
                  margin: 0, marginTop: "auto",
                }}>
                  Rs. {p.price}
                </p>

              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}