import { useEffect, useState, useMemo } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

// ── Theme ────────────────────────────────────────────────────────────────────
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
const FONT = { body: "'DM Sans', sans-serif" };

// ── Derive top N products from CustomerOrders by quantity sold ────────────────
function deriveTopProducts(orders, topN = 3) {
  const map = {};

  orders.forEach((order) => {
    const items = Array.isArray(order.types) ? order.types : [];

    if (items.length > 0) {
      // Order has line items — aggregate each item separately
      items.forEach((item) => {
        const key = item.name || "Unknown";
        if (!map[key]) map[key] = {
          name:        key,
          imageUrl:    item.imageUrl    || "",
          category:    item.category    || "Medicine",
          description: item.description || "",
          price:       item.price       || 0,
          revenue:     0,
          qty:         0,
        };
        map[key].revenue += (item.price || 0) * (item.quantity || 1);
        map[key].qty     += item.quantity || 1;
      });
    } else {
      // Fallback — order-level fields
      const key = order.productName || "Unknown";
      if (!map[key]) map[key] = {
        name:        key,
        imageUrl:    order.imageUrl    || "",
        category:    order.category    || "Medicine",
        description: order.description || "",
        price:       order.unitPrice   || 0,
        revenue:     0,
        qty:         0,
      };
      map[key].revenue += order.totalAmount || 0;
      map[key].qty     += order.quantity    || 1;
    }
  });

  return Object.values(map)
    .sort((a, b) => b.qty - a.qty) // ✅ Sort by quantity sold (most sold first)
    .slice(0, topN);
}

// ── Rank badge styles ─────────────────────────────────────────────────────────
const rankStyle = (idx) => ({
  fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "2px 8px",
  color:      idx === 0 ? C.gold       : C.textMuted,
  background: idx === 0 ? "rgba(217,119,6,0.10)" : "rgba(100,116,139,0.08)",
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function BestSelling() {
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loading, setLoading]               = useState(true);

  // Fetch CustomerOrders once on mount
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "CustomerOrders"));
        setCustomerOrders(snap.docs.map((d) => d.data()));
      } catch (e) {
        console.error("BestSelling fetch error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Compute top 3 products by quantity sold
  const products = useMemo(() => deriveTopProducts(customerOrders, 3), [customerOrders]);

  // ── States ──
  if (loading) return (
    <section style={{ padding: "60px 0", textAlign: "center", fontFamily: FONT.body }}>
      <p style={{ fontSize: 14, color: C.textMuted }}>Loading best sellers…</p>
    </section>
  );

  if (products.length === 0) return null;

  return (
    <section style={{ padding: "48px 0", background: C.bg, fontFamily: FONT.body }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>

        {/* ── Heading ── */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: C.accent,
            textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6,
          }}>
            Top Picks
          </p>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: C.accentDark, margin: 0 }}>
            Best Selling
          </h2>
          {/* Decorative underline */}
          <div style={{
            width: 40, height: 3, borderRadius: 4, margin: "10px auto 0",
            background: `linear-gradient(90deg, ${C.accentDark}, ${C.accent})`,
          }} />
        </div>

        {/* ── 3-column product grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {products.map((p, idx) => (
            <div
              key={p.name + idx}
              style={{
                background: C.surface, borderRadius: 14, overflow: "hidden",
                border: `1px solid ${C.border}`,
                boxShadow: "0 1px 6px rgba(26,135,225,0.07)",
                display: "flex", flexDirection: "column",
                transition: "box-shadow 0.18s, transform 0.18s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(26,135,225,0.15)";
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = "0 1px 6px rgba(26,135,225,0.07)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* Product image */}
              <div style={{
                height: 150, display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(26,135,225,0.04)", borderBottom: `1px solid ${C.border}`,
                padding: "16px 12px",
              }}>
                {p.imageUrl
                  ? <img src={p.imageUrl} alt={p.name}
                      style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                  : <span style={{ fontSize: 12, color: C.textMuted }}>No Image</span>
                }
              </div>

              {/* Card body */}
              <div style={{ padding: "12px 14px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>

                {/* Category + Rank row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: C.accent,
                    background: "rgba(26,135,225,0.10)", border: `1px solid rgba(26,135,225,0.22)`,
                    borderRadius: 20, padding: "2px 9px",
                    textTransform: "uppercase", letterSpacing: "0.07em",
                  }}>
                    {p.category}
                  </span>
                  <span style={rankStyle(idx)}>#{idx + 1}</span>
                </div>

                {/* Name */}
                <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: 0, lineHeight: 1.4 }}>
                  {p.name}
                </h3>

                {/* Units sold */}
                <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
                  🛒 {p.qty.toLocaleString()} units sold
                </span>

                {/* Price — pushed to bottom */}
                <p style={{ fontSize: 14, fontWeight: 700, color: C.accentDark, margin: 0, marginTop: "auto" }}>
                  Rs. {Number(p.price).toFixed(2)}
                </p>

              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}