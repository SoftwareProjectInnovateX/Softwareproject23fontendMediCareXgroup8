import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STATUS_BADGE = {
  pending:  { cls: 'bg-amber-100 text-amber-700 border border-amber-300',       label: 'Pending'  },
  approved: { cls: 'bg-emerald-100 text-emerald-700 border border-emerald-300', label: 'Approved' },
  rejected: { cls: 'bg-red-100 text-red-700 border border-red-300',             label: 'Rejected' },
};

function formatDate(val) {
  if (!val) return '—';
  if (val._seconds) return new Date(val._seconds * 1000).toLocaleDateString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function AdminProductApproval() {
  const [products, setProducts]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal]     = useState(null);
  const [rejectReason, setRejectReason]   = useState('');
  const [filter, setFilter]               = useState('pending');
  const [search, setSearch]               = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_BASE}/admin/pending-products`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
      if (!res.ok) console.error('API error:', data);
    } catch (err) {
      console.error('Failed to load products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (product) => {
    if (!window.confirm(`Approve "${product.productName}"?\nA product code will be auto-generated.`)) return;
    try {
      setActionLoading(product.id);

      // 1. Approve on backend
      const res = await fetch(`${API_BASE}/admin/pending-products/${product.id}/approve`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Approval failed');
      const { productCode } = await res.json();

      // 2. Auto-create pharmacist pending product
      await fetch(`${API_BASE}/pharmacist/pending-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName:    product.productName,
          category:       product.category,
          description:    product.description,
          imageUrl:       product.imageUrl || '',
          supplierId:     product.supplierId,
          supplierName:   product.supplierName,
          stockId:        productCode,
          retailPrice:    Number(product.wholesalePrice) * 1.2,
          wholesalePrice: Number(product.wholesalePrice),
          stock:          product.stock,
          minStock:       product.minStock,
          productCode,
          status:         'pending',
        }),
      });

      alert(`Product approved!\nProduct Code: ${productCode}`);
      fetchAll();
    } catch (err) {
      console.error(err);
      alert(`Failed to approve product: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (product) => {
    setRejectModal(product);
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      setActionLoading(rejectModal.id);
      const res = await fetch(`${API_BASE}/admin/pending-products/${rejectModal.id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) throw new Error('Rejection failed');
      alert('Product rejected. Supplier has been notified.');
      setRejectModal(null);
      setRejectReason('');
      fetchAll();
    } catch (err) {
      console.error(err);
      alert('Failed to reject product');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount  = products.filter((p) => p.status === 'pending').length;
  const approvedCount = products.filter((p) => p.status === 'approved').length;
  const rejectedCount = products.filter((p) => p.status === 'rejected').length;

  const filtered = products.filter((p) => {
    const matchFilter = filter === 'all' || p.status === filter;
    const matchSearch =
      p.productName?.toLowerCase().includes(search.toLowerCase()) ||
      p.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const FILTER_TABS = [
    { key: 'pending',  label: 'Pending',  count: pendingCount,    color: 'amber'   },
    { key: 'approved', label: 'Approved', count: approvedCount,   color: 'emerald' },
    { key: 'rejected', label: 'Rejected', count: rejectedCount,   color: 'red'     },
    { key: 'all',      label: 'All',      count: products.length, color: 'slate'   },
  ];

  const tabColor = {
    amber:   'bg-amber-500 text-white border-amber-500',
    emerald: 'bg-emerald-600 text-white border-emerald-600',
    red:     'bg-red-500 text-white border-red-500',
    slate:   'bg-slate-600 text-white border-slate-600',
  };

  return (
    <div className="p-6 bg-slate-100 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Approval</h1>
        <p className="text-sm text-gray-500 mt-1">Review and approve supplier product submissions</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card title="Awaiting Review" value={pendingCount}  />
        <Card title="Approved"        value={approvedCount} />
        <Card title="Rejected"        value={rejectedCount} />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm mb-5 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-2 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 border-2 ${
                filter === tab.key
                  ? tabColor[tab.color]
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                filter === tab.key ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by product, supplier or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[260px] max-w-sm px-4 py-2.5 border-2 border-slate-200 rounded-lg text-[14px] focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 transition-all duration-200"
        />
      </div>

      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-lg">Loading submissions...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg text-slate-400">No products match this filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  {['Product', 'Category', 'Supplier', 'Wholesale Price', 'Stock', 'Submitted', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-left text-[13px] font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const badge       = STATUS_BADGE[product.status] || STATUS_BADGE.pending;
                  const isActioning = actionLoading === product.id;
                  const isPending   = product.status === 'pending';

                  return (
                    <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900 text-sm mb-0.5">{product.productName}</p>
                        {product.manufacturer && <p className="text-xs text-slate-400">{product.manufacturer}</p>}
                        {product.description && (
                          <p className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate">{product.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">{product.category}</td>
                      <td className="px-4 py-4">
                        <span className="inline-block bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-xs font-medium">
                          {product.supplierName || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                        Rs.{Number(product.wholesalePrice).toFixed(2)}
                        <p className="text-xs text-slate-400 font-normal mt-0.5">
                          Retail: Rs.{(Number(product.wholesalePrice) * 1.2).toFixed(2)}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {product.stock} units
                        <p className="text-xs text-slate-400 mt-0.5">Min: {product.minStock} units</p>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-400">{formatDate(product.createdAt)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {product.status === 'approved' && product.productCode && (
                          <p className="text-[11px] text-emerald-600 font-mono mt-1">{product.productCode}</p>
                        )}
                        {product.status === 'rejected' && product.rejectionReason && (
                          <p className="text-[11px] text-red-500 mt-1 max-w-[120px]">{product.rejectionReason}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {isPending ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(product)}
                              disabled={isActioning}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
                            >
                              {isActioning ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => openRejectModal(product)}
                              disabled={isActioning}
                              className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300 italic text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-5"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setRejectModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-[480px] shadow-2xl"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[22px] font-bold text-slate-900 mb-1 pb-4 border-b-[3px] border-red-500">
              Reject Product
            </h3>
            <div className="my-5 px-4 py-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-semibold text-slate-800">{rejectModal.productName}</p>
              <p className="text-xs text-slate-400 mt-0.5">Submitted by {rejectModal.supplierName}</p>
            </div>
            <div className="mb-6">
              <label className="block mb-2 font-semibold text-slate-800 text-[14px]">
                Reason for rejection <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g., Missing required certifications, incorrect pricing..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg text-[14px] resize-none focus:outline-none focus:border-red-400 focus:ring-4 focus:ring-red-400/10 transition-all duration-200"
              />
              <p className="text-[12px] text-slate-400 mt-1">This will be sent to the supplier as a notification.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectModal.id}
                className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                {actionLoading === rejectModal.id ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg border-none cursor-pointer transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 }                              to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}