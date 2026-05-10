"use client";

import { useState, useEffect } from "react";

const PHARMACIST_API = "http://localhost:5000/api/products";

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  .pmp-root *, .pmp-root *::before, .pmp-root *::after { box-sizing: border-box; }

  .pmp-root {
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: #f4f6fb;
    min-height: 100vh;
    color: #0f172a;
  }

  /* Shell */
  .pmp-shell {
    width: 100%;
    padding: 36px 40px 90px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  /* Header */
  .pmp-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    padding-bottom: 24px;
    border-bottom: 1.5px solid #e2e8f0;
  }
  .pmp-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.3px;
    line-height: 1.2;
    margin: 0 0 4px;
  }
  .pmp-title span { color: #1a87e1; }
  .pmp-subtitle {
    margin: 0;
    font-size: 13px;
    color: #94a3b8;
    font-weight: 400;
  }
  .pmp-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    background: white;
    font-size: 12.5px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    transition: all 0.15s;
    white-space: nowrap;
    letter-spacing: 0.01em;
  }
  .pmp-refresh-btn:hover {
    border-color: #1a87e1;
    color: #1a87e1;
    background: #f0f7ff;
  }

  /* Stats */
  .pmp-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 360px));
    gap: 14px;
  }
  .pmp-stat {
    background: white;
    border-radius: 18px;
    padding: 22px 20px 20px;
    border: 1.5px solid #e8edf5;
    position: relative;
    overflow: hidden;
    transition: box-shadow 0.2s, transform 0.15s;
    cursor: default;
  }
  .pmp-stat:hover {
    box-shadow: 0 6px 24px rgba(0,0,0,0.07);
    transform: translateY(-1px);
  }
  .pmp-stat::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    border-radius: 18px 18px 0 0;
  }
  .pmp-stat.total::before   { background: #cbd5e1; }
  .pmp-stat.vis::before     { background: linear-gradient(90deg, #10b981, #34d399); }
  .pmp-stat.rx::before      { background: linear-gradient(90deg, #f43f5e, #fb7185); }
  .pmp-stat-num {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 30px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 5px;
  }
  .pmp-stat.total .pmp-stat-num { color: #334155; }
  .pmp-stat.vis   .pmp-stat-num { color: #059669; }
  .pmp-stat.rx    .pmp-stat-num { color: #e11d48; }
  .pmp-stat-label {
    font-size: 11.5px;
    font-weight: 500;
    color: #94a3b8;
    letter-spacing: 0.02em;
  }
  .pmp-stat-icon {
    position: absolute;
    right: 18px;
    bottom: 16px;
    font-size: 24px;
    opacity: 0.12;
  }

  /* Toolbar */
  .pmp-toolbar {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }
  .pmp-search-wrap {
    flex: 1;
    min-width: 220px;
    position: relative;
  }
  .pmp-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 13px;
    pointer-events: none;
    opacity: 0.4;
  }
  .pmp-search {
    width: 100%;
    padding: 11px 14px 11px 38px;
    border-radius: 12px;
    border: 1.5px solid #e2e8f0;
    background: white;
    font-size: 13px;
    color: #0f172a;
    font-family: 'Plus Jakarta Sans', sans-serif;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .pmp-search:focus {
    border-color: #1a87e1;
    box-shadow: 0 0 0 3px rgba(26,135,225,0.1);
  }
  .pmp-search::placeholder { color: #b0bec5; }

  /* Filters */
  .pmp-filters {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .pmp-filter-btn {
    padding: 9px 16px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    background: white;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .pmp-filter-btn:hover { border-color: #1a87e1; color: #1a87e1; }
  .pmp-filter-btn.f-all      { background: #1a87e1; border-color: #1a87e1; color: white; }
  .pmp-filter-btn.f-vis      { background: #10b981; border-color: #10b981; color: white; }
  .pmp-filter-btn.f-rx       { background: #f43f5e; border-color: #f43f5e; color: white; }

  /* Section label */
  .pmp-section-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #94a3b8;
    margin-bottom: -16px;
  }

  /* List */
  .pmp-list {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-top: 4px;
  }
  @media (max-width: 1100px) {
    .pmp-list { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 860px) {
    .pmp-list { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 540px) {
    .pmp-list { grid-template-columns: 1fr; }
  }

  /* Card */
  .pmp-card {
    background: white;
    border-radius: 18px;
    border: 1.5px solid #e8edf5;
    overflow: hidden;
    transition: box-shadow 0.2s, border-color 0.2s, transform 0.15s;
  }
  .pmp-card:hover {
    box-shadow: 0 6px 28px rgba(0,0,0,0.07);
    transform: translateY(-1px);
  }
  .pmp-card.rx-card {
    border-color: #fecdd3;
    background: #fffafb;
  }
  .pmp-card.rx-card:hover {
    border-color: #fb7185;
    box-shadow: 0 6px 28px rgba(244,63,94,0.09);
  }

  .pmp-card-strip {
    background: linear-gradient(90deg, #fff1f2, #ffe4e6);
    border-bottom: 1px solid #fecdd3;
    padding: 6px 18px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .pmp-card-strip-text {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #e11d48;
  }

  .pmp-card-body {
    display: flex;
    gap: 16px;
    padding: 18px 18px 14px;
    align-items: flex-start;
  }

  .pmp-card-img {
    width: 62px;
    height: 62px;
    border-radius: 14px;
    overflow: hidden;
    background: #f1f5f9;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid #e8edf5;
  }
  .pmp-card-img img { width: 100%; height: 100%; object-fit: cover; }
  .pmp-card-img-fallback { font-size: 24px; opacity: 0.4; }

  .pmp-card-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .pmp-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 6px;
    flex-direction: column;
  }
  .pmp-card-name {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .pmp-card-meta {
    font-size: 12px;
    color: #94a3b8;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .pmp-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #cbd5e1;
    display: inline-block;
  }
  .pmp-card-price {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: #1a87e1;
    margin: 2px 0 0;
  }

  /* Badge */
  .pmp-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 10.5px;
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .pmp-badge.vis { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
  .pmp-badge.rx  { background: #ffe4e6; color: #be123c; border: 1px solid #fecdd3; }

  /* Card footer */
  .pmp-card-footer {
    border-top: 1px solid #f1f5f9;
    padding: 11px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .pmp-card-tag { font-size: 11.5px; color: #94a3b8; font-weight: 500; }

  .pmp-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 8px 16px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    border: 1.5px solid;
    transition: all 0.15s;
    letter-spacing: 0.01em;
  }
  .pmp-toggle-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .pmp-toggle-btn.to-vis {
    background: #f0fdf4;
    border-color: #86efac;
    color: #15803d;
  }
  .pmp-toggle-btn.to-vis:not(:disabled):hover {
    background: #dcfce7;
    border-color: #4ade80;
  }
  .pmp-toggle-btn.to-rx {
    background: #fff1f2;
    border-color: #fda4af;
    color: #be123c;
  }
  .pmp-toggle-btn.to-rx:not(:disabled):hover {
    background: #ffe4e6;
    border-color: #fb7185;
  }
  .pmp-toggle-btn.busy {
    background: #f8fafc;
    border-color: #e2e8f0;
    color: #94a3b8;
  }

  /* Empty */
  .pmp-empty {
    background: white;
    border-radius: 18px;
    border: 1.5px dashed #e2e8f0;
    padding: 64px 24px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }
  .pmp-empty-icon  { font-size: 38px; opacity: 0.25; }
  .pmp-empty-title { font-size: 14.5px; font-weight: 600; color: #64748b; margin: 0; }
  .pmp-empty-sub   { font-size: 12.5px; color: #b0bec5; margin: 0; }

  /* Skeleton */
  .pmp-skeleton {
    background: white;
    border-radius: 18px;
    border: 1.5px solid #e8edf5;
    height: 90px;
    position: relative;
    overflow: hidden;
  }
  .pmp-skeleton::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(241,245,249,0.9) 50%, transparent 100%);
    animation: shimmer 1.4s infinite;
  }
  @keyframes shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  /* Modal */
  .pmp-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15,23,42,0.45);
    backdrop-filter: blur(5px);
    padding: 20px;
  }
  .pmp-modal {
    background: white;
    border-radius: 22px;
    box-shadow: 0 28px 72px rgba(0,0,0,0.2);
    padding: 30px;
    width: 100%;
    max-width: 370px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    border: 1.5px solid #e8edf5;
    animation: modalIn 0.2s ease;
  }
  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.94) translateY(10px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);    }
  }
  .pmp-modal-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.2px;
  }
  .pmp-modal-product {
    font-size: 13px;
    color: #64748b;
    margin: -6px 0 0;
  }
  .pmp-modal-product strong { color: #0f172a; }
  .pmp-modal-msg {
    border-radius: 13px;
    padding: 14px 16px;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.55;
  }
  .pmp-modal-msg.to-vis { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
  .pmp-modal-msg.to-rx  { background: #fff1f2; border: 1px solid #fecdd3; color: #9f1239; }
  .pmp-modal-actions { display: flex; gap: 10px; }
  .pmp-modal-cancel {
    flex: 1;
    padding: 11px;
    border-radius: 12px;
    border: 1.5px solid #e2e8f0;
    background: white;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    transition: all 0.15s;
  }
  .pmp-modal-cancel:hover { background: #f8fafc; border-color: #cbd5e1; }
  .pmp-modal-confirm {
    flex: 1;
    padding: 11px;
    border-radius: 12px;
    border: none;
    font-size: 13px;
    font-weight: 700;
    color: white;
    cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    transition: all 0.15s;
  }
  .pmp-modal-confirm.to-vis { background: #10b981; }
  .pmp-modal-confirm.to-vis:hover { background: #059669; }
  .pmp-modal-confirm.to-rx  { background: #f43f5e; }
  .pmp-modal-confirm.to-rx:hover  { background: #e11d48; }

  @media (max-width: 600px) {
    .pmp-shell { padding: 24px 16px 60px; gap: 22px; }
    .pmp-stats { gap: 8px; }
    .pmp-stat  { padding: 16px 12px; }
    .pmp-stat-num { font-size: 26px; }
    .pmp-toolbar { flex-direction: column; align-items: stretch; }
  }
`;

// ─── Visibility Badge ─────────────────────────────────────────────────────────
function VisibilityBadge({ visibility }) {
  return visibility === "pharmacist_only"
    ? <span className="pmp-badge rx">🔒 Pharmacist Only</span>
    : <span className="pmp-badge vis">🌐 Customer Visible</span>;
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ product, onConfirm, onCancel }) {
  const toCustomer = product.visibility !== "customer";
  return (
    <div className="pmp-overlay">
      <div className="pmp-modal">
        <p className="pmp-modal-title">Change Visibility</p>
        <p className="pmp-modal-product">
          Product: <strong>{product.name}</strong>
        </p>
        <div className={`pmp-modal-msg ${toCustomer ? "to-vis" : "to-rx"}`}>
          {toCustomer
            ? "🌐 This will make the product visible to all customers on the store page."
            : "🔒 This will hide the product from customers. Only pharmacists will see it."}
        </div>
        <div className="pmp-modal-actions">
          <button className="pmp-modal-cancel" onClick={onCancel}>Cancel</button>
          <button
            className={`pmp-modal-confirm ${toCustomer ? "to-vis" : "to-rx"}`}
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, onToggle, toggling }) {
  const isRx   = product.visibility === "pharmacist_only";
  const isBusy = toggling === product.id;

  return (
    <div className={`pmp-card ${isRx ? "rx-card" : ""}`}>
      {isRx && (
        <div className="pmp-card-strip">
          <span className="pmp-card-strip-text">🔒 Hidden from customers</span>
        </div>
      )}
      <div className="pmp-card-body">
        <div className="pmp-card-img">
          {product.imageUrl
            ? <img src={product.imageUrl} alt={product.name} />
            : <span className="pmp-card-img-fallback">💊</span>}
        </div>
        <div className="pmp-card-info">
          <div className="pmp-card-top">
            <p className="pmp-card-name">{product.name}</p>
            <VisibilityBadge visibility={product.visibility} />
          </div>
          <p className="pmp-card-meta">
            <span>{product.category}</span>
            <span className="pmp-dot" />
            <span>{product.stockId}</span>
          </p>
          <p className="pmp-card-price">Rs. {Number(product.price).toFixed(2)}</p>
        </div>
      </div>
      <div className="pmp-card-footer">
        <span className="pmp-card-tag">
          {product.tags?.includes("newArrival") ? "🆕 New Arrival" : ""}
        </span>
        <button
          onClick={() => onToggle(product)}
          disabled={isBusy}
          className={`pmp-toggle-btn ${isBusy ? "busy" : isRx ? "to-vis" : "to-rx"}`}
        >
          {isBusy
            ? "Updating…"
            : isRx
              ? "🌐 Show to Customers"
              : "🔒 Make Pharmacist Only"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PharmacistProductsPage() {
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("all");
  const [search,     setSearch]     = useState("");
  const [toggling,   setToggling]   = useState(null);
  const [confirmFor, setConfirmFor] = useState(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res  = await fetch(PHARMACIST_API);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmToggle = async () => {
    const product = confirmFor;
    setConfirmFor(null);
    setToggling(product.id);
    const newVisibility = product.visibility === "customer" ? "pharmacist_only" : "customer";
    try {
      await fetch(`${PHARMACIST_API}/${product.id}/visibility`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ visibility: newVisibility }),
      });
      setProducts((prev) =>
        prev.map((p) => p.id === product.id ? { ...p, visibility: newVisibility } : p)
      );
    } catch (err) {
      alert("Failed to update visibility: " + err.message);
    } finally {
      setToggling(null);
    }
  };

  const countAll = products.length;
  const countVis = products.filter((p) => p.visibility === "customer").length;
  const countRx  = products.filter((p) => p.visibility === "pharmacist_only").length;

  const displayed = products.filter((p) => {
    const matchFilter = filter === "all" || p.visibility === filter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.stockId?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const filterTabs = [
    { key: "all",             label: `All (${countAll})`,            cls: "f-all" },
    { key: "customer",        label: `🌐 Customer (${countVis})`,    cls: "f-vis" },
    { key: "pharmacist_only", label: `🔒 Rx Only (${countRx})`,      cls: "f-rx"  },
  ];

  return (
    <div className="pmp-root">
      <style>{styles}</style>

      {confirmFor && (
        <ConfirmDialog
          product={confirmFor}
          onConfirm={handleConfirmToggle}
          onCancel={() => setConfirmFor(null)}
        />
      )}

      <div className="pmp-shell">

        {/* Header */}
        <div className="pmp-header">
          <div>
            <h1 className="pmp-title">Product <span>Management</span></h1>
            <p className="pmp-subtitle">Control customer vs pharmacist-only visibility across your store</p>
          </div>
          <button className="pmp-refresh-btn" onClick={fetchProducts}>
            ↻ Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="pmp-stats">
          <div className="pmp-stat total">
            <div className="pmp-stat-num">{countAll}</div>
            <div className="pmp-stat-label">Total Products</div>
            <span className="pmp-stat-icon">📦</span>
          </div>
          <div className="pmp-stat vis">
            <div className="pmp-stat-num">{countVis}</div>
            <div className="pmp-stat-label">Customer Visible</div>
            <span className="pmp-stat-icon">🌐</span>
          </div>
          <div className="pmp-stat rx">
            <div className="pmp-stat-num">{countRx}</div>
            <div className="pmp-stat-label">Pharmacist Only</div>
            <span className="pmp-stat-icon">🔒</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="pmp-toolbar">
          <div className="pmp-search-wrap">
            <span className="pmp-search-icon">🔍</span>
            <input
              className="pmp-search"
              type="text"
              placeholder="Search by name, category or product code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="pmp-filters">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`pmp-filter-btn ${filter === tab.key ? tab.cls : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div>
          <p className="pmp-section-label">
            {displayed.length} product{displayed.length !== 1 ? "s" : ""} shown
          </p>

          {loading ? (
            <div className="pmp-list" style={{ marginTop: 16 }}>
              {[1, 2, 3, 4].map((i) => <div key={i} className="pmp-skeleton" />)}
            </div>
          ) : displayed.length === 0 ? (
            <div className="pmp-empty">
              <div className="pmp-empty-icon">🔍</div>
              <p className="pmp-empty-title">No products found</p>
              <p className="pmp-empty-sub">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="pmp-list" style={{ marginTop: 16 }}>
              {displayed.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  toggling={toggling}
                  onToggle={(p) => setConfirmFor(p)}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}