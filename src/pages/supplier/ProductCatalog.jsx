// src/pages/ProductCatalog.jsx
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  orderBy,
  where,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getAuth } from 'firebase/auth';
import './ProductCatalog.css';

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  const [formData, setFormData] = useState({
    productName: '',
    productCode: '',
    category: '',
    wholesalePrice: '',
    stock: '',
    minStock: '',
    description: '',
    manufacturer: ''
  });

  const categories = ['Medicine', 'Baby Item', 'Skincare', 'Medical Equipment', 'Supplements'];

  // Get current user info
  useEffect(() => {
    const auth = getAuth();
    
    // Wait for auth state to be ready
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchUserDetails(user.uid);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
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
          email: userDoc.data().email
        });
      } else {
        // Fallback if user doc doesn't exist
        const auth = getAuth();
        setCurrentUser({
          id: userId,
          name: auth.currentUser?.email || 'Supplier',
          email: auth.currentUser?.email
        });
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      // Fallback
      const auth = getAuth();
      setCurrentUser({
        id: userId,
        name: auth.currentUser?.email || 'Supplier',
        email: auth.currentUser?.email
      });
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const userId = auth.currentUser?.uid;

      if (!userId) {
        alert('Please login to view products');
        setLoading(false);
        return;
      }

      // Fetch only products belonging to this supplier
      const productsQuery = query(
        collection(db, 'products'),
        where('supplierId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(productsQuery);
      const productsData = [];
      
      snapshot.forEach((doc) => {
        productsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setProducts(productsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to load products: ' + error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchProducts();
    }
  }, [currentUser]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    
    try {
      if (!formData.productName || !formData.category || !formData.wholesalePrice) {
        alert('Please fill in all required fields');
        return;
      }

      // Get current user from Firebase Auth
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        alert('Please login to add products');
        return;
      }

      // Use currentUser state if available, otherwise use auth.currentUser
      const userId = currentUser?.id || user.uid;
      const userName = currentUser?.name || user.email || 'Supplier';

      const newProduct = {
        productName: formData.productName,
        productCode: formData.productCode || 'AUTO-' + Date.now(),
        category: formData.category,
        wholesalePrice: parseFloat(formData.wholesalePrice),
        stock: parseInt(formData.stock) || 0,
        minStock: parseInt(formData.minStock) || 0,
        description: formData.description,
        manufacturer: formData.manufacturer,
        availability: parseInt(formData.stock) > parseInt(formData.minStock) ? 'in stock' : 'low stock',
        supplierId: userId,
        supplierName: userName,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Add to supplier's products collection
      const productRef = await addDoc(collection(db, 'products'), newProduct);
      
      // Also add to admin's consolidated inventory (adminProducts)
      await addDoc(collection(db, 'adminProducts'), {
        productId: productRef.id,
        supplierId: userId,
        supplierName: userName,
        productName: formData.productName,
        productCode: formData.productCode || 'AUTO-' + Date.now(),
        category: formData.category,
        wholesalePrice: parseFloat(formData.wholesalePrice),
        retailPrice: parseFloat(formData.wholesalePrice) * 1.2, // 20% markup for retail
        stock: parseInt(formData.stock) || 0,
        minStock: 100, // Admin's reorder threshold
        description: formData.description,
        manufacturer: formData.manufacturer,
        availability: parseInt(formData.stock) >= 100 ? 'in stock' : 'low stock',
        lastRestocked: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      alert('Product added successfully and synced to admin inventory!');
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product: ' + error.message);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    
    try {
      const productRef = doc(db, 'products', editingProduct.id);
      
      const updatedData = {
        productName: formData.productName,
        productCode: formData.productCode,
        category: formData.category,
        wholesalePrice: parseFloat(formData.wholesalePrice),
        stock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock),
        description: formData.description,
        manufacturer: formData.manufacturer,
        availability: parseInt(formData.stock) > parseInt(formData.minStock) ? 'in stock' : 'low stock',
        updatedAt: Timestamp.now()
      };

      await updateDoc(productRef, updatedData);

      // Also update in adminProducts collection
      const adminProductsQuery = query(
        collection(db, 'adminProducts'),
        where('productId', '==', editingProduct.id)
      );
      const adminProductsSnap = await getDocs(adminProductsQuery);

      if (!adminProductsSnap.empty) {
        const adminProductDoc = adminProductsSnap.docs[0];
        await updateDoc(doc(db, 'adminProducts', adminProductDoc.id), {
          productName: formData.productName,
          productCode: formData.productCode,
          category: formData.category,
          wholesalePrice: parseFloat(formData.wholesalePrice),
          retailPrice: parseFloat(formData.wholesalePrice) * 1.2,
          stock: parseInt(formData.stock),
          description: formData.description,
          manufacturer: formData.manufacturer,
          availability: parseInt(formData.stock) >= 100 ? 'in stock' : 'low stock',
          updatedAt: Timestamp.now()
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
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${productName}"?\n\nThis will also remove it from admin inventory. This action cannot be undone.`
    );
    
    if (confirmDelete) {
      try {
        // Delete from supplier's products
        await deleteDoc(doc(db, 'products', productId));

        // Delete from adminProducts
        const adminProductsQuery = query(
          collection(db, 'adminProducts'),
          where('productId', '==', productId)
        );
        const adminProductsSnap = await getDocs(adminProductsQuery);

        if (!adminProductsSnap.empty) {
          const adminProductDoc = adminProductsSnap.docs[0];
          await deleteDoc(doc(db, 'adminProducts', adminProductDoc.id));
        }

        alert('Product deleted successfully from both inventories!');
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product: ' + error.message);
      }
    }
  };

  const startEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      productName: product.productName,
      productCode: product.productCode,
      category: product.category,
      wholesalePrice: product.wholesalePrice,
      stock: product.stock,
      minStock: product.minStock,
      description: product.description || '',
      manufacturer: product.manufacturer || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      productName: '',
      productCode: '',
      category: '',
      wholesalePrice: '',
      stock: '',
      minStock: '',
      description: '',
      manufacturer: ''
    });
    setEditingProduct(null);
  };

  const filteredProducts = products.filter(product => 
    product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="po-container">
      <div className="po-header">
        <h1>Product Catalog</h1>
        <p>Manage your products supplied to MediCareX</p>
        {currentUser && <p className="supplier-info">Logged in as: {currentUser.name}</p>}
      </div>

      <div className="search-add">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Add New Product
        </button>
      </div>

      <div className="products-table-container">
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="no-products">
            No products found
            <button onClick={() => setShowModal(true)}>Add Your First Product</button>
          </div>
        ) : (
          <table className="products-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Wholesale Price</th>
                <th>Stock</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="product-name">{product.productName}</div>
                    <div className="product-code">{product.productCode}</div>
                  </td>
                  <td>{product.category}</td>
                  <td>Rs.{product.wholesalePrice.toFixed(2)}</td>
                  <td>{product.stock} units</td>
                  <td>
                    <span className={`availability ${product.availability === 'in stock' ? 'in-stock' : 'low-stock'}`}>
                      {product.availability}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => startEditProduct(product)} className="edit-btn">Edit</button>
                    <button onClick={() => handleDeleteProduct(product.id, product.productName)} className="delete-btn">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct}>
              <div className="form-grid">
                <div>
                  <label>Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.productName}
                    onChange={(e) => setFormData({...formData, productName: e.target.value})}
                    placeholder="e.g., Paracetamol 500mg"
                  />
                </div>

                <div>
                  <label>Product Code</label>
                  <input
                    type="text"
                    value={formData.productCode}
                    onChange={(e) => setFormData({...formData, productCode: e.target.value})}
                    placeholder="e.g., P001"
                  />
                </div>

                <div>
                  <label>Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Wholesale Price (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.wholesalePrice}
                    onChange={(e) => setFormData({...formData, wholesalePrice: e.target.value})}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label>Current Stock</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label>Minimum Stock</label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({...formData, minStock: e.target.value})}
                    placeholder="0"
                  />
                </div>

                <div className="full-width">
                  <label>Manufacturer</label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                    placeholder="e.g., ABC Pharmaceuticals"
                  />
                </div>

                <div className="full-width">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="3"
                    placeholder="Product description..."
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit">{editingProduct ? 'Update Product' : 'Add Product'}</button>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;