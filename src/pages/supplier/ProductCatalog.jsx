import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, where, Timestamp, getDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getAuth } from 'firebase/auth';

// ─── BACKEND URL ─────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STATUS_BADGE = {
  pending:  { cls: 'bg-amber-100 text-amber-700',   label: 'Pending Approval' },
  approved: { cls: 'bg-emerald-100 text-emerald-700', label: 'Approved' },
  rejected: { cls: 'bg-red-100 text-red-700',        label: 'Rejected' },
};

const ProductCatalog = () => {
  const [products, setProducts]             = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [activeTab, setActiveTab]           = useState('approved'); // 'approved' | 'pending'
  const [loading, setLoading]               = useState(true);
  const [showModal, setShowModal]           = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm]         = useState('');
  const [currentUser, setCurrentUser]       = useState(null);

  const [formData, setFormData] = useState({
    productName: '', category: '',
    wholesalePrice: '', stock: '', minStock: '',
    description: '', manufacturer: '',
  });

  const categories = ['Medicine', 'Baby Item', 'Skincare', 'Medical Equipment', 'Supplements'];

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchUserDetails(user.uid);
      else { setCurrentUser(null); setLoading(false); }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserDetails = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setCurrentUser({
          id: userId,
          name: userDoc.data().name || userDoc.data().email || 'Supplier',
          email: userDoc.data().email,
        });
      } else {
        const auth = getAuth();
        setCurrentUser({
          id: userId,
          name: auth.currentUser?.email || 'Supplier',
          email: auth.currentUser?.email,
        });
      }
    } catch {
      const auth = getAuth();
      setCurrentUser({
        id: userId,
        name: auth.currentUser?.email || 'Supplier',
        email: auth.currentUser?.email,
      });
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const auth   = getAuth();
      const userId = auth.currentUser?.uid;
      if (!userId) { alert('Please login to view products'); setLoading(false); return; }

      // Fetch approved products (existing collection)
      const snapshot = await getDocs(query(
        collection(db, 'products'),
        where('supplierId', '==', userId),
        orderBy('createdAt', 'desc'),
      ));
      setProducts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Fetch pending/rejected products
      const pendingSnap = await getDocs(query(
        collection(db, 'pendingProducts'),
        where('supplierId', '==', userId),
        orderBy('createdAt', 'desc'),
      ));
      setPendingProducts(pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to load products: ' + error.message);
      setLoading(false);
    }
  };

  useEffect(() => { if (currentUser) fetchProducts(); }, [currentUser]);

  // ── Add product: now submits to backend which saves to pendingProducts ──────
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      if (!formData.productName || !formData.category || !formData.wholesalePrice) {
        alert('Please fill in all required fields');
        return;
      }

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) { alert('Please login to add products'); return; }

      const userId   = currentUser?.id   || user.uid;
      const userName = currentUser?.name || user.email || 'Supplier';

      const response = await fetch(
        `${API_BASE}/supplier/products?supplierId=${userId}&supplierName=${encodeURIComponent(userName)}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName:    formData.productName,
            category:       formData.category,
            wholesalePrice: parseFloat(formData.wholesalePrice),
            stock:          parseInt(formData.stock)    || 0,
            minStock:       parseInt(formData.minStock) || 0,
            description:    formData.description,
            manufacturer:   formData.manufacturer,
          }),
        },
      );

      if (!response.ok) throw new Error('Failed to submit product');

      alert('Product submitted for admin approval.\nYou will be notified once it is reviewed.');
      setShowModal(false);
      resetForm();
      // Switch to pending tab so supplier can see their submission
      setActiveTab('pending');
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to submit product: ' + error.message);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      const suppliedStock  = parseInt(formData.stock);
      const remainingStock = parseInt(formData.minStock);

      const updatedData = {
        productName:    formData.productName,
        category:       formData.category,
        wholesalePrice: parseFloat(formData.wholesalePrice),
        stock:          suppliedStock,
        minStock:       remainingStock,
        description:    formData.description,
        manufacturer:   formData.manufacturer,
        availability:   remainingStock > 0 ? 'in stock' : 'out of stock',
        updatedAt:      Timestamp.now(),
      };

      await updateDoc(doc(db, 'products', editingProduct.id), updatedData);

      const adminSnap = await getDocs(
        query(collection(db, 'adminProducts'), where('productId', '==', editingProduct.id)),
      );
      if (!adminSnap.empty) {
        await updateDoc(doc(db, 'adminProducts', adminSnap.docs[0].id), {
          ...updatedData,
          retailPrice: parseFloat(formData.wholesalePrice) * 1.2,
        });
      }

      alert('Product updated successfully in both inventories!');
      setEditingProduct(null);
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product: ' + error.message);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(
      `Are you sure you want to delete "${productName}"?\n\nThis will also remove it from admin inventory.`,
    )) return;

    try {
      await deleteDoc(doc(db, 'products', productId));
      const adminSnap = await getDocs(
        query(collection(db, 'adminProducts'), where('productId', '==', productId)),
      );
      if (!adminSnap.empty) await deleteDoc(doc(db, 'adminProducts', adminSnap.docs[0].id));
      alert('Product deleted successfully from both inventories!');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product: ' + error.message);
    }
  };

  const startEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      productName:    product.productName,
      category:       product.category,
      wholesalePrice: product.wholesalePrice,
      stock:          product.stock,
      minStock:       product.minStock,
      description:    product.description  || '',
      manufacturer:   product.manufacturer || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      productName: '', category: '', wholesalePrice: '',
      stock: '', minStock: '', description: '', manufacturer: '',
    });
    setEditingProduct(null);
  };

  const filteredProducts = products.filter((p) =>
    p.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.productCode?.toLowerCase().includes(searchTerm.toLowerCase())  ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredPending = pendingProducts.filter((p) =>
    p.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const pendingCount = pendingProducts.filter((p) => p.status === 'pending').length;

  const inputCls =
    'w-full px-4 py-3 border-2 border-slate-300 rounded-lg text-[15px] text-slate-800 bg-white ' +
    'transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 ' +
    'focus:ring-blue-500/10 focus:bg-slate-50 placeholder:text-slate-400';

  const formFields = [
    { label: 'Product Name',                key: 'productName',    type: 'text',   placeholder: 'e.g., Paracetamol 500mg',   required: true,  full: false },
    { label: 'Wholesale Price (Rs.)',        key: 'wholesalePrice', type: 'number', placeholder: '0.00',                      required: true,  full: false, extra: { step: '0.01' } },
    { label: 'Stock Supplied to MediCareX', key: 'stock',          type: 'number', placeholder: '0',                         required: false, full: false },
    { label: 'Remaining Stock (with You)',  key: 'minStock',       type: 'number', placeholder: '0',                         required: false, full: false },
    { label: 'Manufacturer',                key: 'manufacturer',   type: 'text',   placeholder: 'e.g., ABC Pharmaceuticals', required: false, full: true  },
  ];

  return (
    <div className="p-6 bg-slate-100 min-h-screen">

      {/* Page Header */}
      <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-2xl text-white shadow-md">
        <h1 className="text-[28px] font-bold mb-1">Product Catalog</h1>
        <p className="text-blue-100 text-sm">Manage your products supplied to MediCareX</p>
        {currentUser && (
          <span className="inline-block mt-3 bg-white/10 text-amber-100 text-[13px] font-medium px-3 py-1 rounded-full">
            Logged in as: {currentUser.name}
          </span>
        )}
      </div>

      {/* Search + Add */}
      <div className="bg-white p-5 rounded-xl shadow-sm mb-6 flex justify-between items-center gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search by name, code or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[280px] px-4 py-3 border-2 border-slate-200 rounded-lg text-[15px] transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 font-semibold rounded-lg cursor-pointer text-[15px] transition-all duration-200 hover:bg-blue-600 hover:text-white hover:-translate-y-px hover:shadow-md whitespace-nowrap"
        >
          + Add New Product
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-5 py-2.5 rounded-lg text-[14px] font-semibold transition-all duration-200 border-2 ${
            activeTab === 'approved'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
          }`}
        >
          Active Products ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-5 py-2.5 rounded-lg text-[14px] font-semibold transition-all duration-200 border-2 relative ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
          }`}
        >
          Pending Approval
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[11px] font-bold rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* ── ACTIVE PRODUCTS TABLE ─────────────────────────────────────────────── */}
      {activeTab === 'approved' && (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-lg">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center gap-5">
              <p className="text-lg text-slate-500">No approved products yet</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-md"
              >
                Submit Your First Product
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[700px]">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    {['Product Name', 'Category', 'Wholesale Price', 'Stock Supplied', 'Availability', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3.5 text-left text-[13px] font-semibold text-slate-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-900 text-sm mb-0.5">{product.productName}</p>
                        <p className="text-xs text-slate-400 font-mono">{product.productCode}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">{product.category}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                        Rs.{product.wholesalePrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">{product.stock} units</td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          product.availability === 'in stock'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {product.availability}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditProduct(product)}
                            className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.productName)}
                            className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PENDING PRODUCTS TABLE ────────────────────────────────────────────── */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-lg">Loading...</div>
          ) : filteredPending.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-lg text-slate-500">No pending submissions</p>
            </div>
          ) : (
            <>
              {/* Info banner */}
              <div className="m-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <span className="text-amber-500 text-lg leading-none mt-0.5">⏳</span>
                <p className="text-[13px] text-amber-800">
                  Products listed here are awaiting admin review. Once approved, they will appear in the <strong>Active Products</strong> tab and be visible in the admin inventory.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 border-b-2 border-slate-200">
                    <tr>
                      {['Product Name', 'Category', 'Wholesale Price', 'Stock', 'Submitted', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-3.5 text-left text-[13px] font-semibold text-slate-500 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPending.map((product) => {
                      const badge = STATUS_BADGE[product.status] || STATUS_BADGE.pending;
                      return (
                        <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150">
                          <td className="px-4 py-4">
                            <p className="font-medium text-slate-900 text-sm mb-0.5">{product.productName}</p>
                            {product.manufacturer && (
                              <p className="text-xs text-slate-400">{product.manufacturer}</p>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">{product.category}</td>
                          <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                            Rs.{Number(product.wholesalePrice).toFixed(2)}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">{product.stock} units</td>
                          <td className="px-4 py-4 text-xs text-slate-400">
                            {product.createdAt?.toDate
                              ? product.createdAt.toDate().toLocaleDateString()
                              : '—'}
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
                                {badge.label}
                              </span>
                              {product.status === 'rejected' && product.rejectionReason && (
                                <p className="text-[11px] text-red-500 mt-1">{product.rejectionReason}</p>
                              )}
                              {product.status === 'approved' && product.productCode && (
                                <p className="text-[11px] text-emerald-600 mt-1 font-mono">{product.productCode}</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-5"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => { setShowModal(false); resetForm(); }}
        >
          <div
            className="bg-white rounded-2xl p-10 w-full max-w-[800px] max-h-[90vh] overflow-y-auto shadow-2xl"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[28px] font-bold text-slate-900 mb-2 pb-4 border-b-[3px] border-blue-600">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>

            {!editingProduct && (
              <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
                <p className="text-[13px] text-amber-800">
                  This product will be submitted for <strong>admin approval</strong> before it appears in the inventory. A unique product code will be assigned upon approval.
                </p>
              </div>
            )}

            {editingProduct && (
              <div className="mb-6 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                <span className="text-[13px] text-slate-500">Product Code</span>
                <span className="font-mono text-[13px] font-semibold text-slate-700 tracking-wide">
                  {editingProduct.productCode}
                </span>
                <span className="ml-auto text-[11px] text-slate-400 italic">auto-generated · read-only</span>
              </div>
            )}

            <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct}>
              <div className="grid grid-cols-2 gap-x-7 gap-y-8">

                {/* Category */}
                <div className="flex flex-col">
                  <label className="block mb-2.5 font-semibold text-slate-900 text-[15px]">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Dynamic fields */}
                {formFields.map((field) => (
                  <div key={field.key} className={`flex flex-col ${field.full ? 'col-span-2' : ''}`}>
                    <label className="block mb-2.5 font-semibold text-slate-900 text-[15px]">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={field.type}
                      required={field.required}
                      placeholder={field.placeholder}
                      value={formData[field.key]}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      className={inputCls}
                      {...(field.extra || {})}
                    />
                  </div>
                ))}

                {/* Description */}
                <div className="flex flex-col col-span-2">
                  <label className="block mb-2.5 font-semibold text-slate-900 text-[15px]">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Product description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`${inputCls} resize-y min-h-[100px] leading-relaxed`}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 mt-10 pt-7 border-t-2 border-slate-200">
                <button
                  type="submit"
                  className="flex-1 py-4 px-7 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {editingProduct ? 'Update Product' : 'Submit for Approval'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 py-4 px-7 bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-300 hover:border-slate-400 font-semibold text-base rounded-lg cursor-pointer transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn  { from{opacity:0}                            to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>
    </div>
  );
};

export default ProductCatalog;