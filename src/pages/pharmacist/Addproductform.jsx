"use client";

import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, query, where,
} from "firebase/firestore";
import { CATEGORIES } from "../../data/categories";
import API_BASE_URL from "../../config/api";
import { auth } from "../../services/firebase";

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

export default function AddProductForm() {
  const [pendingProducts, setPendingProducts] = useState([]);
  const [selectedPending, setSelectedPending] = useState(null);
  const [loadingPending, setLoadingPending]   = useState(true);

  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    imageUrl: "",
    category: "",
    supplierId: "",
    stockId: "",
  });
  const [tags, setTags]       = useState({ newArrival: false, bestSelling: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPendingProducts();
  }, []);

  const fetchPendingProducts = async () => {
    try {
      setLoadingPending(true);
      const q    = query(collection(db, "pendingProducts"), where("status", "==", "approved"));
      const snap = await getDocs(q);
      setPendingProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error loading pending products:", err);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleSelectPending = (product) => {
    setSelectedPending(product);
    setForm({
      name:        product.productName  || "",
      price:       product.retailPrice
                     ? product.retailPrice
                     : (Number(product.wholesalePrice) * 1.2).toFixed(2),
      description: product.description  || "",
      imageUrl:    product.imageUrl     || "",
      category:    product.category     || "",
      supplierId:  product.supplierId   || "",
      stockId:     product.productCode  || "",
    });
    setTags({ newArrival: false, bestSelling: false });
  };

  const handleChange    = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleTagChange = (e) => setTags({ ...tags, [e.target.name]: e.target.checked });

  const handleApproveAndAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tagArray = Object.entries(tags)
        .filter(([, checked]) => checked)
        .map(([key]) => key);

      // 1. Add to pharmacistProducts (customers see this)
      await addDoc(collection(db, "pharmacistProducts"), {
        name:        form.name,
        price:       Number(form.price),
        description: form.description,
        imageUrl:    form.imageUrl,
        category:    form.category,
        supplierId:  form.supplierId,
        stockId:     form.stockId,
        retailPrice: Number(form.price),
        tags:        tagArray,
        status:      "active",
        createdAt:   serverTimestamp(),
      });

      // 2. Mark pendingProduct as pharmacist_approved
      if (selectedPending) {
        await updateDoc(doc(db, "pendingProducts", selectedPending.id), {
          status: "pharmacist_approved",
        });
      }

      alert("Product approved and added! Customers can now see it.");

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

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tagArray = Object.entries(tags)
        .filter(([, checked]) => checked)
        .map(([key]) => key);

      await addDoc(collection(db, "pharmacistProducts"), {
        name:        form.name,
        price:       Number(form.price),
        description: form.description,
        imageUrl:    form.imageUrl,
        category:    form.category,
        supplierId:  form.supplierId,
        stockId:     form.stockId,
        retailPrice: Number(form.price),
        tags:        tagArray,
        status:      "active",
        createdAt:   serverTimestamp(),
      });

      // Auto-sync new product into Pinecone for SmartSearch
      try {
        const token = auth.currentUser
          ? await auth.currentUser.getIdToken()
          : null;
        await fetch(`${API_BASE_URL}/api/admin/search/sync`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
      } catch (syncErr) {
        console.warn("Search sync failed (non-critical):", syncErr);
      }

      alert(
        `Product added successfully. Starting stock: ${supplierData.stock ?? 0}`,
      );
      setForm({
        name: "",
        price: "",
        description: "",
        imageUrl: "",
        category: "",
        supplierId: "",
        stockId: "",
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

      {/* ── Pending Products from Admin ── */}
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
                  <p className="text-[11px] text-slate-500">{p.category} · Supplier: {p.supplierName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold text-emerald-600">
                    Rs. {p.retailPrice
                      ? Number(p.retailPrice).toFixed(2)
                      : (Number(p.wholesalePrice) * 1.2).toFixed(2)}
                  </p>
                  <p className="text-[11px] text-slate-400">Stock: {p.stock}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Form ── */}
      <form
        onSubmit={selectedPending ? handleApproveAndAdd : handleManualSubmit}
        className="flex flex-col gap-[14px]"
      >
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

        <Field label="Product Tags">
          <div className="flex gap-[10px]">
            <TagCheckbox name="newArrival"  label="New Arrival"  checked={tags.newArrival}  onChange={handleTagChange} />
            <TagCheckbox name="bestSelling" label="Best Selling" checked={tags.bestSelling} onChange={handleTagChange} />
          </div>
        </Field>

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
