import React, { useState, useEffect } from 'react';
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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

const ProductCatalog = () => {
  const [products, setProducts]               = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [activeTab, setActiveTab]             = useState('approved');
  const [loading, setLoading]                 = useState(true);
  const [showModal, setShowModal]             = useState(false);
  const [editingProduct, setEditingProduct]   = useState(null);
  const [searchTerm, setSearchTerm]           = useState('');
  const [currentUser, setCurrentUser]         = useState(null);

  const [formData, setFormData] = useState({
    productName: '', category: '',
    wholesalePrice: '', stock: '', minStock: '',
    description: '', manufacturer: '',
    expireDate: '',
  });

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
      alert('Failed to load products: ' + error.message);
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
        alert('Please fill in all required fields');
        return;
      }
      if (!currentUser?.id) { alert('Please login to add products'); return; }

      const userId   = currentUser.id;
      const userName = currentUser.name;

      const headers = await authHeaders();

      // FIX: Send expireDate as a plain ISO string, NOT as a Timestamp object.
      // Timestamp is a Firestore class — it cannot be JSON-serialized correctly.
      // JSON.stringify(Timestamp) produces {seconds, nanoseconds} which corrupts
      // the value when your backend reads it. Send the raw ISO string instead
      // and let the backend convert it to a Timestamp via admin.firestore.Timestamp.fromDate().
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

      alert('Product submitted for admin approval.\nYou will be notified once it is reviewed.');
      setShowModal(false);
      resetForm();
      setActiveTab('pending');
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
        // FIX: Timestamp.fromDate(new Date(...)) is correct here because
        // handleUpdateProduct writes directly to Firestore via updateDoc,
        // not through a JSON API call, so Timestamp objects are safe to use.
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
      `}</style>
    </div>
  );
};

export default ProductCatalog;