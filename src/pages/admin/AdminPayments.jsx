// src/pages/AdminPayments/AdminPayments.jsx
import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  where
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import './AdminPayments.css';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);

  const statusOptions = ['All', 'PENDING', 'PAID', 'OVERDUE'];

  // Fetch payments
  const fetchPayments = async () => {
    try {
      setLoading(true);
      const paymentsQuery = query(
        collection(db, 'payments'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(paymentsQuery);
      const paymentsData = snapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        
        // Check if payment is overdue
        if (data.status === 'PENDING' && data.dueDate) {
          const dueDate = data.dueDate.toDate ? data.dueDate.toDate() : new Date(data.dueDate);
          const today = new Date();
          if (dueDate < today) {
            // Mark as overdue
            updateDoc(doc(db, 'payments', doc.id), { status: 'OVERDUE' });
            data.status = 'OVERDUE';
          }
        }
        
        return data;
      });

      setPayments(paymentsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching payments:', error);
      alert('Failed to load payments: ' + error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // Filter payments
  const filteredPayments = payments.filter(payment => {
    const matchStatus = statusFilter === 'All' || payment.status === statusFilter;
    const matchSearch = searchTerm === '' || 
      payment.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.productName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchStatus && matchSearch;
  });

  // Calculate statistics
  const stats = {
    total: payments.length,
    pending: payments.filter(p => p.status === 'PENDING').length,
    paid: payments.filter(p => p.status === 'PAID').length,
    overdue: payments.filter(p => p.status === 'OVERDUE').length,
    totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    totalPaid: payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + (p.amount || 0), 0),
    totalPending: payments.filter(p => p.status === 'PENDING' || p.status === 'OVERDUE').reduce((sum, p) => sum + (p.amount || 0), 0)
  };

  // Mark as paid
  const markAsPaid = async (paymentId) => {
    const confirmPaid = window.confirm('Mark this payment as PAID?');
    if (!confirmPaid) return;

    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'PAID',
        paidDate: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      alert('✅ Payment marked as paid!');
      fetchPayments();
      setSelectedPayment(null);
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      alert('❌ Failed to update payment: ' + error.message);
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get days until due
  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return 0;
    const due = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
    const today = new Date();
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get status class
  const getStatusClass = (status) => {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'PAID':
        return 'status-paid';
      case 'OVERDUE':
        return 'status-overdue';
      default:
        return '';
    }
  };

  return (
    <div className="payments-container">
      <div className="payments-header">
        <h1>Payments Management</h1>
        <p>Track and manage supplier payments</p>
      </div>

      {/* Statistics */}
      <div className="payment-stats-grid">
        <div className="stat-card total">
          <div className="stat-label">Total Payments</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card pending">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{stats.pending}</div>
        </div>
        <div className="stat-card paid">
          <div className="stat-label">Paid</div>
          <div className="stat-value">{stats.paid}</div>
        </div>
        <div className="stat-card overdue">
          <div className="stat-label">Overdue</div>
          <div className="stat-value">{stats.overdue}</div>
        </div>
        <div className="stat-card amount">
          <div className="stat-label">Total Amount</div>
          <div className="stat-value">Rs. {stats.totalAmount.toFixed(2)}</div>
        </div>
        <div className="stat-card amount-paid">
          <div className="stat-label">Total Paid</div>
          <div className="stat-value">Rs. {stats.totalPaid.toFixed(2)}</div>
        </div>
        <div className="stat-card amount-pending">
          <div className="stat-label">Total Pending</div>
          <div className="stat-value">Rs. {stats.totalPending.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="payment-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by PO ID, Supplier, or Product..."
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

      {/* Payments Table */}
      <div className="payments-table-wrapper">
        {loading ? (
          <div className="loading-state">
            <p>Loading payments...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="empty-state">
            <p>No payments found</p>
          </div>
        ) : (
          <table className="payments-table">
            <thead>
              <tr>
                <th>PO ID</th>
                <th>Supplier</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Days Until Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(payment => {
                const daysUntilDue = getDaysUntilDue(payment.dueDate);
                return (
                  <tr key={payment.id}>
                    <td>
                      <span className="po-id">{payment.orderId}</span>
                    </td>
                    <td>{payment.supplierName}</td>
                    <td>{payment.productName}</td>
                    <td>{payment.quantity} units</td>
                    <td className="amount-cell">Rs. {Number(payment.amount).toFixed(2)}</td>
                    <td>{formatDate(payment.dueDate)}</td>
                    <td>
                      <span className={`days-due ${daysUntilDue < 0 ? 'overdue' : daysUntilDue <= 7 ? 'warning' : ''}`}>
                        {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days`}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="view-btn"
                        onClick={() => setSelectedPayment(payment)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Payment Details</h2>
              <button className="close-btn" onClick={() => setSelectedPayment(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="payment-id-section">
                <h3>{selectedPayment.orderId}</h3>
                <span className={`status-badge ${getStatusClass(selectedPayment.status)}`}>
                  {selectedPayment.status}
                </span>
              </div>

              <div className="payment-details-grid">
                <div className="detail-item">
                  <label>Supplier</label>
                  <p>{selectedPayment.supplierName}</p>
                </div>
                <div className="detail-item">
                  <label>Product</label>
                  <p>{selectedPayment.productName}</p>
                </div>
                <div className="detail-item">
                  <label>Quantity</label>
                  <p>{selectedPayment.quantity} units</p>
                </div>
                <div className="detail-item">
                  <label>Amount</label>
                  <p className="amount-large">Rs. {Number(selectedPayment.amount).toFixed(2)}</p>
                </div>
                <div className="detail-item">
                  <label>Created Date</label>
                  <p>{formatDate(selectedPayment.createdAt)}</p>
                </div>
                <div className="detail-item">
                  <label>Due Date</label>
                  <p>{formatDate(selectedPayment.dueDate)}</p>
                </div>
                {selectedPayment.paidDate && (
                  <div className="detail-item">
                    <label>Paid Date</label>
                    <p>{formatDate(selectedPayment.paidDate)}</p>
                  </div>
                )}
                <div className="detail-item">
                  <label>Days Until Due</label>
                  <p className={getDaysUntilDue(selectedPayment.dueDate) < 0 ? 'overdue-text' : ''}>
                    {getDaysUntilDue(selectedPayment.dueDate) < 0 
                      ? `${Math.abs(getDaysUntilDue(selectedPayment.dueDate))} days overdue` 
                      : `${getDaysUntilDue(selectedPayment.dueDate)} days`}
                  </p>
                </div>
              </div>

              {selectedPayment.status !== 'PAID' && (
                <div className="action-section">
                  <button
                    className="mark-paid-btn"
                    onClick={() => markAsPaid(selectedPayment.id)}
                  >
                    ✓ Mark as Paid
                  </button>
                  <p className="action-hint">Click to record this payment as completed</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;