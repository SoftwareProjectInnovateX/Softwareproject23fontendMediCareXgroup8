
import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, orderBy, query, doc, deleteDoc } from "firebase/firestore";
import {
  Plus, X, Tag, Trash2, Star, Package, Calendar, Globe,
} from "lucide-react";
import AddBrandForm from "./AddBrandForm";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          "#f1f5f9",
  surface:     "#ffffff",
  border:      "rgba(26,135,225,0.18)",
  accent:      "#1a87e1",
  accentMid:   "#0284c7",
  textPrimary: "#1e293b",
  textMuted:   "#64748b",
  textSoft:    "#475569",
};

const FONT = { display: "'Inter', sans-serif", body: "'Inter', sans-serif" };

export default function BrandsManagementPage() {
  const [brands, setBrands]     = useState([]);
  const [showForm, setShowForm] = useState(false); // toggles the AddBrandForm panel

  // Real-time listener – brands ordered newest-first
  useEffect(() => {
    const q = query(collection(db, "brands"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setBrands(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub(); // unsubscribe when component unmounts
  }, []);

  /** Deletes a brand document by ID after confirmation */
  const handleDelete = async (id) => {
    if (!confirm("Delete this brand?")) return;
    await deleteDoc(doc(db, "brands", id));
  };

  return (
    <div className="font-['Inter',sans-serif]">

      {/* ── Page header with Add / Cancel toggle button ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-['Inter',sans-serif] text-[26px] font-semibold text-[#1e293b]">
            Brands
          </h1>
          <p className="text-[13px] text-[#64748b] mt-[5px]">
            Manage brands shown on the customer page.
          </p>
        </div>
        {/* Button switches between "Add Brand" (blue) and "Cancel" (red outline) */}
        <button
          onClick={() => setShowForm(!showForm)}
          className={`inline-flex items-center gap-[7px] rounded-[10px] px-[18px] py-[10px] text-[13px] font-semibold font-['Inter',sans-serif] cursor-pointer border transition-all ${
            showForm
              ? "bg-[rgba(239,68,68,0.08)] text-red-600 border-[rgba(239,68,68,0.25)] shadow-none"
              : "bg-[#1a87e1] text-white border-none shadow-[0_4px_12px_rgba(26,135,225,0.25)]"
          }`}
        >
          {showForm ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Add Brand</>}
        </button>
      </div>

      {/* ── Inline AddBrandForm panel (conditionally rendered) ── */}
      {showForm && (
        <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[14px] px-6 py-5 mb-6 shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
          <h2 className="text-[15px] font-bold text-[#1e293b] mb-4">
            Add New Brand
          </h2>
          <AddBrandForm />
        </div>
      )}

      {/* ── Empty state ── */}
      {brands.length === 0 ? (
        <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[14px] py-[60px] text-center shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
          <Tag size={40} color={C.textMuted} className="mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-[#475569]">No brands added yet.</p>
          <p className="text-[12px] text-[#64748b] mt-1">
            Click "Add Brand" to get started.
          </p>
        </div>
      ) : (
        // ── 2-column brand card grid ──
        <div className="grid grid-cols-2 gap-[14px]">
          {brands.map((b) => (
            <div
              key={b.id}
              className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[14px] px-5 py-[18px] shadow-[0_1px_4px_rgba(26,135,225,0.07)]"
            >

              {/* Card top: name, tagline, category badge, delete button */}
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[#1e293b]">{b.name}</p>
                  <p className="text-[12px] text-[#1a87e1] font-medium mt-[2px]">{b.tagline}</p>
                  <span className="inline-block mt-[6px] text-[10px] font-bold px-[10px] py-[3px] rounded-[20px] bg-[rgba(26,135,225,0.1)] text-[#1a87e1] border border-[rgba(26,135,225,0.18)] uppercase tracking-[0.06em]">
                    {b.category}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="flex items-center gap-[5px] bg-[rgba(239,68,68,0.07)] border border-[rgba(239,68,68,0.2)] rounded-lg px-[11px] py-[6px] text-[11px] font-semibold text-red-600 cursor-pointer font-['Inter',sans-serif] shrink-0 ml-[10px]"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>

              {/* Truncated description (2-line clamp) */}
              <p className="text-[12px] text-[#475569] mt-3 leading-[1.6] line-clamp-2">
                {b.description}
              </p>

              {/* Meta row: rating, product count, established year, country */}
              <div className="flex gap-[14px] mt-3 flex-wrap pt-3 border-t border-[rgba(26,135,225,0.18)]">
                <MetaItem icon={Star}     label={b.rating}      />
                <MetaItem icon={Package}  label={`${b.products} products`} />
                <MetaItem icon={Calendar} label={`Est. ${b.established}`}  />
                <MetaItem icon={Globe}    label={b.country}     />
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * MetaItem – small icon + text pair used in the brand card footer row.
 * @param {LucideIcon} icon - Icon component to render.
 * @param {string} label    - Text displayed next to the icon.
 */
function MetaItem({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-[5px]">
      <Icon size={11} color={C.textMuted} />
      <span className="text-[11px] text-[#64748b] font-medium">{label}</span>
    </div>
  );
}
