"use client";

import { useState, useEffect } from "react";
import { CATEGORIES } from "../../data/categories";
import API_BASE_URL from "../../config/api";
import { auth } from "../../services/firebase";

// ─── Toast notification ───────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-[13px] font-medium text-white min-w-[260px] max-w-[340px] transition-all duration-300 ${
            t.type === "success" ? "bg-emerald-500" :
            t.type === "error"   ? "bg-rose-500"    :
                                   "bg-slate-700"
          }`}
        >
          <span className="text-[16px]">
            {t.type === "success" ? "✅" : t.type === "error" ? "❌" : "ℹ️"}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ product, visibility, onConfirm, onCancel }) {
  if (!product) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[340px] p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-[15px] font-bold text-slate-800">Confirm Approval</h3>
          <p className="text-[12px] text-slate-500">
            You are about to approve the following product:
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex flex-col gap-1">
          <p className="text-[13px] font-semibold text-slate-800">{product.name}</p>
          <p className="text-[11px] text-slate-500">{product.category} · Code: {product.stockId}</p>
          <p className="text-[12px] font-bold text-emerald-600 mt-1">Rs. {Number(product.price).toFixed(2)}</p>
        </div>

        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium ${
          visibility === "customer"
            ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
            : "bg-rose-50 border border-rose-200 text-rose-600"
        }`}>
          <span>{visibility === "customer" ? "🌐" : "🔒"}</span>
          <span>
            {visibility === "customer"
              ? "Will be visible to customers"
              : "Pharmacist dashboard only"}
          </span>
        </div>

        <div className="flex gap-3 mt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-[13px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border-none cursor-pointer transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg text-[13px] font-semibold text-white bg-[#1a87e1] hover:bg-[#1570c4] border-none cursor-pointer transition-all"
          >
            Confirm Approve
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable field wrapper ───────────────────────────────────────────────────
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

// ─── Tag checkbox ─────────────────────────────────────────────────────────────
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

// ─── Visibility selector ──────────────────────────────────────────────────────
function VisibilitySelector({ value, onChange }) {
  const options = [
    {
      key:        "customer",
      icon:       "🌐",
      title:      "Show to Customer",
      desc:       "Product appears on the public customer store page",
      activeCls:  "border-emerald-500 bg-emerald-50",
      titleCls:   "text-emerald-700",
      descCls:    "text-emerald-500",
      dotCls:     "bg-emerald-500",
      borderCls:  "border-emerald-500",
    },
    {
      key:        "pharmacist_only",
      icon:       "🔒",
      title:      "Pharmacist Only",
      desc:       "Hidden from customers — visible in this dashboard only",
      activeCls:  "border-rose-400 bg-rose-50",
      titleCls:   "text-rose-700",
      descCls:    "text-rose-400",
      dotCls:     "bg-rose-500",
      borderCls:  "border-rose-400",
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const isActive = value === opt.key;
        return (
          <div
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-150 select-none ${
              isActive
                ? opt.activeCls
                : "border-[rgba(26,135,225,0.15)] bg-white hover:border-[rgba(26,135,225,0.3)]"
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
              isActive ? opt.borderCls : "border-slate-300"
            }`}>
              {isActive && <div className={`w-2 h-2 rounded-full ${opt.dotCls}`} />}
            </div>
            <span className="text-[18px] leading-none">{opt.icon}</span>
            <div className="flex flex-col">
              <span className={`text-[13px] font-semibold ${isActive ? opt.titleCls : "text-slate-700"}`}>
                {opt.title}
              </span>
              <span className={`text-[11px] ${isActive ? opt.descCls : "text-slate-400"}`}>
                {opt.desc}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PHARMACIST_API = `${import.meta.env.VITE_API_URL_RAILWAY && import.meta.env.VITE_API_URL_RAILWAY !== 'undefined' ? import.meta.env.VITE_API_URL_RAILWAY : (import.meta.env.VITE_API_URL || 'http://localhost:5000')}/api/products`;
const MARKUP_RATE    = 1.2;

// ─── Main component ───────────────────────────────────────────────────────────
export default function AddProductForm() {
  const [pendingProducts, setPendingProducts] = useState([]);
  const [selectedPending, setSelectedPending] = useState(null);
  const [loadingPending,  setLoadingPending]  = useState(true);
  const [toasts,          setToasts]          = useState([]);
  const [showConfirm,     setShowConfirm]     = useState(false);

  const [form, setForm] = useState({
    name:        "",
    price:       "",
    description: "",
    imageUrl:    "",
    category:    "",
    supplierId:  "",
    stockId:     "",
    expireDate:  "",
  });
  const [tags,         setTags]         = useState({ newArrival: false });
  const [visibility,   setVisibility]   = useState("customer");
  const [loading,      setLoading]      = useState(false);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // ─── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  useEffect(() => { fetchPendingProducts(); }, []);

  const fetchPendingProducts = async () => {
    try {
      setLoadingPending(true);
      const res  = await fetch(`${PHARMACIST_API}/pending`);
      const data = await res.json();
      setPendingProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading pending products:", err);
      setPendingProducts([]);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleSelectPending = (product) => {
    setSelectedPending(product);
    setForm({
      name:        product.productName || "",
      price:       product.retailPrice
                     ? product.retailPrice
                     : (Number(product.wholesalePrice) * MARKUP_RATE).toFixed(2),
      description: product.description || "",
      imageUrl:    product.imageUrl    || "",
      category:    product.category    || "",
      supplierId:  product.supplierId  || "",
      stockId:     product.productCode || "",
      expireDate:  product.expireDate  
                     ? (typeof product.expireDate === "object" && product.expireDate._seconds 
                         ? new Date(product.expireDate._seconds * 1000).toISOString().split("T")[0]
                         : new Date(product.expireDate).toISOString().split("T")[0])
                     : "",
    });
    setTags({ newArrival: false });
    setVisibility("customer");
  };

  const handleChange    = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleTagChange = (e) => setTags({ ...tags, [e.target.name]: e.target.checked });

  const handleGenerateDescription = async () => {
    if (!form.name) { showToast("Please enter a product name first.", "error"); return; }
    setAiLoading(true);
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL_RAILWAY && import.meta.env.VITE_API_URL_RAILWAY !== 'undefined' ? import.meta.env.VITE_API_URL_RAILWAY : (import.meta.env.VITE_API_URL || 'http://localhost:5000')}/api/ai/describe`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: form.name, category: form.category || "medicine" }),
      });
      const data = await res.json();
      if (data?.description) {
        setForm((prev) => ({ ...prev, description: data.description.trim() }));
        showToast("Description generated successfully.", "success");
      } else {
        showToast("AI did not return content. Try again.", "error");
      }
    } catch (err) {
      showToast("AI generation failed: " + err.message, "error");
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!form.name) { showToast("Please enter a product name first.", "error"); return; }
    setImageLoading(true);
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL_RAILWAY && import.meta.env.VITE_API_URL_RAILWAY !== 'undefined' ? import.meta.env.VITE_API_URL_RAILWAY : (import.meta.env.VITE_API_URL || 'http://localhost:5000')}/api/ai/generate-image`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: form.name, category: form.category }),
      });
      const data = await res.json();
      if (data?.imageUrl) {
        setForm((prev) => ({ ...prev, imageUrl: data.imageUrl }));
        showToast("Image generated successfully.", "success");
      } else {
        showToast("Image generation failed. Try again.", "error");
      }
    } catch (err) {
      showToast("Image generation failed: " + err.message, "error");
    } finally {
      setImageLoading(false);
    }
  };

  const buildPayload = () => {
    const tagArray = Object.entries(tags)
      .filter(([, checked]) => checked)
      .map(([key]) => key);
    return { ...form, tags: tagArray, visibility };
  };

  // ─── Approve: show confirm dialog first ───────────────────────────────────
  const handleApproveClick = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleApproveAndAdd = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      await fetch(`${PHARMACIST_API}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(buildPayload()),
      });

      await fetch(`${PHARMACIST_API}/pending/${selectedPending.id}/approve`, {
        method: "PATCH",
      });

      setPendingProducts((prev) => prev.filter((p) => p.id !== selectedPending.id));

      showToast(
        visibility === "customer"
          ? "Product approved and visible to customers."
          : "Product approved — pharmacist dashboard only.",
        "success"
      );

      resetForm();
      fetchPendingProducts();
    } catch (err) {
      showToast(`Approval failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${PHARMACIST_API}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(buildPayload()),
      });

      if (visibility === "customer") {
        try {
          const token = auth.currentUser
            ? await auth.currentUser.getIdToken()
            : null;
          await fetch(`${API_BASE_URL}/search/sync`, {
            headers: { ...(token && { Authorization: `Bearer ${token}` }) },
          });
        } catch (syncErr) {
          console.warn("Search sync failed (non-critical):", syncErr);
        }
      }

      showToast("Product added successfully.", "success");
      resetForm();
    } catch (err) {
      showToast(`Error: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: "", price: "", description: "", imageUrl: "", category: "", supplierId: "", stockId: "", expireDate: "" });
    setTags({ newArrival: false });
    setVisibility("customer");
    setSelectedPending(null);
  };

  return (
    <div className="flex flex-col gap-6 ">

      {/* ── Toast container ────────────────────────────────────────────────── */}
      <Toast toasts={toasts} />

      {/* ── Confirm dialog ─────────────────────────────────────────────────── */}
      {showConfirm && (
        <ConfirmDialog
          product={form}
          visibility={visibility}
          onConfirm={handleApproveAndAdd}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* ── Pending approvals from admin ───────────────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="text-[13px] font-bold text-amber-800 uppercase tracking-wide mb-3">
          Pending Approvals from Admin ({pendingProducts.length})
        </h3>

        {loadingPending ? (
          <p className="text-sm text-amber-600">Loading...</p>
        ) : pendingProducts.length === 0 ? (
          <p className="text-sm text-amber-600">No pending products from admin.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => handleSelectPending(p)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                  selectedPending?.id === p.id
                    ? "border-[#1a87e1] bg-[rgba(26,135,225,0.08)]"
                    : "border-slate-200 bg-white hover:border-[#1a87e1]"
                }`}
              >
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">{p.productName}</p>
                  <p className="text-[11px] text-slate-500">
                    {p.category} · Supplier: {p.supplierName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold text-emerald-600">
                    Rs.{" "}
                    {p.retailPrice
                      ? Number(p.retailPrice).toFixed(2)
                      : (Number(p.wholesalePrice) * MARKUP_RATE).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-slate-400">Stock: {p.stock}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Product form ───────────────────────────────────────────────────── */}
      <form
        onSubmit={selectedPending ? handleApproveClick : handleManualSubmit}
        className="flex flex-col gap-[14px]"
      >
        {selectedPending && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-[13px] text-emerald-700 font-medium">
            ✓ Pre-filled from admin approval — set visibility below before submitting
          </div>
        )}

        {/* Name + Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          <Field label="Product Name">
            <input
              name="name"
              placeholder="e.g. Omega-3 Fish Oil"
              value={form.name}
              onChange={handleChange}
              className="bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] outline-none w-full"
              required
            />
          </Field>
          <Field label="Selling Price (Rs.)">
            <input
              name="price"
              placeholder="0.00"
              type="number"
              value={form.price}
              onChange={handleChange}
              className="bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] outline-none w-full"
              required
            />
          </Field>
        </div>

        {/* Category */}
        <Field label="Category">
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="appearance-none bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] outline-none w-full"
            required
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>

        {/* Description + AI */}
        <Field label="Description">
          <div className="flex gap-2">
            <input
              name="description"
              placeholder="Short product description"
              value={form.description}
              onChange={handleChange}
              className="bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] outline-none w-full"
            />
            <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={aiLoading}
              className={`shrink-0 px-3 py-[10px] rounded-lg text-[12px] font-semibold text-white border-none transition-all ${
                aiLoading ? "bg-purple-300 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 cursor-pointer"
              }`}
            >
              {aiLoading ? "..." : "✨ AI"}
            </button>
          </div>
        </Field>

        {/* Image URL + AI */}
        <Field label="Image URL">
          <div className="flex gap-2">
            <input
              name="imageUrl"
              placeholder="https://..."
              value={form.imageUrl}
              onChange={handleChange}
              className="bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] outline-none w-full"
            />
            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={imageLoading}
              className={`shrink-0 px-3 py-[10px] rounded-lg text-[12px] font-semibold text-white border-none transition-all ${
                imageLoading ? "bg-pink-300 cursor-not-allowed" : "bg-pink-600 hover:bg-pink-700 cursor-pointer"
              }`}
            >
              {imageLoading ? "..." : "🎨 AI"}
            </button>
          </div>
          {form.imageUrl?.startsWith("data:image") && (
            <img
              src={form.imageUrl}
              alt="AI Generated"
              className="mt-2 w-24 h-24 object-cover rounded-lg border"
            />
          )}
        </Field>

        {/* Supplier + Stock */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          <Field label="Supplier ID">
            <input
              name="supplierId"
              placeholder="SUP-001"
              value={form.supplierId}
              onChange={handleChange}
              className="bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] outline-none w-full"
              required
            />
          </Field>
          <Field label="Product Code">
            <input
              name="stockId"
              placeholder="e.g. PO21"
              value={form.stockId}
              onChange={handleChange}
              className="bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] outline-none w-full"
              required
            />
          </Field>
        </div>

        {/* Expiry Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          <Field label="Expiry Date">
            <input
              type="date"
              name="expireDate"
              value={form.expireDate}
              onChange={handleChange}
              className="bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] outline-none w-full"
            />
          </Field>
        </div>

        {/* Tags */}
        <Field label="Product Tags">
          <div className="flex gap-[10px]">
            <TagCheckbox
              name="newArrival"
              label="New Arrival"
              checked={tags.newArrival}
              onChange={handleTagChange}
            />
          </div>
        </Field>

        {/* Visibility selector */}
        <div className="flex flex-col gap-[6px]">
          <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.1em]">
            Product Visibility
          </label>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px] text-slate-500 mb-1">
            Choose where this product should appear after saving.
          </div>
          <VisibilitySelector value={visibility} onChange={setVisibility} />
        </div>

        {/* Visibility summary */}
        {visibility === "pharmacist_only" ? (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2">
            <span className="text-rose-500 text-[15px]">🔒</span>
            <p className="text-[12px] text-rose-600 font-medium">
              This product will <strong>NOT</strong> be visible to customers.
              Only pharmacists can see and manage it.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
            <span className="text-emerald-500 text-[15px]">🌐</span>
            <p className="text-[12px] text-emerald-600 font-medium">
              This product will appear on the <strong>Customer Store</strong> page.
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={`border-none rounded-[10px] py-3 px-3 text-[14px] font-semibold mt-1 text-white tracking-[0.02em] transition-all ${
            loading
              ? "bg-[rgba(26,135,225,0.5)] cursor-not-allowed"
              : "bg-[#1a87e1] cursor-pointer shadow-[0_4px_12px_rgba(26,135,225,0.25)]"
          }`}
        >
          {loading
            ? "Processing..."
            : selectedPending
              ? visibility === "customer"
                ? "✓ Approve & Show to Customers"
                : "✓ Approve & Keep Pharmacist Only"
              : visibility === "customer"
                ? "Add Product to Store"
                : "Add Product (Pharmacist Only)"}
        </button>
      </form>
    </div>
  );
}