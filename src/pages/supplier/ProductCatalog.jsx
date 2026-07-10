import React, { useState, useEffect, useCallback } from 'react';
import {
  collection, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, where, Timestamp, getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getAuth } from 'firebase/auth';

import ProductCatalogHeader from '../../components/supplier/ProductCatalogHeader';
import SearchAndAdd         from '../../components/supplier/SearchAndAdd';
import TabBar               from '../../components/supplier/TabBar';
import ProductTable         from '../../components/supplier/ProductTable';
import PendingTable         from '../../components/supplier/PendingTable';
import ProductModal         from '../../components/supplier/ProductModal';

const API_BASE = `${import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL_RAILWAY}/api`;

const getAuthToken = async () => {
  const auth = getAuth();
  if (!auth.currentUser) throw new Error('Not authenticated');
  return auth.currentUser.getIdToken(true);
};

const authHeaders = async () => {
  const token = await getAuthToken();
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

/* ── Toast ────────────────────────────────────────────────────────────── */
const TOAST_ICONS = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>
    </svg>
  ),
};

const TOAST_STYLES = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
};

const TOAST_ICON_STYLES = {
  success: 'text-emerald-500',
  error:   'text-red-500',
  info:    'text-blue-500',
  warning: 'text-amber-500',
};

const ToastContainer = ({ toasts, onDismiss }) => (
  <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg shadow-slate-200/60 min-w-[300px] max-w-[400px] ${TOAST_STYLES[t.type]}`}
        style={{ animation: 'toastIn 0.25s ease-out' }}
      >
        <span className={`shrink-0 mt-0.5 ${TOAST_ICON_STYLES[t.type]}`}>{TOAST_ICONS[t.type]}</span>
        <p className="text-[13.5px] font-medium leading-snug flex-1">{t.message}</p>
        <button
          onClick={() => onDismiss(t.id)}
          className="shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    ))}
  </div>
);

/* ── Confirm Dialog ───────────────────────────────────────────────────── */
const ConfirmDialog = ({ dialog, onConfirm, onCancel }) => {
  if (!dialog) return null;
  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9998] p-5"
      style={{ animation: 'fadeIn 0.15s ease-out' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl shadow-slate-900/15 border border-slate-200 w-full max-w-[400px] overflow-hidden"
        style={{ animation: 'slideUp 0.2s ease-out' }}
      >
        <div className="px-6 pt-6 pb-2 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-slate-900 mb-1">{dialog.title}</h3>
            <p className="text-[13px] text-slate-500 leading-relaxed">{dialog.message}</p>
          </div>
        </div>
        <div className="px-6 py-5 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[13.5px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-[13.5px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all duration-150 hover:shadow-md hover:shadow-red-200"
          >
            {dialog.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ───────────────────────────────────────────────────── */
const ProductCatalog = () => {
  const [products, setProducts]               = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [activeTab, setActiveTab]             = useState('approved');
  const [loading, setLoading]                 = useState(true);
  const [showModal, setShowModal]             = useState(false);
  const [editingProduct, setEditingProduct]   = useState(null);
  const [searchTerm, setSearchTerm]           = useState('');
  const [currentUser, setCurrentUser]         = useState(null);

  const [toasts, setToasts]       = useState([]);
  const [dialog, setDialog]       = useState(null);       // { title, message, confirmLabel, onConfirm }

  const [formData, setFormData] = useState({
    productName: '', category: '',
    wholesalePrice: '', stock: '', minStock: '',
    description: '', manufacturer: '',
    expireDate: '',
  });

  /* toast helpers */
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* confirm helper — returns a promise */
  const showConfirm = useCallback(({ title, message, confirmLabel }) =>
    new Promise((resolve) => {
      setDialog({ title, message, confirmLabel, resolve });
    }), []);

  const handleConfirm = () => {
    dialog?.resolve(true);
    setDialog(null);
  };

  const handleCancel = () => {
    dialog?.resolve(false);
    setDialog(null);
  };

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
      const supplierDoc = await getDoc(doc(db, 'suppliers', userId));
      if (supplierDoc.exists()) {
        const d = supplierDoc.data();
        setCurrentUser({ id: userId, name: d.name || 'Supplier', email: d.email });
      } else {
        const auth = getAuth();
        setCurrentUser({ id: userId, name: 'Supplier', email: auth.currentUser?.email });
      }
    } catch {
      const auth = getAuth();
      setCurrentUser({ id: userId, name: 'Supplier', email: auth.currentUser?.email });
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      if (!currentUser?.id) { setLoading(false); return; }

      const snapshot = await getDocs(query(
        collection(db, 'products'),
        where('supplierId', '==', currentUser.id),
        orderBy('createdAt', 'desc'),
      ));
      setProducts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error fetching approved products:', error);
      showToast('Failed to load products: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchProducts();
  }, [currentUser]);

  // Real-time listener — fetches ALL fields from pendingProducts including expireDate
  useEffect(() => {
    if (!currentUser?.id) return;

    const q = query(
      collection(db, 'pendingProducts'),
      where('supplierId', '==', currentUser.id),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => setPendingProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => console.error('Pending products listener error:', error),
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      if (!formData.productName || !formData.category || !formData.wholesalePrice) {
        showToast('Please fill in all required fields', 'warning');
        return;
      }
      if (!currentUser?.id) {
        showToast('Please login to add products', 'warning');
        return;
      }

      const userId   = currentUser.id;
      const userName = currentUser.name;

      const headers = await authHeaders();

      const response = await fetch(
        `${API_BASE}/supplier/products?supplierId=${userId}&supplierName=${encodeURIComponent(userName)}`,
        {
          method:  'POST',
          headers,
          body: JSON.stringify({
            productName:    formData.productName,
            category:       formData.category,
            wholesalePrice: parseFloat(formData.wholesalePrice),
            stock:          parseInt(formData.stock)    || 0,
            minStock:       parseInt(formData.minStock) || 0,
            description:    formData.description,
            manufacturer:   formData.manufacturer,
            expireDate:     formData.expireDate ? new Date(formData.expireDate).toISOString() : null,
          }),
        },
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.message || `HTTP ${response.status}`);
      }

      showToast('Product submitted for admin approval. You will be notified once it is reviewed.', 'success');
      setShowModal(false);
      resetForm();
      setActiveTab('pending');
    } catch (error) {
      console.error('Error adding product:', error);
      showToast('Failed to submit product: ' + error.message, 'error');
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
        expireDate: formData.expireDate
          ? Timestamp.fromDate(new Date(formData.expireDate))
          : null,
        availability: remainingStock > 0 ? 'in stock' : 'out of stock',
        updatedAt:    Timestamp.now(),
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

      showToast('Product updated successfully in both inventories!', 'success');
      setEditingProduct(null);
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      showToast('Failed to update product: ' + error.message, 'error');
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    const confirmed = await showConfirm({
      title:        'Delete Product',
      message:      `Are you sure you want to delete "${productName}"? This will also remove it from admin inventory.`,
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'products', productId));

      const adminSnap = await getDocs(
        query(collection(db, 'adminProducts'), where('productId', '==', productId)),
      );
      if (!adminSnap.empty) await deleteDoc(doc(db, 'adminProducts', adminSnap.docs[0].id));

      showToast('Product deleted successfully from both inventories!', 'success');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast('Failed to delete product: ' + error.message, 'error');
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
      expireDate: product.expireDate
        ? (typeof product.expireDate.toDate === 'function'
            ? product.expireDate.toDate().toISOString().split('T')[0]
            : new Date(product.expireDate._seconds * 1000).toISOString().split('T')[0])
        : '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      productName: '', category: '', wholesalePrice: '',
      stock: '', minStock: '', description: '', manufacturer: '',
      expireDate: '',
    });
    setEditingProduct(null);
  };

  const handleModalClose = () => {
    setShowModal(false);
    resetForm();
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

  const formatDate = (val) => {
    if (!val) return '—';
    if (typeof val.toDate === 'function') return val.toDate().toLocaleDateString();
    if (val._seconds) return new Date(val._seconds * 1000).toLocaleDateString();
    const d = new Date(val);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  };

  return (
    <div className="p-6 bg-slate-100 min-h-screen">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog dialog={dialog} onConfirm={handleConfirm} onCancel={handleCancel} />

      <ProductCatalogHeader currentUser={currentUser} />

      <SearchAndAdd
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onAddClick={() => { resetForm(); setShowModal(true); }}
      />

      <TabBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        productsCount={products.length}
        pendingCount={pendingCount}
      />

      {activeTab === 'approved' && (
        <ProductTable
          loading={loading}
          filteredProducts={filteredProducts}
          onAddClick={() => setShowModal(true)}
          onEdit={startEditProduct}
          onDelete={handleDeleteProduct}
          formatDate={formatDate}
        />
      )}

      {activeTab === 'pending' && (
        <PendingTable
          loading={loading}
          filteredPending={filteredPending}
          formatDate={formatDate}
        />
      )}

      <ProductModal
        showModal={showModal}
        editingProduct={editingProduct}
        formData={formData}
        setFormData={setFormData}
        onSubmitAdd={handleAddProduct}
        onSubmitUpdate={handleUpdateProduct}
        onClose={handleModalClose}
      />

      <style>{`
        @keyframes fadeIn  { from{opacity:0}                            to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes toastIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  );
};

export default ProductCatalog;