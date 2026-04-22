'use client';

import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection, addDoc, serverTimestamp,
  query, where, getDocs,
} from "firebase/firestore";
import { CATEGORIES } from "../../data/categories";

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

const FONT = { body: "'DM Sans', sans-serif" };

/** Labelled wrapper for any form control */
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.1em]">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function AddProductForm() {
  // Controlled state for all product fields
  const [form, setForm] = useState({
    name: "", price: "", description: "",
    imageUrl: "", category: "", supplierId: "", stockId: "",
  });

  const [tags, setTags]                 = useState({ newArrival: false, bestSelling: false });
  const [previewStock, setPreviewStock] = useState(null); // shows supplier stock after productCode lookup
  const [loading, setLoading]           = useState(false);

  // Inject shared input/select styles once; cleaned up on unmount
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .light-input::placeholder { color: #94a3b8 !important; }
      .light-input option        { background: #ffffff; color: #1e293b; }
      .light-input:focus         { border-color: rgba(26,135,225,0.5) !important; box-shadow: 0 0 0 3px rgba(26,135,225,0.08); }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleChange    = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleTagChange = (e) => setTags({ ...tags, [e.target.name]: e.target.checked });

  /**
   * Queries the supplier "products" collection by productCode.
   * Returns the first matching document's data, or null if not found.
   */
  const findSupplierProduct = async (productCode) => {
    const q    = query(collection(db, "products"), where("productCode", "==", productCode));
    const snap = await getDocs(q);
    return snap.empty ? null : snap.docs[0].data();
  };

  /**
   * onBlur handler for the Product Code field.
   * Previews available supplier stock without submitting the form.
   */
  const handleStockIdBlur = async () => {
    if (!form.stockId) return;
    const data = await findSupplierProduct(form.stockId);
    setPreviewStock(data ? (data.stock ?? 0) : "Not found");
  };

  /**
   * Submits the product to Firestore.
   * Validates that the productCode maps to a real supplier product first.
   * Tags are stored as an array of active keys (e.g. ["newArrival"]).
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supplierData = await findSupplierProduct(form.stockId);
      if (!supplierData) {
        alert("No supplier product found for this Product Code.");
        setLoading(false);
        return;
      }

      // Convert checkbox map → array of checked keys
      const tagArray = Object.entries(tags)
        .filter(([, checked]) => checked)
        .map(([key]) => key);

      await addDoc(collection(db, "pharmacistProducts"), {
        ...form,
        price: Number(form.price),
        tags: tagArray,
        createdAt: serverTimestamp(),
      });

      alert(`Product added successfully. Starting stock: ${supplierData.stock ?? 0}`);
      setForm({ name: "", price: "", description: "", imageUrl: "", category: "", supplierId: "", stockId: "" });
      setTags({ newArrival: false, bestSelling: false });
      setPreviewStock(null);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-[14px] font-['DM_Sans',sans-serif]"
    >

      {/* Row 1: Name + Price */}
      <div className="grid grid-cols-2 gap-[14px]">
        <Field label="Product Name">
          <input
            name="name"
            placeholder="e.g. Omega-3 Fish Oil"
            value={form.name}
            onChange={handleChange}
            className="light-input bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-full"
            required
          />
        </Field>
        <Field label="Price (Rs.)">
          <input
            name="price"
            placeholder="0.00"
            type="number"
            value={form.price}
            onChange={handleChange}
            className="light-input bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-full"
            required
          />
        </Field>
      </div>

      {/* Category dropdown – options sourced from CATEGORIES constant */}
      <Field label="Category">
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="light-input appearance-none bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-full"
          required
        >
          <option value="">Select category</option>
          {CATEGORIES.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Description">
        <input
          name="description"
          placeholder="Short product description"
          value={form.description}
          onChange={handleChange}
          className="light-input bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-full"
        />
      </Field>

      <Field label="Image URL">
        <input
          name="imageUrl"
          placeholder="https://..."
          value={form.imageUrl}
          onChange={handleChange}
          className="light-input bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-full"
        />
      </Field>

      {/* Row 2: Supplier ID + Product Code (used to cross-reference stock) */}
      <div className="grid grid-cols-2 gap-[14px]">
        <Field label="Supplier ID">
          <input
            name="supplierId"
            placeholder="SUP-001"
            value={form.supplierId}
            onChange={handleChange}
            className="light-input bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-full"
            required
          />
        </Field>
        <Field label="Product Code">
          <input
            name="stockId"
            placeholder="e.g. PO21"
            value={form.stockId}
            onChange={handleChange}
            onBlur={handleStockIdBlur}
            className="light-input bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] outline-none w-full"
            required
          />
        </Field>
      </div>

      {/* Inline stock preview – shown after productCode lookup */}
      {previewStock !== null && (
        <div className={`text-[13px] font-medium rounded-lg px-[13px] py-[9px] border ${
          previewStock === "Not found"
            ? "text-red-500 bg-[rgba(239,68,68,0.06)] border-[rgba(239,68,68,0.2)]"
            : "text-[#0284c7] bg-[rgba(26,135,225,0.06)] border-[rgba(26,135,225,0.18)]"
        }`}>
          {previewStock === "Not found"
            ? "Supplier product not found for this code."
            : `Supplier stock available: ${previewStock} units`}
        </div>
      )}

      {/* Tag checkboxes – styled as toggle chips */}
      <Field label="Product Tags">
        <div className="flex gap-[10px]">
          <TagCheckbox
            name="newArrival" label="New Arrival"
            checked={tags.newArrival} onChange={handleTagChange}
          />
          <TagCheckbox
            name="bestSelling" label="Best Selling"
            checked={tags.bestSelling} onChange={handleTagChange}
          />
        </div>
      </Field>

      <button
        type="submit"
        disabled={loading}
        className={`border-none rounded-[10px] py-3 px-3 text-[14px] font-semibold font-['DM_Sans',sans-serif] mt-1 text-white tracking-[0.02em] transition-all ${
          loading
            ? "bg-[rgba(26,135,225,0.5)] cursor-not-allowed shadow-none"
            : "bg-[#1a87e1] cursor-pointer shadow-[0_4px_12px_rgba(26,135,225,0.25)]"
        }`}
      >
        {loading ? "Adding product..." : "Add Product"}
      </button>

    </form>
  );
}

/**
 * TagCheckbox – styled checkbox that visually appears as a toggleable chip.
 * Border and background shift when checked.
 */
function TagCheckbox({ name, label, checked, onChange }) {
  return (
    <label className={`flex items-center gap-2 px-[14px] py-2 rounded-[9px] cursor-pointer text-[13px] font-medium select-none border transition-all duration-150 ${
      checked
        ? "border-[#1a87e1] bg-[rgba(26,135,225,0.1)] text-[#1a87e1]"
        : "border-[rgba(26,135,225,0.18)] bg-white text-[#475569]"
    }`}>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="w-[14px] h-[14px] accent-[#1a87e1]"
      />
      {label}
    </label>
  );
}