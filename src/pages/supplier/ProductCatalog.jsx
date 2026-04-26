import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, where, Timestamp, getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getAuth } from 'firebase/auth';

// ─── Sub-components ──────────────────────────────────────────────────────────
import ProductCatalogHeader from '../../components/supplier/ProductCatalogHeader';
import SearchAndAdd         from '../../components/supplier/SearchAndAdd';
import TabBar               from '../../components/supplier/TabBar';
import ProductTable         from '../../components/supplier/ProductTable';
import PendingTable         from '../../components/supplier/PendingTable';
import ProductModal         from '../../components/supplier/ProductModal';

// ─── BACKEND URL — fixed to use /api prefix ──────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * ProductCatalog page — the primary product management screen for suppliers.
 *
 * Responsibilities:
 *   - Listens to Firebase Auth to identify the logged-in supplier.
 *   - Fetches approved products from the `products` collection (one-time query).
 *   - Subscribes in real-time to the `pendingProducts` collection so the pending
 *     count badge updates without a page refresh.
 *   - Provides add, edit, and delete operations that keep the supplier's `products`
 *     collection and the shared `adminProducts` collection in sync.
 *   - Delegates all rendering to focused sub-components; this file owns state and
 *     data logic only.
 */
const ProductCatalog = () => {
  const [products, setProducts]               = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [activeTab, setActiveTab]             = useState('approved');
  const [loading, setLoading]                 = useState(true);
  const [showModal, setShowModal]             = useState(false);
  const [editingProduct, setEditingProduct]   = useState(null); // null = add mode, object = edit mode
  const [searchTerm, setSearchTerm]           = useState('');
  const [currentUser, setCurrentUser]         = useState(null);

  // Controlled form state shared between the add and edit modal flows
  const [formData, setFormData] = useState({
    productName: '', category: '',
    wholesalePrice: '', stock: '', minStock: '',
    description: '', manufacturer: '',
    expireDate: '',
  });

  // ── Auth listener ──────────────────────────────────────────────────────────
  /**
   * Subscribes to Firebase Auth state changes.
   * When a user signs in, their supplier profile is fetched to get the real
   * company name. When signed out, state is cleared and loading is stopped.
   */
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchUserDetails(user.uid);
      else { setCurrentUser(null); setLoading(false); }
    });
    return () => unsubscribe();
  }, []);

  /**
   * Reads the supplier's document from the `suppliers` collection to retrieve
   * the real company name used when submitting products to the backend.
   * Falls back to a generic "Supplier" label if the document is missing or
   * if the Firestore read fails.
   *
   * @param {string} userId - Firebase Auth UID of the logged-in supplier.
   */
  const fetchUserDetails = async (userId) => {
    try {
      const supplierDoc = await getDoc(doc(db, 'suppliers', userId));
      if (supplierDoc.exists()) {
        const d = supplierDoc.data();
        setCurrentUser({
          id:    userId,
          name:  d.name || 'Supplier',   // real company name e.g. "University"
          email: d.email,
        });
      } else {
        // Fallback if supplier doc not found
        const auth = getAuth();
        setCurrentUser({
          id:    userId,
          name:  'Supplier',
          email: auth.currentUser?.email,
        });
      }
    } catch {
      const auth = getAuth();
      setCurrentUser({
        id:    userId,
        name:  'Supplier',
        email: auth.currentUser?.email,
      });
    }
  };

  // ── Fetch APPROVED products ────────────────────────────────────────────────
  /**
   * Performs a one-time Firestore query to load all approved products belonging
   * to the current supplier, ordered by creation date descending.
   * Called on initial load and after any add, update, or delete operation.
   */
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

  // Trigger the approved products fetch once the supplier identity is resolved
  useEffect(() => {
    if (currentUser) fetchProducts();
  }, [currentUser]);

  // ── Real-time listener for pending submissions ─────────────────────────────
  /**
   * Opens a real-time Firestore listener on `pendingProducts` for the current supplier.
   * Using onSnapshot instead of a one-time getDocs ensures the pending count badge
   * and table stay up to date as admin reviews submissions without requiring a refresh.
   * The listener is cleaned up when the component unmounts or currentUser changes.
   */
  useEffect(() => {
    if (!currentUser?.id) return;

    const q = query(
      collection(db, 'pendingProducts'),
      where('supplierId', '==', currentUser.id),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setPendingProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        console.error('Pending products listener error:', error);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  // ── Add product ────────────────────────────────────────────────────────────
  /**
   * Submits a new product to the backend API, which routes it to `pendingProducts`
   * for admin approval. On success, the modal is closed and the view switches to
   * the pending tab so the supplier can track the submission status.
   *
   * Required fields: productName, category, wholesalePrice.
   *
   * @param {React.FormEvent} e - Form submit event; default is prevented.
   */
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

      // API_BASE already includes /api, so no additional prefix is needed here
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
            // Convert the date string to a Firestore Timestamp; null if not provided
            expireDate:     formData.expireDate
              ? Timestamp.fromDate(new Date(formData.expireDate))
              : null,
          }),
        },
      );

      if (!response.ok) throw new Error('Failed to submit product');

      alert('Product submitted for admin approval.\nYou will be notified once it is reviewed.');
      setShowModal(false);
      resetForm();
      setActiveTab('pending');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to submit product: ' + error.message);
    }
  };

  // ── Update approved product ────────────────────────────────────────────────
  /**
   * Updates an existing approved product in both the supplier's `products` collection
   * and the shared `adminProducts` collection to keep inventories in sync.
   * Availability is derived from minStock: zero stock marks the product as "out of stock".
   * The admin's retail price is automatically recalculated as wholesale price × 1.2.
   *
   * @param {React.FormEvent} e - Form submit event; default is prevented.
   */
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
        expireDate:     formData.expireDate
          ? Timestamp.fromDate(new Date(formData.expireDate))
          : null,
        // Derive availability status from remaining stock
        availability:   remainingStock > 0 ? 'in stock' : 'out of stock',
        updatedAt:      Timestamp.now(),
      };

      // Update supplier's own product document
      await updateDoc(doc(db, 'products', editingProduct.id), updatedData);

      // Mirror the changes to the admin inventory, with a 20% retail markup applied
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

  // ── Delete approved product ────────────────────────────────────────────────
  /**
   * Deletes a product from both the supplier's `products` collection and the
   * shared `adminProducts` collection after the supplier confirms the action.
   * A refresh is triggered afterwards to reflect the removal in the table.
   *
   * @param {string} productId   - Firestore document ID of the product to delete.
   * @param {string} productName - Human-readable name shown in the confirmation dialog.
   */
  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(
      `Are you sure you want to delete "${productName}"?\n\nThis will also remove it from admin inventory.`,
    )) return;

    try {
      // Remove from supplier inventory
      await deleteDoc(doc(db, 'products', productId));

      // Remove the matching admin inventory entry if it exists
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

  /**
   * Populates the form with the selected product's current values and opens the
   * modal in edit mode. Firestore Timestamps are converted to "YYYY-MM-DD" strings
   * compatible with the HTML date input, handling both Timestamp instances and
   * raw second-based objects returned by some Firestore SDK versions.
   *
   * @param {Object} product - The product document to edit.
   */
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
      // Convert Firestore Timestamp → "YYYY-MM-DD" for the date input
      expireDate: product.expireDate
        ? (typeof product.expireDate.toDate === 'function'
            ? product.expireDate.toDate().toISOString().split('T')[0]
            : new Date(product.expireDate._seconds * 1000).toISOString().split('T')[0])
        : '',
    });
    setShowModal(true);
  };

  /**
   * Clears all form fields and exits edit mode.
   * Called after a successful submit or when the modal is dismissed.
   */
  const resetForm = () => {
    setFormData({
      productName: '', category: '', wholesalePrice: '',
      stock: '', minStock: '', description: '', manufacturer: '',
      expireDate: '',
    });
    setEditingProduct(null);
  };

  /**
   * Closes the modal and resets the form to its blank state.
   * Ensures no stale edit data persists if the supplier opens the add form next.
   */
  const handleModalClose = () => {
    setShowModal(false);
    resetForm();
  };

  // ── Filtered views ─────────────────────────────────────────────────────────
  /**
   * Filters approved products by the current search term, matching against
   * product name, product code, and category (all case-insensitive).
   */
  const filteredProducts = products.filter((p) =>
    p.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.productCode?.toLowerCase().includes(searchTerm.toLowerCase())  ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  /**
   * Filters pending products by the current search term, matching against
   * product name and category.
   */
  const filteredPending = pendingProducts.filter((p) =>
    p.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Count only submissions that are still awaiting admin review for the tab badge
  const pendingCount = pendingProducts.filter((p) => p.status === 'pending').length;

  // ── Helper: format Firestore Timestamp or raw value to readable date ───────
  /**
   * Converts a variety of date representations to a locale-formatted string.
   * Handles Firestore Timestamp objects, raw `_seconds` objects from the REST API,
   * ISO strings, and plain Date-constructable values. Returns "—" for null/invalid input.
   *
   * @param {Timestamp|Object|string|number|null} val - The date value to format.
   * @returns {string} A locale date string or "—" if the value is absent or invalid.
   */
  const formatDate = (val) => {
    if (!val) return '—';
    if (typeof val.toDate === 'function') return val.toDate().toLocaleDateString();
    if (val._seconds) return new Date(val._seconds * 1000).toLocaleDateString();
    const d = new Date(val);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  };

  return (
    <div className="p-6 bg-slate-100 min-h-screen">

      {/* Page Header — displays the supplier's company name and page title */}
      <ProductCatalogHeader currentUser={currentUser} />

      {/* Search bar and "Add Product" button */}
      <SearchAndAdd
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onAddClick={() => { resetForm(); setShowModal(true); }}
      />

      {/* Tab switcher between approved products and pending submissions */}
      <TabBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        productsCount={products.length}
        pendingCount={pendingCount}
      />

      {/* ── ACTIVE PRODUCTS TABLE ─────────────────────────────────────────────── */}
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

      {/* ── PENDING PRODUCTS TABLE ────────────────────────────────────────────── */}
      {activeTab === 'pending' && (
        <PendingTable
          loading={loading}
          filteredPending={filteredPending}
          formatDate={formatDate}
        />
      )}

      {/* ── ADD / EDIT MODAL ──────────────────────────────────────────────────── */}
      {/* Modal is rendered in add mode when editingProduct is null, edit mode otherwise */}
      <ProductModal
        showModal={showModal}
        editingProduct={editingProduct}
        formData={formData}
        setFormData={setFormData}
        onSubmitAdd={handleAddProduct}
        onSubmitUpdate={handleUpdateProduct}
        onClose={handleModalClose}
      />

      {/* Keyframe animations used by modal and table transition styles */}
      <style>{`
        @keyframes fadeIn  { from{opacity:0}                            to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>
    </div>
  );
};

export default ProductCatalog;