
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Package } from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          "#f1f5f9",
  surface:     "#ffffff",
  border:      "rgba(26,135,225,0.18)",
  accent:      "#1a87e1",
  textPrimary: "#1e293b",
  textMuted:   "#64748b",
  textSoft:    "#475569",
};

const FONT = {
  display: "'Playfair Display', serif",
  body:    "'DM Sans', sans-serif",
};

export default function MyProducts() {
  const [products, setProducts] = useState([]);

  // Real-time listener – updates the grid whenever a product is added/removed
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pharmacistProducts"), snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <div className="font-['DM_Sans',sans-serif]">
      <div className="mb-6">
        <h1 className="font-['Playfair_Display',serif] text-[26px] text-[#1e293b] font-semibold">
          My Products
        </h1>
        <p className="text-[13px] text-[#64748b] mt-[5px]">
          All products you have listed in the store.
        </p>
      </div>

      {/* ── Empty state ── */}
      {products.length === 0 ? (
        <div className="text-center py-[60px] text-[#64748b]">
          <Package size={44} color={C.textMuted} className="mx-auto mb-[14px]" />
          <p className="text-[15px] text-[#475569] font-medium">No products yet.</p>
          <p className="text-[12px] mt-1 text-[#64748b]">Add your first product using the form.</p>
        </div>
      ) : (
        /* Auto-fill grid: minimum card width 220px, expands to fill available space */
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
        >
          {products.map(p => (
            <div
              key={p.id}
              className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[12px] overflow-hidden shadow-[0_1px_4px_rgba(26,135,225,0.07)]"
            >
              {/* Product thumbnail */}
              <img
                src={p.imageUrl}
                alt={p.name}
                className="h-[150px] w-full object-cover block"
              />

              <div className="px-[14px] py-3">
                {/* Category pill */}
                <span className="text-[10px] font-bold bg-[rgba(26,135,225,0.1)] text-[#1a87e1] px-2 py-[2px] rounded-[6px] uppercase tracking-[0.06em]">
                  {p.category}
                </span>

                {/* Tag chips: "New" and/or "Best Seller" shown when present in tags array */}
                {p.tags && p.tags.length > 0 && (
                  <div className="flex gap-1 mt-[6px] flex-wrap">
                    {p.tags.includes("newArrival") && (
                      <span className="text-[9px] font-bold px-[7px] py-[2px] rounded-[5px] bg-[rgba(26,135,225,0.1)] text-[#1a87e1] border border-[rgba(26,135,225,0.25)] uppercase">
                        New
                      </span>
                    )}
                    {p.tags.includes("bestSelling") && (
                      <span className="text-[9px] font-bold px-[7px] py-[2px] rounded-[5px] bg-[rgba(16,185,129,0.1)] text-[#059669] border border-[rgba(16,185,129,0.25)] uppercase">
                        Best Seller
                      </span>
                    )}
                  </div>
                )}

                <h3 className="text-[13px] font-semibold text-[#1e293b] mt-2 mb-1">
                  {p.name}
                </h3>

                {/* Description clamped to 2 lines */}
                <p className="text-[11px] text-[#64748b] leading-[1.5] line-clamp-2">
                  {p.description}
                </p>

                <p className="text-[14px] font-bold text-[#1a87e1] mt-[10px]">
                  Rs. {p.price}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}