"use client";

import { useState, useEffect } from "react";
import { CATEGORIES } from "../../data/categories";
import API_BASE_URL from "../../config/api";
import { auth } from "../../services/firebase";

// Reusable labelled field wrapper used across all form inputs
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

// Styled checkbox component used for product tag selection (New Arrival, Best Selling)
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

// Backend endpoint for all pharmacist product operations
const PHARMACIST_API = 'http://localhost:5000/api/products';

// Markup multiplier applied to wholesale price when no retail price is set.
// Change this one value if the business markup rate changes.
const MARKUP_RATE = 1.2;

export default function AddProductForm() {
  // Products submitted by admin that are waiting for pharmacist approval
  const [pendingProducts, setPendingProducts] = useState([]);
  // The pending product the pharmacist has clicked to review and approve
  const [selectedPending, setSelectedPending] = useState(null);
  const [loadingPending, setLoadingPending]   = useState(true);

  // Controlled form state for all product fields
  const [form, setForm] = useState({
    name:        "",
    price:       "",
    description: "",
    imageUrl:    "",
    category:    "",
    supplierId:  "",
    stockId:     "",
  });
  // Tag checkboxes state — tracks which promotional tags are active
  const [tags, setTags]       = useState({ newArrival: false, bestSelling: false });
  const [loading, setLoading] = useState(false);

  // Fetch pending products on initial mount
  useEffect(() => {
    fetchPendingProducts();
  }, []);

  // Loads products from admin that have not yet been approved by the pharmacist
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

  // Pre-fills the form with the selected pending product's data for review
  const handleSelectPending = (product) => {
    setSelectedPending(product);
    setForm({
      name:        product.productName  || "",
      // Use retailPrice if set; otherwise calculate markup on wholesale price
      price:       product.retailPrice
                     ? product.retailPrice
                     : (Number(product.wholesalePrice) * MARKUP_RATE).toFixed(2),
      description: product.description  || "",
      imageUrl:    product.imageUrl     || "",
      category:    product.category     || "",
      supplierId:  product.supplierId   || "",
      stockId:     product.productCode  || "",
    });
    // Reset tags when switching between pending products
    setTags({ newArrival: false, bestSelling: false });
  };

  // Generic change handler for all text/number inputs using field name attribute
  const handleChange    = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  // Toggles individual tag checkboxes by their name attribute
  const handleTagChange = (e) => setTags({ ...tags, [e.target.name]: e.target.checked });

  // Approves a pending admin product: adds it to pharmacistProducts and marks it approved
  const handleApproveAndAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Convert the tags object into an array of active tag keys
      const tagArray = Object.entries(tags)
        .filter(([, checked]) => checked)
        .map(([key]) => key);

      // 1. Add to pharmacistProducts (customers see this)
      await fetch(`${PHARMACIST_API}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, tags: tagArray }),
      });

      // 2. Mark pendingProduct as pharmacist_approved
      if (selectedPending) {
        await fetch(`${PHARMACIST_API}/pending/${selectedPending.id}/approve`, {
          method: "PATCH",
        });
      }

      alert("Product approved and added! Customers can now see it.");

      // Reset form and refresh pending list after approval
      setForm({ name: "", price: "", description: "", imageUrl: "", category: "", supplierId: "", stockId: "" });
      setTags({ newArrival: false, bestSelling: false });
      setSelectedPending(null);
      fetchPendingProducts();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Manually adds a new product without an admin pending approval — also triggers search sync
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Convert the tags object into an array of active tag keys
      const tagArray = Object.entries(tags)
        .filter(([, checked]) => checked)
        .map(([key]) => key);

      await fetch(`${PHARMACIST_API}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, tags: tagArray }),
      });

      // Auto-sync new product into Pinecone for SmartSearch
      try {
        // Get Firebase auth token if user is logged in, for authorized sync request
        const token = auth.currentUser
          ? await auth.currentUser.getIdToken()
          : null;
        await fetch(`${API_BASE_URL}/search/sync`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
      } catch (syncErr) {
        // Search sync failure is non-critical — product was already saved successfully
        console.warn("Search sync failed (non-critical):", syncErr);
      }

      alert("Product added successfully.");
      // Reset form fields after successful manual submission
      setForm({
        name:        "",
        price:       "",
        description: "",
        imageUrl:    "",
        category:    "",
        supplierId:  "",
        stockId:     "",
      });
      setTags({ newArrival: false, bestSelling: false });
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-['DM_Sans',sans-serif]">

      {/* Pending products from admin — pharmacist selects one to pre-fill the form */}
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
              // Clicking a pending product pre-fills the form below for review
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
                  <p className="text-[11px] text-slate-500">{p.category} · Supplier: {p.supplierName}</p>
                </div>
                <div className="text-right">
                  {/* Show retailPrice if set; otherwise display calculated markup price */}
                  <p className="text-[13px] font-bold text-emerald-600">
                    Rs. {p.retailPrice
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

      {/* Product form — switches between approve flow and manual add based on selectedPending */}
      <form
        onSubmit={selectedPending ? handleApproveAndAdd : handleManualSubmit}
        className="flex flex-col gap-[14px]"
      >
        {/* Info banner shown when form is pre-filled from a pending product */}
        {selectedPending && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-[13px] text-emerald-700 font-medium">
            ✓ Pre-filled from admin approval — review and click "Approve & Add"
          </div>
        )}

        <div className="grid grid-cols-2 gap-[14px]">
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

        <Field label="Category">
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="appearance-none bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] outline-none w-full"
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
            className="bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] outline-none w-full"
          />
        </Field>

        <Field label="Image URL">
          <input
            name="imageUrl"
            placeholder="https://..."
            value={form.imageUrl}
            onChange={handleChange}
            className="bg-white border border-[rgba(26,135,225,0.18)] rounded-lg px-3 py-[10px] text-[13px] text-[#1e293b] outline-none w-full"
          />
        </Field>

        {/* Supplier ID and product code side by side */}
        <div className="grid grid-cols-2 gap-[14px]">
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

        {/* Promotional tag checkboxes — New Arrival and Best Selling */}
        <Field label="Product Tags">
          <div className="flex gap-[10px]">
            <TagCheckbox name="newArrival"  label="New Arrival"  checked={tags.newArrival}  onChange={handleTagChange} />
            
          </div>
        </Field>

        {/* Submit button — label changes based on whether approving or manually adding */}
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
              ? "✓ Approve & Add to Store"
              : "Add Product"}
        </button>
      </form>
    </div>
  );
}