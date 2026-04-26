import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const C = {
  bg:          "#f1f5f9",
  surface:     "#ffffff",
  border:      "rgba(26,135,225,0.18)",
  accent:      "#1a87e1",
  accentDark:  "#0f2a5e",
  textPrimary: "#1e293b",
  textMuted:   "#64748b",
  gold:        "#d97706",
};

const FONT = { display: "'Playfair Display', serif", body: "'DM Sans', sans-serif" };

export default function NewArrivals() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "pharmacistProducts"),
      where("tags", "array-contains", "newArrival")
    );

    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) return (
    <section style={{ padding: "80px 0", textAlign: "center", fontFamily: FONT.body }}>
      <p style={{ fontSize: 15, color: C.textMuted }}>Loading new arrivals…</p>
    </section>
  );

  if (products.length === 0) return null;

  return (
    <section style={{ padding: "56px 0", background: C.bg, fontFamily: FONT.body }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>

        {/* Section heading */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: C.accent,
            textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8,
          }}>
            Just In
          </p>
          <h2 style={{
             fontSize: 30, fontWeight: 700, color: C.accent,
           
            color: C.accentDark, margin: 0,
          }}>
            New Arrivals
          </h2>
          {/* underline accent */}
          <div style={{
            width: 48, height: 3, borderRadius: 4,
            background: `linear-gradient(90deg, ${C.accentDark}, ${C.accent})`,
            margin: "12px auto 0",
          }} />
        </div>

        {/* Product grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: 22,
        }}>
          {products.map((p) => (
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
              {/* Image area */}
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

              {/* Card body */}
              <div style={{ padding: "14px 16px 18px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>

                {/* New badge */}
                <span style={{
                  alignSelf: "flex-start",
                  fontSize: 10, fontWeight: 700,
                  color: C.accent, background: "rgba(26,135,225,0.10)",
                  border: `1px solid rgba(26,135,225,0.22)`,
                  borderRadius: 20, padding: "2px 10px",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  New
                </span>

                {/* Name */}
                <h3 style={{
                  fontSize: 14, fontWeight: 700, color: C.textPrimary,
                  margin: 0, lineHeight: 1.4,
                }}>
                  {p.name}
                </h3>

                {/* Stars */}
                <div style={{ display: "flex", gap: 2 }}>
                  {[...Array(5)].map((_, i) => (
                    <span key={i} style={{ fontSize: 13, color: C.gold }}>★</span>
                  ))}
                </div>

                {/* Price */}
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