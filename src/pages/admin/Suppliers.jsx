// File: frontend/src/pages/admin/Suppliers.jsx
import "./Suppliers.css";
import { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  doc,
  updateDoc
} from "firebase/firestore";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // ⭐ ADDED (rating state)
  const [adminRating, setAdminRating] = useState(0);

  /* ================= FETCH SUPPLIERS FROM FIREBASE ================= */
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const suppliersRef = collection(db, "suppliers");
        const snapshot = await getDocs(suppliersRef);

        const suppliersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setSuppliers(suppliersData);
      } catch (err) {
        console.error("Error loading suppliers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  /* ================= FETCH ORDERS FOR SELECTED SUPPLIER ================= */
  useEffect(() => {
    const fetchOrders = async () => {
      if (!selectedSupplier) return;

      try {
        const ordersRef = collection(db, "purchaseOrders");
        const q = query(
          ordersRef,
          where("supplierId", "==", selectedSupplier.userId || selectedSupplier.id),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().orderDate?.toDate
            ? doc.data().orderDate.toDate().toLocaleDateString()
            : doc.data().createdAt?.toDate
            ? doc.data().createdAt.toDate().toLocaleDateString()
            : "N/A"
        }));

        setOrders(ordersData);

        // ⭐ load existing rating
        setAdminRating(selectedSupplier.rating || 0);
      } catch (err) {
        console.error("Error loading orders:", err);
        alert("Failed to load orders: " + err.message);
      }
    };

    fetchOrders();
  }, [selectedSupplier]);

  /* ================= ADMIN RATING FUNCTION ================= */
  const handleRating = async (value) => {
    try {
      setAdminRating(value);

      const supplierRef = doc(db, "suppliers", selectedSupplier.id);
      await updateDoc(supplierRef, { rating: value });

      // update local supplier list
      setSuppliers(prev =>
        prev.map(s =>
          s.id === selectedSupplier.id ? { ...s, rating: value } : s
        )
      );

      // update selected supplier
      setSelectedSupplier(prev => ({ ...prev, rating: value }));
    } catch (err) {
      console.error("Error updating rating:", err);
    }
  };

  /* ================= FILTER SUPPLIERS ================= */
  const filteredSuppliers = suppliers.filter(s =>
    (s.name || s.email || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="suppliers-page">Loading suppliers...</div>;

  /* ================= SUPPLIER ORDER VIEW ================= */
  if (selectedSupplier) {
    return (
      <div className="suppliers-page">
        <div className="page-header">
          <h1>Supplier Management</h1>
          <button className="back-btn" onClick={() => setSelectedSupplier(null)}>
            ⬅ Back to Suppliers
          </button>
        </div>

        <div className="supplier-details-card">
          <div className="supplier-details-header">
            <div className="supplier-avatar-large">
              {(selectedSupplier.name || selectedSupplier.email || "S").charAt(0).toUpperCase()}
            </div>
            <div className="supplier-details-info">
              <h2>{selectedSupplier.name || "Unknown Supplier"}</h2>
              <p className="contact-person">
                {selectedSupplier.contactPerson || "No contact person"}
              </p>

              <div className="contact-details">
                <span>📧 {selectedSupplier.email || "N/A"}</span>
                <span>📞 {selectedSupplier.phone || "N/A"}</span>
                <span>🆔 {selectedSupplier.supplierId || "N/A"}</span>
              </div>

              <span className={`status-badge ${selectedSupplier.status || "active"}`}>
                {selectedSupplier.status || "Active"}
              </span>

              {/* ⭐ ADMIN RATING (ONLY ADDITION IN UI) */}
              <div className="admin-rating">
                <strong>Admin Rating:</strong>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      className={star <= adminRating ? "star active" : "star"}
                      onClick={() => handleRating(star)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        <h3 className="orders-title">Purchase Orders from Admin</h3>

        {orders.length === 0 ? (
          <div className="no-orders">
            <p>📦 No orders placed for this supplier yet</p>
            <small>Orders placed by admin will appear here</small>
          </div>
        ) : (
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>PO ID</th>
                  <th>Product</th>
                  <th>Product Code</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Order Date</th>
                  <th>Response Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td className="po-id">{order.poId}</td>
                    <td className="product-name">{order.product || order.productName || "N/A"}</td>
                    <td>{order.productCode || "N/A"}</td>
                    <td>{order.category || "N/A"}</td>
                    <td className="quantity">{order.quantity || 0} units</td>
                    <td className="price">Rs. {Number(order.unitPrice || 0).toFixed(2)}</td>
                    <td className="amount">Rs. {Number(order.amount || order.totalAmount || 0).toFixed(2)}</td>
                    <td>
                      <span className={`order-status ${order.status?.toLowerCase() || "pending"}`}>
                        {order.status || "PENDING"}
                      </span>
                    </td>
                    <td>{order.date}</td>
                    <td>
                      {order.approvalDate?.toDate
                        ? order.approvalDate.toDate().toLocaleDateString()
                        : order.approvedAt?.toDate
                        ? order.approvedAt.toDate().toLocaleDateString()
                        : order.rejectionDate?.toDate
                        ? order.rejectionDate.toDate().toLocaleDateString()
                        : order.rejectedAt?.toDate
                        ? order.rejectedAt.toDate().toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="orders-summary">
          <div className="summary-card">
            <h4>Total Orders</h4>
            <p className="summary-value">{orders.length}</p>
          </div>
          <div className="summary-card">
            <h4>Pending</h4>
            <p className="summary-value pending-count">
              {orders.filter(o => o.status === "PENDING").length}
            </p>
          </div>
          <div className="summary-card">
            <h4>Approved</h4>
            <p className="summary-value approved-count">
              {orders.filter(o => o.status === "APPROVED").length}
            </p>
          </div>
          <div className="summary-card">
            <h4>Rejected</h4>
            <p className="summary-value rejected-count">
              {orders.filter(o => o.status === "REJECTED").length}
            </p>
          </div>
          <div className="summary-card">
            <h4>Completed</h4>
            <p className="summary-value completed-count">
              {orders.filter(o => o.status === "COMPLETED").length}
            </p>
          </div>
          <div className="summary-card">
            <h4>Total Value</h4>
            <p className="summary-value total-amount">
              Rs. {orders.reduce((sum, o) => sum + (Number(o.amount || o.totalAmount) || 0), 0).toFixed(2)}
            </p>
          </div>
        </div>

        {orders.filter(o => o.status === "REJECTED").length > 0 && (
          <div className="rejected-orders-section">
            <h3>Rejected Orders</h3>
            <div className="rejected-orders-list">
              {orders.filter(o => o.status === "REJECTED").map(order => (
                <div key={order.id} className="rejected-order-card">
                  <div className="rejected-order-header">
                    <span className="po-id">{order.poId}</span>
                    <span className="order-status rejected">REJECTED</span>
                  </div>
                  <p><strong>Product:</strong> {order.product || order.productName}</p>
                  <p><strong>Quantity:</strong> {order.quantity} units</p>
                  <p><strong>Rejection Date:</strong> {order.rejectionDate?.toDate ? order.rejectionDate.toDate().toLocaleDateString() : "N/A"}</p>
                  {order.rejectionReason && (
                    <div className="rejection-reason">
                      <strong>Reason:</strong>
                      <p>{order.rejectionReason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ================= SUPPLIER CARDS VIEW ================= */
  return (
    <div className="suppliers-page">
      <div className="page-header">
        <h1>Supplier Management</h1>
        <p className="subtitle">Manage and view all registered suppliers</p>
      </div>

      <div className="suppliers-header">
        <input
          type="text"
          placeholder="🔍 Search suppliers by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
        <div className="suppliers-count">
          <span>{filteredSuppliers.length} Suppliers</span>
        </div>
      </div>

      {filteredSuppliers.length === 0 ? (
        <div className="no-suppliers">
          <p>No suppliers found</p>
        </div>
      ) : (
        <div className="suppliers-grid">
          {filteredSuppliers.map(supplier => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onView={() => setSelectedSupplier(supplier)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= SUPPLIER CARD COMPONENT ================= */
function SupplierCard({ supplier, onView }) {
  const [stats, setStats] = useState({
    products: 0,
    totalOrders: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    completedOrders: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supplierId = supplier.userId || supplier.id;

        const productsRef = collection(db, "products");
        const productsQuery = query(productsRef, where("supplierId", "==", supplierId));
        const productsSnapshot = await getDocs(productsQuery);

        const ordersRef = collection(db, "purchaseOrders");
        const allOrdersQuery = query(ordersRef, where("supplierId", "==", supplierId));
        const allOrdersSnapshot = await getDocs(allOrdersQuery);

        const allOrders = allOrdersSnapshot.docs.map(doc => doc.data());

        setStats({
          products: productsSnapshot.size,
          totalOrders: allOrders.length,
          pendingOrders: allOrders.filter(o => o.status === "PENDING").length,
          approvedOrders: allOrders.filter(o => o.status === "APPROVED").length,
          completedOrders: allOrders.filter(o => o.status === "COMPLETED").length
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };

    fetchStats();
  }, [supplier.id, supplier.userId]);

  return (
    <div className="supplier-card">
      <div className="supplier-top">
        <div className="supplier-avatar">
          {(supplier.name || supplier.email || "S").charAt(0).toUpperCase()}
        </div>
        <span className={`status ${supplier.status || "active"}`}>
          {supplier.status || "Active"}
        </span>
      </div>

      <h3>{supplier.name || "Unknown Supplier"}</h3>
      <p className="contact">
        {supplier.contactPerson || supplier.email || "No contact"}
      </p>

      <div className="supplier-info">
        <p>📧 {supplier.email || "N/A"}</p>
        <p>📞 {supplier.phone || "N/A"}</p>
      </div>

      <div className="rating">
        ⭐ {supplier.rating || "N/A"} rating
      </div>

      {supplier.categories && supplier.categories.length > 0 && (
        <div className="categories">
          {supplier.categories.map((cat, index) => (
            <span key={index} className="category-tag">{cat}</span>
          ))}
        </div>
      )}

      <div className="supplier-footer">
        <div className="stats-grid">
          <div className="stat">
            <span className="stat-label">Products</span>
            <strong className="stat-value">{stats.products}</strong>
          </div>
          <div className="stat">
            <span className="stat-label">Total Orders</span>
            <strong className="stat-value highlight">{stats.totalOrders}</strong>
          </div>
          <div className="stat">
            <span className="stat-label">Pending</span>
            <strong className="stat-value pending">{stats.pendingOrders}</strong>
          </div>
          <div className="stat">
            <span className="stat-label">Approved</span>
            <strong className="stat-value approved">{stats.approvedOrders}</strong>
          </div>
        </div>
        <button className="view-btn" onClick={onView}>
          👁 View All Orders ({stats.totalOrders})
        </button>
      </div>
    </div>
  );
}
