import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, where, Timestamp, getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getAuth } from 'firebase/auth';

// Sub-components for each UI section
import ProductCatalogHeader from '../../components/supplier/ProductCatalogHeader';
import SearchAndAdd         from '../../components/supplier/SearchAndAdd';
import TabBar               from '../../components/supplier/TabBar';
import ProductTable         from '../../components/supplier/ProductTable';
import PendingTable         from '../../components/supplier/PendingTable';
import ProductModal         from '../../components/supplier/ProductModal';

// Base URL for all backend API calls (set in .env as VITE_API_URL)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Gets the current user's Firebase ID token (refreshes if expired)
const getAuthToken = async () => {
  const auth = getAuth();
  if (!auth.currentUser) throw new Error('Not authenticated');
  return auth.currentUser.getIdToken(true);
};

// Builds Authorization headers needed by the NestJS backend guard
const authHeaders = async () => {
  const token = await getAuthToken();
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

const ProductCatalog = () => {
  // Approved products from Firestore
  const [products, setProducts]               = useState([]);
  // Pending (not yet approved) products
  const [pendingProducts, setPendingProducts] = useState([]);
  // Which tab is active: 'approved' or 'pending'
  const [activeTab, setActiveTab]             = useState('approved');
  const [loading, setLoading]                 = useState(true);
  // Controls add/edit modal visibility
  const [showModal, setShowModal]             = useState(false);
  // Holds the product being edited (null = adding new)
  const [editingProduct, setEditingProduct]   = useState(null);
  const [searchTerm, setSearchTerm]           = useState('');
  const [currentUser, setCurrentUser]         = useState(null);

  // Shared form state for both add and edit flows
  const [formData, setFormData] = useState({
    productName: '', category: '',
    wholesalePrice: '', stock: '', minStock: '',
    description: '', manufacturer: '',
    expireDate: '',
  });

  // Listen for auth state changes; fetch supplier profile when logged in
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchUserDetails(user.uid);
      else { setCurrentUser(null); setLoading(false); }
    });
    return () => unsubscribe();
  }, []);

  // Load supplier details from Firestore to get their display name
  const fetchUserDetails = async (userId) => {
    try {
      const supplierDoc = await getDoc(doc(db, 'suppliers', userId));
      if (supplierDoc.exists()) {
        const d = supplierDoc.data();
        setCurrentUser({ id: userId, name: d.name || 'Supplier', email: d.email });
      } else {
        // Fallback if supplier document doesn't exist
        const auth = getAuth();
        setCurrentUser({ id: userId, name: 'Supplier', email: auth.currentUser?.email });
      }
    } catch {
      const auth = getAuth();
      setCurrentUser({ id: userId, name: 'Supplier', email: auth.currentUser?.email });
    }
  };

  // Fetch approved products belonging to the current supplier
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

  // Trigger approved products fetch when user is ready
  useEffect(() => {
    if (currentUser) fetchProducts();
  }, [currentUser]);

  // Real-time listener so pending products update instantly without refresh
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

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [currentUser]);

  // Submit a new product to the backend; it goes into pending until admin approves
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

      const headers = await authHeaders(); // Bearer token for backend auth

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
            // Convert date string to Firestore Timestamp, or null if empty
            expireDate: formData.expireDate
              ? Timestamp.fromDate(new Date(formData.expireDate))
              : null,
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
      setActiveTab('pending'); // Switch to pending tab so supplier can see their submission
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to submit product: ' + error.message);
    }
  };

  // Update an already-approved product in both supplier and admin collections
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
        // Auto-set availability based on remaining stock
        availability: remainingStock > 0 ? 'in stock' : 'out of stock',
        updatedAt:    Timestamp.now(),
      };

      // Update supplier's product document
      await updateDoc(doc(db, 'products', editingProduct.id), updatedData);

      // Also sync changes to the admin's copy of the product
      const adminSnap = await getDocs(
        query(collection(db, 'adminProducts'), where('productId', '==', editingProduct.id)),
      );
      if (!adminSnap.empty) {
        await updateDoc(doc(db, 'adminProducts', adminSnap.docs[0].id), {
          ...updatedData,
          retailPrice: parseFloat(formData.wholesalePrice) * 1.2, // Admin sells at 20% markup
        });
      }

      alert('Product updated successfully in both inventories!');
      setEditingProduct(null);
      setShowModal(false);
      resetForm();
      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product: ' + error.message);
    }
  };

  // Delete a product from both supplier and admin collections
  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(
      `Are you sure you want to delete "${productName}"?\n\nThis will also remove it from admin inventory.`,
    )) return;

    try {
      await deleteDoc(doc(db, 'products', productId));

      // Remove the matching admin copy as well
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

  // Populate form with existing product data and open the edit modal
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
      // Handle both Firestore Timestamp and raw seconds formats
      expireDate: product.expireDate
        ? (typeof product.expireDate.toDate === 'function'
            ? product.expireDate.toDate().toISOString().split('T')[0]
            : new Date(product.expireDate._seconds * 1000).toISOString().split('T')[0])
        : '',
    });
    setShowModal(true);
  };

  // Clear form and editing state
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

  // Filter approved products by name, code, or category
  const filteredProducts = products.filter((p) =>
    p.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.productCode?.toLowerCase().includes(searchTerm.toLowerCase())  ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Filter pending products by name or category
  const filteredPending = pendingProducts.filter((p) =>
    p.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Badge count: only products still awaiting review
  const pendingCount = pendingProducts.filter((p) => p.status === 'pending').length;

  // Safely format Firestore Timestamp, raw seconds object, or date string
  const formatDate = (val) => {
    if (!val) return '—';
    if (typeof val.toDate === 'function') return val.toDate().toLocaleDateString();
    if (val._seconds) return new Date(val._seconds * 1000).toLocaleDateString();
    const d = new Date(val);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  };

  return (
    <div className="p-6 bg-slate-100 min-h-screen">
      {/* Page title and supplier info */}
      <ProductCatalogHeader currentUser={currentUser} />

      {/* Search bar and "Add Product" button */}
      <SearchAndAdd
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onAddClick={() => { resetForm(); setShowModal(true); }}
      />

      {/* Approved / Pending tab switcher with counts */}
      <TabBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        productsCount={products.length}
        pendingCount={pendingCount}
      />

      {/* Approved products list */}
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

      {/* Pending submissions list */}
      {activeTab === 'pending' && (
        <PendingTable
          loading={loading}
          filteredPending={filteredPending}
          formatDate={formatDate}
        />
      )}

      {/* Add / Edit product modal */}
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