import "./Products.css";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  addDoc,
  doc,
  Timestamp,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../services/firebase";

const CATEGORIES = [
  "All",
  "Medicine",
  "Baby Items",
  "Skin Care",
  "Medical Equipment",
];

const normalize = (v = "") => v.toLowerCase().replace(/\s+/g, "");

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [pendingOrders, setPendingOrders] = useState({});

  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQty, setOrderQty] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
    subscribeToOrders();
  }, []);

  const loadProducts = async () => {
    const snap = await getDocs(collection(db, "adminProducts"));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setProducts(list);
    autoLowStockCheck(list);
  };

  // 📡 Real-time listener for purchase orders
  const subscribeToOrders = () => {
    const ordersQuery = query(
      collection(db, "purchaseOrders"),
      where("status", "in", ["PENDING", "ACCEPTED", "REJECTED"])
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersByProduct = {};
      
      snapshot.docs.forEach(docSnap => {
        const order = { id: docSnap.id, ...docSnap.data() };
        const productId = order.adminProductId;
        
        // Keep only the most recent order per product
        if (!ordersByProduct[productId] || 
            order.createdAt?.toMillis() > ordersByProduct[productId].createdAt?.toMillis()) {
          ordersByProduct[productId] = order;
        }
      });

      setPendingOrders(ordersByProduct);
    });

    return unsubscribe;
  };

  // 🔔 LOW STOCK CHECK
  const autoLowStockCheck = async (items) => {
    for (const p of items) {
      if (p.stock <= 100 && p.availability !== "LOW STOCK") {
        await updateDoc(doc(db, "adminProducts", p.id), {
          availability: "LOW STOCK",
          updatedAt: Timestamp.now(),
        });

        if (p.supplierId) {
          await addDoc(collection(db, "notifications"), {
            type: "LOW_STOCK",
            recipientId: p.supplierId,
            recipientType: "supplier",
            supplierId: p.supplierId,
            productId: p.productId,
            adminProductId: p.id,
            productName: p.productName,
            currentStock: p.stock,
            message: `⚠️ LOW STOCK ALERT: ${p.productName} is below 100 units (Current: ${p.stock})`,
            read: false,
            createdAt: Timestamp.now(),
          });
          console.log(`✅ Low stock alert sent to supplier ${p.supplierId} for ${p.productName}`);
        }
      }
    }
  };

  const openOrderForm = (product) => {
    if (!product.supplierId) {
      alert("❌ This product has no supplier assigned");
      return;
    }
    setSelectedProduct(product);
    setOrderQty("");
    setShowOrderForm(true);
  };

  // 🛒 PLACE ORDER
  const placeOrder = async () => {
    if (!orderQty || Number(orderQty) <= 0) {
      alert("Enter valid quantity");
      return;
    }

    try {
      setLoading(true);

      const poId = `PO-${Date.now()}`;
      const totalAmount = Number(orderQty) * Number(selectedProduct.wholesalePrice);

      // Create purchase order
      const orderRef = await addDoc(collection(db, "purchaseOrders"), {
        poId: poId,
        product: selectedProduct.productName,
        productId: selectedProduct.productId,
        adminProductId: selectedProduct.id,
        category: selectedProduct.category,
        quantity: Number(orderQty),
        reorderLevel: 100,
        supplierId: selectedProduct.supplierId,
        supplierName: selectedProduct.supplierName || "Unknown Supplier",
        unitPrice: Number(selectedProduct.wholesalePrice),
        amount: totalAmount,
        pharmacy: "MediCareX",
        status: "PENDING",
        orderDate: Timestamp.now(),
        date: new Date().toISOString().split("T")[0],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // 🔔 Send notification to SUPPLIER
      await addDoc(collection(db, "notifications"), {
        type: "ORDER_PLACED",
        recipientId: selectedProduct.supplierId,
        recipientType: "supplier",
        supplierId: selectedProduct.supplierId,
        orderId: orderRef.id,
        poId: poId,
        adminProductId: selectedProduct.id,
        productId: selectedProduct.productId,
        productName: selectedProduct.productName,
        quantity: Number(orderQty),
        totalAmount: totalAmount,
        message: `🛒 New Order Received: ${orderQty} units of ${selectedProduct.productName} (Total: Rs. ${totalAmount.toFixed(2)})`,
        read: false,
        createdAt: Timestamp.now(),
      });

      console.log(`✅ Order notification sent to supplier ${selectedProduct.supplierId}`);

      alert("✅ Order successfully placed and supplier has been notified");
      setShowOrderForm(false);
      setSelectedProduct(null);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to place order. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // Get order status badge for a product
  const getOrderStatus = (productId) => {
    const order = pendingOrders[productId];
    if (!order) return null;

    const statusConfig = {
      PENDING: { text: "Pending", className: "status-pending" },
      ACCEPTED: { text: "Accepted", className: "status-accepted" },
      REJECTED: { text: "Rejected", className: "status-rejected" },
    };

    const config = statusConfig[order.status] || { text: order.status, className: "" };

    return (
      <div className="order-status-info">
        <span className={`order-status-badge ${config.className}`}>
          {config.text}
        </span>
        <small className="order-qty">Qty: {order.quantity}</small>
      </div>
    );
  };

  const filtered = products.filter(p => {
    const matchSearch =
      p.productName?.toLowerCase().includes(search.toLowerCase()) ||
      p.manufacturer?.toLowerCase().includes(search.toLowerCase()) ||
      p.supplierName?.toLowerCase().includes(search.toLowerCase());

    const matchCategory =
      category === "All" ||
      normalize(p.category) === normalize(category);

    return matchSearch && matchCategory;
  });

  return (
    <div className="product-page">
      <h1>Inventory Management</h1>
      <p className="subtitle">Admin Dashboard - Consolidated Inventory</p>

      <input
        className="search-input"
        placeholder="Search products..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="category-bar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={category === cat ? "active" : ""}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>PRODUCT</th>
            <th>CATEGORY</th>
            <th>SUPPLIER</th>
            <th>STOCK</th>
            <th>REORDER</th>
            <th>WHOLESALE</th>
            <th>RETAIL</th>
            <th>ORDER STATUS</th>
            <th>ACTION</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map(p => (
            <tr key={p.id}>
              <td>{p.productCode}</td>
              <td>
                <div className="product-info">
                  <strong>{p.productName}</strong>
                  {p.manufacturer && (
                    <small className="manufacturer">{p.manufacturer}</small>
                  )}
                </div>
              </td>
              <td>{p.category}</td>
              <td>
                <span className="supplier-badge">{p.supplierName || "—"}</span>
              </td>
              <td className={p.stock <= 100 ? "low" : ""}>
                {p.stock}
                {p.stock <= 100 && (
                  <span className="low-badge">LOW</span>
                )}
              </td>
              <td>100</td>
              <td>Rs. {p.wholesalePrice ? Number(p.wholesalePrice).toFixed(2) : '0.00'}</td>
              <td>Rs. {p.retailPrice ? Number(p.retailPrice).toFixed(2) : '0.00'}</td>
              <td>
                {getOrderStatus(p.id) || <span className="no-order">—</span>}
              </td>
              <td>
                {p.stock <= 100 && (
                  <button
                    className="alert-btn"
                    onClick={() => openOrderForm(p)}
                    disabled={pendingOrders[p.id]?.status === "PENDING"}
                  >
                    {pendingOrders[p.id]?.status === "PENDING" ? "Order Sent" : "Order Now"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && (
        <div className="no-products">
          <p>No products found</p>
        </div>
      )}

      {showOrderForm && selectedProduct && (
        <div className="modal">
          <div className="modal-box">
            <h3>Restock Order</h3>

            <div className="order-details">
              <p><strong>Product:</strong> {selectedProduct.productName}</p>
              <p><strong>Supplier:</strong> {selectedProduct.supplierName}</p>
              <p><strong>Current Stock:</strong> {selectedProduct.stock} units</p>
              <p><strong>Unit Price:</strong> Rs. {Number(selectedProduct.wholesalePrice).toFixed(2)}</p>
            </div>

            <div className="form-group">
              <label>Order Quantity *</label>
              <input
                type="number"
                placeholder="Enter quantity"
                value={orderQty}
                onChange={e => setOrderQty(e.target.value)}
                min="1"
              />
            </div>

            <div className="total-section">
              <p className="total-label">Total Amount:</p>
              <p className="total-amount">
                Rs. {(orderQty * selectedProduct.wholesalePrice || 0).toFixed(2)}
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="confirm"
                onClick={placeOrder}
                disabled={loading}
              >
                {loading ? "Placing Order..." : "Place Order"}
              </button>

              <button
                className="cancel"
                onClick={() => setShowOrderForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}