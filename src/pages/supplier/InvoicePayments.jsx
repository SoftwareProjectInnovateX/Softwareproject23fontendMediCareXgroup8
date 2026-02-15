// src/pages/InvoicePayments.jsx
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc,
  updateDoc,
  addDoc,
  query,
  orderBy,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import './InvoicePayments.css';

const InvoicePayments = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentNote, setPaymentNote] = useState('');

  // FETCH ALL INVOICES FROM FIREBASE
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      console.log('Fetching invoices from Firebase...');

      let invoicesQuery;
      
      if (filterStatus === 'All') {
        invoicesQuery = query(
          collection(db, 'invoices'),
          orderBy('invoiceDate', 'desc')
        );
      } else {
        invoicesQuery = query(
          collection(db, 'invoices'),
          where('paymentStatus', '==', filterStatus),
          orderBy('invoiceDate', 'desc')
        );
      }

      const snapshot = await getDocs(invoicesQuery);
      const invoicesData = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        invoicesData.push({
          id: doc.id,
          ...data,
          invoiceDate: data.invoiceDate?.toDate ? 
            data.invoiceDate.toDate().toISOString().split('T')[0] : data.invoiceDate,
          dueDate: data.dueDate?.toDate ? 
            data.dueDate.toDate().toISOString().split('T')[0] : data.dueDate,
          paidDate: data.paidDate?.toDate ? 
            data.paidDate.toDate().toISOString().split('T')[0] : null
        });
      });

      console.log('Invoices fetched:', invoicesData);
      setInvoices(invoicesData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      alert('Failed to load invoices: ' + error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [filterStatus]);

  // CALCULATE TOTALS
  const calculateTotals = () => {
    const total = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const paid = invoices
      .filter(inv => inv.paymentStatus === 'Paid')
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const pending = invoices
      .filter(inv => inv.paymentStatus === 'Pending')
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const overdue = invoices
      .filter(inv => inv.paymentStatus === 'Overdue')
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    return { total, paid, pending, overdue };
  };

  // RECORD PAYMENT
  const recordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) {
      alert('Please enter payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedInvoice.totalAmount) {
      alert('Invalid payment amount');
      return;
    }

    try {
      const invoiceRef = doc(db, 'invoices', selectedInvoice.id);
      
      // Update invoice status
      await updateDoc(invoiceRef, {
        paymentStatus: 'Paid',
        paidAmount: amount,
        paidDate: Timestamp.now(),
        paymentMethod: paymentMethod,
        paymentNote: paymentNote,
        updatedAt: Timestamp.now()
      });

      // Record payment transaction
      await addDoc(collection(db, 'payments'), {
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        amount: amount,
        paymentMethod: paymentMethod,
        paymentDate: Timestamp.now(),
        note: paymentNote,
        pharmacy: selectedInvoice.pharmacy,
        createdAt: Timestamp.now()
      });

      alert('Payment recorded successfully!');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNote('');
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment: ' + error.message);
    }
  };

  // GENERATE INVOICE/RECEIPT PDF
  const generatePDF = (invoice) => {
    // Create a printable HTML receipt
    const receiptWindow = window.open('', '', 'width=800,height=600');
    
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            background: white;
          }
          .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #333;
            padding: 30px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .company-info h1 {
            font-size: 28px;
            color: #2563eb;
            margin-bottom: 5px;
          }
          .company-info p {
            color: #666;
            font-size: 14px;
          }
          .invoice-info {
            text-align: right;
          }
          .invoice-info h2 {
            font-size: 24px;
            margin-bottom: 10px;
          }
          .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            margin-top: 5px;
          }
          .status-paid {
            background-color: #dcfce7;
            color: #166534;
          }
          .status-pending {
            background-color: #fef3c7;
            color: #92400e;
          }
          .status-overdue {
            background-color: #fee2e2;
            color: #991b1b;
          }
          .details-section {
            display: flex;
            justify-content: space-between;
            margin: 30px 0;
          }
          .detail-box h3 {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .detail-box p {
            font-size: 16px;
            margin: 5px 0;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .items-table th {
            background-color: #f3f4f6;
            padding: 12px;
            text-align: left;
            border-bottom: 2px solid #333;
          }
          .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          .totals-section {
            margin-top: 20px;
            text-align: right;
          }
          .total-row {
            display: flex;
            justify-content: flex-end;
            margin: 10px 0;
          }
          .total-label {
            width: 200px;
            text-align: right;
            padding-right: 20px;
            font-weight: bold;
          }
          .total-amount {
            width: 150px;
            text-align: right;
            font-size: 18px;
          }
          .grand-total {
            border-top: 2px solid #333;
            padding-top: 10px;
            margin-top: 10px;
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .payment-info {
            background-color: #f9fafb;
            padding: 15px;
            margin: 20px 0;
            border-left: 4px solid #2563eb;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Header -->
          <div class="header">
            <div class="company-info">
              <h1>MedSupply Co.</h1>
              <p>Supplier Portal</p>
              <p>123 Medical Street, New York, NY 10001</p>
              <p>Phone: +1 234 567 8900</p>
              <p>Email: billing@medsupply.com</p>
            </div>
            <div class="invoice-info">
              <h2>INVOICE</h2>
              <p><strong>#${invoice.invoiceNumber}</strong></p>
              <span class="status-badge status-${invoice.paymentStatus.toLowerCase()}">
                ${invoice.paymentStatus}
              </span>
            </div>
          </div>

          <!-- Bill To / Invoice Details -->
          <div class="details-section">
            <div class="detail-box">
              <h3>Bill To</h3>
              <p><strong>${invoice.pharmacy}</strong></p>
              <p>SmartPharma Main</p>
              <p>456 Pharmacy Ave</p>
              <p>New York, NY 10002</p>
            </div>
            <div class="detail-box">
              <h3>Invoice Details</h3>
              <p><strong>Invoice Date:</strong> ${invoice.invoiceDate}</p>
              <p><strong>Due Date:</strong> ${invoice.dueDate}</p>
              <p><strong>Order ID:</strong> ${invoice.orderId}</p>
              ${invoice.paidDate ? `<p><strong>Paid Date:</strong> ${invoice.paidDate}</p>` : ''}
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.unitPrice.toFixed(2)}</td>
                  <td>$${(item.quantity * item.unitPrice).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Totals -->
          <div class="totals-section">
            <div class="total-row">
              <div class="total-label">Subtotal:</div>
              <div class="total-amount">$${invoice.subtotal.toFixed(2)}</div>
            </div>
            <div class="total-row">
              <div class="total-label">Tax (${invoice.taxRate}%):</div>
              <div class="total-amount">$${invoice.taxAmount.toFixed(2)}</div>
            </div>
            <div class="total-row grand-total">
              <div class="total-label">Total Amount:</div>
              <div class="total-amount">$${invoice.totalAmount.toFixed(2)}</div>
            </div>
          </div>

          ${invoice.paymentStatus === 'Paid' ? `
            <div class="payment-info">
              <h3 style="margin-bottom: 10px;">Payment Information</h3>
              <p><strong>Amount Paid:</strong> $${invoice.paidAmount?.toFixed(2)}</p>
              <p><strong>Payment Method:</strong> ${invoice.paymentMethod}</p>
              <p><strong>Payment Date:</strong> ${invoice.paidDate}</p>
              ${invoice.paymentNote ? `<p><strong>Note:</strong> ${invoice.paymentNote}</p>` : ''}
            </div>
          ` : `
            <div class="payment-info">
              <h3 style="margin-bottom: 10px;">Payment Instructions</h3>
              <p><strong>Bank Name:</strong> Bank of America</p>
              <p><strong>Account Number:</strong> 1234567890</p>
              <p><strong>Routing Number:</strong> 021000021</p>
              <p><strong>Reference:</strong> ${invoice.invoiceNumber}</p>
            </div>
          `}

          <!-- Footer -->
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>For any questions, please contact billing@medsupply.com</p>
            <p style="margin-top: 10px;">Generated on ${new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 12px 24px; background-color: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; margin-right: 10px;">
            Print / Save as PDF
          </button>
          <button onclick="window.close()" style="padding: 12px 24px; background-color: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
            Close
          </button>
        </div>
      </body>
      </html>
    `;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
  };

  // GET STATUS COLOR
  const getStatusColor = (status) => {
    const colors = {
      'Paid': { bg: '#dcfce7', text: '#166534' },
      'Pending': { bg: '#fef3c7', text: '#92400e' },
      'Overdue': { bg: '#fee2e2', text: '#991b1b' }
    };
    return colors[status] || colors['Pending'];
  };

  const totals = calculateTotals();

  return (
    <div className="invoice-payments-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Invoice & Payments</h1>
          <p>Manage invoices and track payments</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card total">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <p className="card-label">Total Revenue</p>
            <p className="card-value">Rs.{totals.total.toFixed(2)}</p>
          </div>
        </div>

        <div className="summary-card paid">
          <div className="card-icon">✓</div>
          <div className="card-content">
            <p className="card-label">Paid</p>
            <p className="card-value">Rs.{totals.paid.toFixed(2)}</p>
            <p className="card-count">
              {invoices.filter(i => i.paymentStatus === 'Paid').length} invoices
            </p>
          </div>
        </div>

        <div className="summary-card pending">
          <div className="card-icon">⏳</div>
          <div className="card-content">
            <p className="card-label">Pending</p>
            <p className="card-value">Rs.{totals.pending.toFixed(2)}</p>
            <p className="card-count">
              {invoices.filter(i => i.paymentStatus === 'Pending').length} invoices
            </p>
          </div>
        </div>

        <div className="summary-card overdue">
          <div className="card-icon">⚠️</div>
          <div className="card-content">
            <p className="card-label">Overdue</p>
            <p className="card-value">Rs.{totals.overdue.toFixed(2)}</p>
            <p className="card-count">
              {invoices.filter(i => i.paymentStatus === 'Overdue').length} invoices
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="All">All Invoices</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="invoices-table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <p>No invoices found</p>
          </div>
        ) : (
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Pharmacy</th>
                <th>Order ID</th>
                <th>Invoice Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const statusColor = getStatusColor(invoice.paymentStatus);
                return (
                  <tr key={invoice.id}>
                    <td className="invoice-number">{invoice.invoiceNumber}</td>
                    <td>{invoice.pharmacy}</td>
                    <td>{invoice.orderId}</td>
                    <td>{invoice.invoiceDate}</td>
                    <td>{invoice.dueDate}</td>
                    <td className="amount">Rs.{invoice.totalAmount.toFixed(2)}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: statusColor.bg,
                          color: statusColor.text
                        }}
                      >
                        {invoice.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="btn-view"
                          title="View Details"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => generatePDF(invoice)}
                          className="btn-download"
                          title="Download Receipt"
                        >
                          📥
                        </button>
                        {invoice.paymentStatus !== 'Paid' && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setPaymentAmount(invoice.totalAmount.toString());
                              setShowPaymentModal(true);
                            }}
                            className="btn-pay"
                            title="Record Payment"
                          >
                            💳
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && !showPaymentModal && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invoice Details</h2>
              <button onClick={() => setSelectedInvoice(null)} className="close-btn">×</button>
            </div>

            <div className="modal-body">
              <div className="invoice-detail-grid">
                <div className="detail-item">
                  <label>Invoice Number</label>
                  <p>{selectedInvoice.invoiceNumber}</p>
                </div>
                <div className="detail-item">
                  <label>Pharmacy</label>
                  <p>{selectedInvoice.pharmacy}</p>
                </div>
                <div className="detail-item">
                  <label>Order ID</label>
                  <p>{selectedInvoice.orderId}</p>
                </div>
                <div className="detail-item">
                  <label>Invoice Date</label>
                  <p>{selectedInvoice.invoiceDate}</p>
                </div>
                <div className="detail-item">
                  <label>Due Date</label>
                  <p>{selectedInvoice.dueDate}</p>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: getStatusColor(selectedInvoice.paymentStatus).bg,
                      color: getStatusColor(selectedInvoice.paymentStatus).text
                    }}
                  >
                    {selectedInvoice.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="items-section">
                <h3>Items</h3>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td>${item.unitPrice.toFixed(2)}</td>
                        <td>${(item.quantity * item.unitPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="totals-section">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>${selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="total-row">
                  <span>Tax ({selectedInvoice.taxRate}%):</span>
                  <span>${selectedInvoice.taxAmount.toFixed(2)}</span>
                </div>
                <div className="total-row grand-total">
                  <span>Total:</span>
                  <span>${selectedInvoice.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {selectedInvoice.paymentStatus === 'Paid' && (
                <div className="payment-info-box">
                  <h4>Payment Information</h4>
                  <p><strong>Paid Amount:</strong> ${selectedInvoice.paidAmount?.toFixed(2)}</p>
                  <p><strong>Payment Date:</strong> {selectedInvoice.paidDate}</p>
                  <p><strong>Payment Method:</strong> {selectedInvoice.paymentMethod}</p>
                  {selectedInvoice.paymentNote && (
                    <p><strong>Note:</strong> {selectedInvoice.paymentNote}</p>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => generatePDF(selectedInvoice)} className="btn-primary">
                Download Receipt
              </button>
              <button onClick={() => setSelectedInvoice(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="close-btn">×</button>
            </div>

            <div className="modal-body">
              <div className="payment-form">
                <div className="form-group">
                  <label>Invoice Number</label>
                  <input type="text" value={selectedInvoice.invoiceNumber} disabled />
                </div>

                <div className="form-group">
                  <label>Total Amount</label>
                  <input type="text" value={`$${selectedInvoice.totalAmount.toFixed(2)}`} disabled />
                </div>

                <div className="form-group">
                  <label>Payment Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Payment Method *</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Check">Check</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Online Payment">Online Payment</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Payment Note</label>
                  <textarea
                    rows="3"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Add any notes about this payment..."
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={recordPayment} className="btn-primary">
                Record Payment
              </button>
              <button onClick={() => setShowPaymentModal(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicePayments;