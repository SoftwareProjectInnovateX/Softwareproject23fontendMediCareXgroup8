// src/pages/AdminPurchaseOrders/AdminPurchaseOrders.jsx
import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  updateDoc,
  doc,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import './Ordermanagement.css';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const statusOptions = ['All', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];

  // Fetch all purchase orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersQuery = query(
        collection(db, 'purchaseOrders'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(ordersQuery);
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setOrders(ordersData);
      setFilteredOrders(ordersData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Failed to load orders: ' + error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter orders based on status and search
  useEffect(() => {
    let filtered = orders;

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.poId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  }, [statusFilter, searchTerm, orders]);

  // View order details
  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  // Mark order as completed (when received)
  const markAsReceived = async (orderId, order) => {
    const confirmReceived = window.confirm(
      `Mark this order as RECEIVED?\n\nThis will update the inventory stock.`
    );

    if (!confirmReceived) return;

    try {
      // Update order status
      await updateDoc(doc(db, 'purchaseOrders', orderId), {
        status: 'COMPLETED',
        completionDate: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Update adminProducts stock
      const adminProductRef = doc(db, 'adminProducts', order.adminProductId);
      const adminProductSnap = await getDoc(adminProductRef);
      
      if (adminProductSnap.exists()) {
        const currentStock = adminProductSnap.data().stock;
        await updateDoc(adminProductRef, {
          stock: currentStock + order.quantity,
          availability: 'in stock',
          lastRestocked: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      alert('✅ Order marked as received and stock updated!');
      fetchOrders();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error marking order as received:', error);
      alert('❌ Failed to update order: ' + error.message);
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color class
  const getStatusClass = (status) => {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'APPROVED':
        return 'status-approved';
      case 'REJECTED':
        return 'status-rejected';
      case 'COMPLETED':
        return 'status-completed';
      default:
        return '';
    }
  };

  // Calculate total statistics
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    approved: orders.filter(o => o.status === 'APPROVED').length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
    totalAmount: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  };

  return (
    <div className="purchase-orders-container">
      <div className="orders-header">
        <h1>Purchase Orders</h1>
        <p>Manage and track all purchase orders</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card pending">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{stats.pending}</div>
        </div>
        <div className="stat-card approved">
          <div className="stat-label">Approved</div>
          <div className="stat-value">{stats.approved}</div>
        </div>
        <div className="stat-card completed">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{stats.completed}</div>
        </div>
        <div className="stat-card total-amount">
          <div className="stat-label">Total Amount</div>
          <div className="stat-value">Rs. {stats.totalAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by PO ID, Product, or Supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="status-filters">
          {statusOptions.map(status => (
            <button
              key={status}
              className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="orders-table-wrapper">
        {loading ? (
          <div className="loading-state">
            <p>Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <p>No orders found</p>
          </div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>PO ID</th>
                <th>Product</th>
                <th>Supplier</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Order Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td>
                    <span className="po-id">{order.poId}</span>
                  </td>
                  <td>
                    <div className="product-cell">
                      <strong>{order.productName}</strong>
                      <small>{order.productCode}</small>
                    </div>
                  </td>
                  <td>{order.supplierName}</td>
                  <td>{order.quantity} units</td>
                  <td>Rs. {Number(order.unitPrice).toFixed(2)}</td>
                  <td className="amount-cell">
                    Rs. {Number(order.totalAmount).toFixed(2)}
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{formatDate(order.orderDate || order.createdAt)}</td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() => viewOrderDetails(order)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="details-modal">
            <div className="modal-header">
              <h2>Order Details</h2>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="order-id-section">
                <h3>{selectedOrder.poId}</h3>
                <span className={`status-badge ${getStatusClass(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>

              <div className="details-grid">
                <div className="detail-group">
                  <label>Product</label>
                  <p>{selectedOrder.productName}</p>
                </div>
                <div className="detail-group">
                  <label>Product Code</label>
                  <p>{selectedOrder.productCode}</p>
                </div>
                <div className="detail-group">
                  <label>Category</label>
                  <p>{selectedOrder.category}</p>
                </div>
                <div className="detail-group">
                  <label>Supplier</label>
                  <p>{selectedOrder.supplierName}</p>
                </div>
                <div className="detail-group">
                  <label>Quantity</label>
                  <p>{selectedOrder.quantity} units</p>
                </div>
                <div className="detail-group">
                  <label>Unit Price</label>
                  <p>Rs. {Number(selectedOrder.unitPrice).toFixed(2)}</p>
                </div>
                <div className="detail-group">
                  <label>Total Amount</label>
                  <p className="total-amount">Rs. {Number(selectedOrder.totalAmount).toFixed(2)}</p>
                </div>
                <div className="detail-group">
                  <label>Order Date</label>
                  <p>{formatDate(selectedOrder.orderDate || selectedOrder.createdAt)}</p>
                </div>
                {selectedOrder.approvalDate && (
                  <div className="detail-group">
                    <label>Approval Date</label>
                    <p>{formatDate(selectedOrder.approvalDate)}</p>
                  </div>
                )}
                {selectedOrder.completionDate && (
                  <div className="detail-group">
                    <label>Completion Date</label>
                    <p>{formatDate(selectedOrder.completionDate)}</p>
                  </div>
                )}
              </div>

              {selectedOrder.notes && (
                <div className="notes-section">
                  <label>Notes</label>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}

              {selectedOrder.rejectionReason && (
                <div className="rejection-section">
                  <label>Rejection Reason</label>
                  <p>{selectedOrder.rejectionReason}</p>
                </div>
              )}

              {selectedOrder.status === 'APPROVED' && (
                <div className="action-section">
                  <button
                    className="receive-btn"
                    onClick={() => markAsReceived(selectedOrder.id, selectedOrder)}
                  >
                    ✓ Mark as Received
                  </button>
                  <p className="action-hint">Click this when you receive the products</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;