// File: frontend/src/pages/admin/Suppliers.jsx
import "./Suppliers.css";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  /* ================= FETCH SUPPLIERS & PURCHASE ORDERS FROM BACKEND ================= */
 useEffect(() => {
  const fetchData = async () => {
    try {
      const suppliersRes = await axios.get("http://localhost:5000/api/suppliers");
      //const ordersRes = await axios.get("http://localhost:5000/api/purchase-orders");

      setSuppliers(suppliersRes.data);
      setOrders(ordersRes.data);
    } catch (err) {
      console.error("Error loading suppliers:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);



  /* ================= SUPPLIER STATISTICS ================= */
  const getSupplierStats = (supplierId) => {
    const supplierOrders = orders.filter(o => o.supplierId === supplierId);

    return {
      products: new Set(supplierOrders.map(o => o.productId).filter(Boolean)).size,
      activeOrders: supplierOrders.filter(o => o.status !== "DELIVERED").length,
    };
  };

  const filteredSuppliers = suppliers.filter(s =>
    (s.name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="suppliers-page">Loading suppliers...</div>;

  /* ================= SUPPLIER ORDER VIEW ================= */
  if (selectedSupplier) {
    const supplierOrders = orders.filter(
      o => o.supplierId === (selectedSupplier.supplierId || selectedSupplier.id)
    );

    return (
      <div className="suppliers-page">
        <button className="back-btn" onClick={() => setSelectedSupplier(null)}>
          ⬅ Back
        </button>

        <h2>Orders for {selectedSupplier.name || "Unknown Supplier"}</h2>

        {supplierOrders.length === 0 ? (
          <p>No orders found</p>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>PO ID</th>
                <th>Product</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Pharmacy</th>
                <th>Date</th>
                <th>Reorder Level</th>
                <th>Stock Status</th>
              </tr>
            </thead>
            <tbody>
              {supplierOrders.map(order => (
                <tr key={order.id}>
                  <td>{order.poId}</td>
                  <td>{order.product}</td>
                  <td>{order.category}</td>
                  <td>{order.quantity}</td>
                  <td>Rs.{order.unitPrice}</td>
                  <td>Rs.{order.amount}</td>
                  <td>{order.status}</td>
                  <td>{order.pharmacy}</td>
                  <td>{order.date}</td>
                  <td>{order.reorderLevel}</td>
                  <td>{order.inStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  /* ================= ORIGINAL SUPPLIER CARDS ================= */
  return (
    <div className="suppliers-page">
      {/* Header */}
      <div className="suppliers-header">
        <input
          type="text"
          placeholder="Search suppliers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        
      </div>

      {/* Supplier Cards */}
      <div className="suppliers-grid">
        {filteredSuppliers.map(supplier => {
          const stats = getSupplierStats(supplier.supplierId || supplier.id);

          return (
            <div className="supplier-card" key={supplier.id}>
              {/* Top */}
              <div className="supplier-top">
                <div className="supplier-avatar">
                  {(supplier.name || "S").charAt(0)}
                </div>

                <span className={`status ${supplier.status || "active"}`}>
                  {supplier.status || "active"}
                </span>
              </div>

              <h3>{supplier.name || "Unknown Supplier"}</h3>
              <p className="contact">
                {supplier.contactPerson || "No contact"}
              </p>

              <div className="supplier-info">
                <p>📧 {supplier.email || "N/A"}</p>
                <p>📞 {supplier.phone || "N/A"}</p>
              </div>

              <div className="rating">⭐ {supplier.rating || "0"} rating</div>

              {/* Categories */}
              <div className="categories">
                {(supplier.categories || []).map((cat, index) => (
                  <span key={index}>{cat}</span>
                ))}
              </div>

              {/* Footer */}
              <div className="supplier-footer">
                <p>
                  Products: <strong>{stats.products}</strong>
                </p>
                <p>
                  Active Orders: <strong>{stats.activeOrders}</strong>
                </p>
                <button
                  className="view-btn"
                  onClick={() => setSelectedSupplier(supplier)}
                >
                  👁 View
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
