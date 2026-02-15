import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  addDoc,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../services/firebase";
import "./PurchaseOrders.css";

export default function PurchaseOrders() {
  const [supplierId, setSupplierId] = useState(null);
  const [supplierName, setSupplierName] = useState("");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All Orders");

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [orderToReject, setOrderToReject] = useState(null);

  /* ================= AUTH USER ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setSupplierId(user.uid);
        
        // Try to fetch supplier name from suppliers collection first
        try {
          let userDoc = await getDoc(doc(db, "suppliers", user.uid));
          if (userDoc.exists()) {
            setSupplierName(userDoc.data().name || user.email);
          } else {
            // Fallback to users collection
            userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              setSupplierName(userDoc.data().name || userDoc.data().fullName || user.email);
            } else {
              setSupplierName(user.email);
            }
          }
        } catch (error) {
          console.error("Error fetching user:", error);
          setSupplierName(user.email);
        }
      } else {
        setSupplierId(null);
        setSupplierName("");
      }
    });
    return () => unsub();
  }, []);

  /* ================= FETCH ORDERS ================= */
  const fetchOrders = useCallback(async () => {
    if (!supplierId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const q =
        filterStatus === "All Orders"
          ? query(
              collection(db, "purchaseOrders"),
              where("supplierId", "==", supplierId),
              orderBy("createdAt", "desc")
            )
          : query(
              collection(db, "purchaseOrders"),
              where("supplierId", "==", supplierId),
              where("status", "==", filterStatus),
              orderBy("createdAt", "desc")
            );

      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setOrders(data);
    } catch (error) {
      console.error("Error loading orders:", error);
      alert("Error loading orders: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [supplierId, filterStatus]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* ================= APPROVE ORDER ================= */
  const approveOrder = async (orderId, order) => {
    try {
      // Check if supplier has enough stock
      const productRef = doc(db, "products", order.productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        alert("❌ Product not found in your inventory");
        return;
      }

      const currentStock = productSnap.data().stock;

      if (currentStock < order.quantity) {
        alert(`❌ Insufficient stock!\n\nRequired: ${order.quantity} units\nAvailable: ${currentStock} units`);
        return;
      }

      const confirmApprove = window.confirm(
        `Approve this order?\n\nProduct: ${order.product || order.productName}\nQuantity: ${order.quantity} units\nAmount: Rs. ${Number(order.amount || order.totalAmount).toFixed(2)}\n\nThis will deduct ${order.quantity} units from your stock.`
      );

      if (!confirmApprove) return;

      // Update order status
      await updateDoc(doc(db, "purchaseOrders", orderId), {
        status: "APPROVED",
        approvedAt: Timestamp.now(),
        approvalDate: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Deduct from supplier's stock
      await updateDoc(productRef, {
        stock: currentStock - order.quantity,
        updatedAt: Timestamp.now()
      });

      // 🔔 Notify admin about approval
      await addDoc(collection(db, "notifications"), {
        type: "ORDER_APPROVED",
        recipientId: "admin",
        recipientType: "admin",
        orderId: orderId,
        poId: order.poId,
        supplierId: supplierId,
        supplierName: supplierName,
        productName: order.product || order.productName,
        quantity: order.quantity,
        totalAmount: order.amount || order.totalAmount,
        adminProductId: order.adminProductId,
        message: `✅ Order Approved: ${supplierName} approved order ${order.poId} for ${order.quantity} units of ${order.product || order.productName}`,
        read: false,
        createdAt: Timestamp.now(),
      });

      console.log(`✅ Approval notification sent to admin for order ${order.poId}`);

      alert("✅ Order approved successfully!\n\nStock has been deducted from your inventory.\nAdmin has been notified.");
      fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error approving order:", error);
      alert("❌ Failed to approve order: " + error.message);
    }
  };

  /* ================= REJECT ORDER ================= */
  const openRejectModal = (order) => {
    setOrderToReject(order);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const rejectOrder = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    try {
      // Update order status
      await updateDoc(doc(db, "purchaseOrders", orderToReject.id), {
        status: "REJECTED",
        rejectedAt: Timestamp.now(),
        rejectionReason: rejectReason,
        rejectionDate: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // 🔔 Notify admin about rejection
      await addDoc(collection(db, "notifications"), {
        type: "ORDER_REJECTED",
        recipientId: "admin",
        recipientType: "admin",
        orderId: orderToReject.id,
        poId: orderToReject.poId,
        supplierId: supplierId,
        supplierName: supplierName,
        productName: orderToReject.product || orderToReject.productName,
        quantity: orderToReject.quantity,
        totalAmount: orderToReject.amount || orderToReject.totalAmount,
        rejectionReason: rejectReason,
        message: `❌ Order Rejected: ${supplierName} rejected order ${orderToReject.poId} - Reason: ${rejectReason}`,
        read: false,
        createdAt: Timestamp.now(),
      });

      console.log(`✅ Rejection notification sent to admin for order ${orderToReject.poId}`);

      alert("✅ Order rejected successfully.\nAdmin has been notified.");
      setShowRejectModal(false);
      setOrderToReject(null);
      setRejectReason("");
      fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error rejecting order:", error);
      alert("❌ Failed to reject order: " + error.message);
    }
  };

  /* ================= STATUS COLOR ================= */
  const getStatusColor = (status) =>
    ({
      PENDING: "status-pending",
      APPROVED: "status-approved",
      REJECTED: "status-rejected",
      COMPLETED: "status-completed",
    }[status] || "status-pending");

  /* ================= FORMAT DATE ================= */
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /* ================= UI ================= */
  return (
    <div className="po-container">
      <div className="po-header">
        <h1>Purchase Orders</h1>
        <p>Orders received from MediCareX pharmacy</p>
        {supplierName && <p className="supplier-info">Logged in as: {supplierName}</p>}
      </div>

      {/* FILTER */}
      <div className="po-filters">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option>All Orders</option>
          <option>PENDING</option>
          <option>APPROVED</option>
          <option>REJECTED</option>
          <option>COMPLETED</option>
        </select>

        <div className="po-stats">
          <span>Total: <b>{orders.length}</b></span>
          <span>
            Pending: <b>{orders.filter(o => o.status === "PENDING").length}</b>
          </span>
          <span>
            Approved: <b>{orders.filter(o => o.status === "APPROVED").length}</b>
          </span>
        </div>
      </div>

      {/* TABLE */}
      <div className="po-table-wrapper">
        {loading ? (
          <div className="po-empty">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="po-empty">
            <p>No orders found</p>
            <small>Orders from MediCareX will appear here</small>
          </div>
        ) : (
          <table className="po-table">
            <thead>
              <tr>
                <th>PO ID</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total Amount</th>
                <th>Order Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="po-id">{o.poId}</td>
                  <td>
                    <div className="product-cell">
                      <strong>{o.product || o.productName}</strong>
                      <small>{o.productCode}</small>
                    </div>
                  </td>
                  <td>{o.quantity} units</td>
                  <td>Rs. {Number(o.unitPrice).toFixed(2)}</td>
                  <td className="amount-cell">Rs. {Number(o.amount || o.totalAmount).toFixed(2)}</td>
                  <td>{formatDate(o.orderDate || o.createdAt)}</td>
                  <td>
                    <span className={`po-status ${getStatusColor(o.status)}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="po-actions">
                    <button className="view-btn" onClick={() => setSelectedOrder(o)}>
                      View
                    </button>

                    {o.status === "PENDING" && (
                      <>
                        <button
                          className="approve-btn"
                          onClick={() => approveOrder(o.id, o)}
                          title="Approve Order"
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="reject-btn"
                          onClick={() => openRejectModal(o)}
                          title="Reject Order"
                        >
                          ✕ Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="po-modal-backdrop">
          <div className="po-modal">
            <div className="modal-header">
              <h2>Order Details</h2>
              <button className="close-icon" onClick={() => setSelectedOrder(null)}>×</button>
            </div>

            <div className="modal-content">
              <div className="order-id-header">
                <span className="po-id-large">{selectedOrder.poId}</span>
                <span className={`po-status ${getStatusColor(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>

              <div className="details-grid">
                <div className="detail-item">
                  <label>Product Name</label>
                  <p>{selectedOrder.product || selectedOrder.productName}</p>
                </div>
                <div className="detail-item">
                  <label>Product Code</label>
                  <p>{selectedOrder.productCode}</p>
                </div>
                <div className="detail-item">
                  <label>Category</label>
                  <p>{selectedOrder.category}</p>
                </div>
                <div className="detail-item">
                  <label>Quantity</label>
                  <p>{selectedOrder.quantity} units</p>
                </div>
                <div className="detail-item">
                  <label>Unit Price</label>
                  <p>Rs. {Number(selectedOrder.unitPrice).toFixed(2)}</p>
                </div>
                <div className="detail-item">
                  <label>Total Amount</label>
                  <p className="total-amount">Rs. {Number(selectedOrder.amount || selectedOrder.totalAmount).toFixed(2)}</p>
                </div>
                <div className="detail-item">
                  <label>Order Date</label>
                  <p>{formatDate(selectedOrder.orderDate || selectedOrder.createdAt)}</p>
                </div>
                {selectedOrder.approvalDate && (
                  <div className="detail-item">
                    <label>Approval Date</label>
                    <p>{formatDate(selectedOrder.approvalDate)}</p>
                  </div>
                )}
                {selectedOrder.rejectionDate && (
                  <div className="detail-item">
                    <label>Rejection Date</label>
                    <p>{formatDate(selectedOrder.rejectionDate)}</p>
                  </div>
                )}
              </div>

              {selectedOrder.notes && (
                <div className="notes-section">
                  <label>Notes from Admin</label>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}

              {selectedOrder.rejectionReason && (
                <div className="rejection-section">
                  <label>Rejection Reason</label>
                  <p>{selectedOrder.rejectionReason}</p>
                </div>
              )}

              {selectedOrder.status === "PENDING" && (
                <div className="modal-actions">
                  <button
                    className="approve-btn-modal"
                    onClick={() => approveOrder(selectedOrder.id, selectedOrder)}
                  >
                    ✓ Approve Order
                  </button>
                  <button
                    className="reject-btn-modal"
                    onClick={() => {
                      setSelectedOrder(null);
                      openRejectModal(selectedOrder);
                    }}
                  >
                    ✕ Reject Order
                  </button>
                </div>
              )}
            </div>

            <button
              className="close-btn"
              onClick={() => setSelectedOrder(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* REJECT REASON MODAL */}
      {showRejectModal && orderToReject && (
        <div className="po-modal-backdrop">
          <div className="po-modal reject-modal">
            <div className="modal-header">
              <h2>Reject Order</h2>
              <button className="close-icon" onClick={() => setShowRejectModal(false)}>×</button>
            </div>

            <div className="modal-content">
              <p className="reject-warning">
                You are about to reject order <strong>{orderToReject.poId}</strong>
              </p>
              <p className="reject-info">Product: {orderToReject.product || orderToReject.productName}</p>
              
              <div className="form-group">
                <label>Reason for Rejection *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g., Out of stock, Product discontinued, Pricing issue..."
                  rows="4"
                />
              </div>

              <div className="modal-actions">
                <button
                  className="confirm-reject-btn"
                  onClick={rejectOrder}
                  disabled={!rejectReason.trim()}
                >
                  Confirm Rejection
                </button>
                <button
                  className="cancel-btn"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}