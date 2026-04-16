import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  where,
  addDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);

  const statusOptions = ['All', 'PENDING', 'PAID', 'OVERDUE'];

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const paymentsQuery = query(
        collection(db, 'payments'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(paymentsQuery);
      const paymentsData = snapshot.docs.map(d => {
        const data = { id: d.id, ...d.data() };
        if (data.status === 'PENDING' && data.dueDate) {
          const dueDate = data.dueDate.toDate ? data.dueDate.toDate() : new Date(data.dueDate);
          if (dueDate < new Date()) {
            updateDoc(doc(db, 'payments', d.id), { status: 'OVERDUE' });
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

  useEffect(() => { fetchPayments(); }, []);

  const filteredPayments = payments.filter(payment => {
    const matchStatus = statusFilter === 'All' || payment.status === statusFilter;
    const matchSearch = searchTerm === '' ||
      payment.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.productName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: payments.length,
    pending: payments.filter(p => p.status === 'PENDING').length,
    paid: payments.filter(p => p.status === 'PAID').length,
    overdue: payments.filter(p => p.status === 'OVERDUE').length,
    totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    totalPaid: payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + (p.amount || 0), 0),
    totalPending: payments.filter(p => p.status === 'PENDING' || p.status === 'OVERDUE').reduce((sum, p) => sum + (p.amount || 0), 0),
  };

  const markAsPaid = async (paymentId) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    const confirmMsg = payment.paymentType === 'INITIAL'
      ? 'Mark initial 50% payment as PAID?\n\nThis will notify the supplier to proceed with delivery.'
      : 'Mark final 50% payment as PAID?\n\nThis will complete all payments for this order.';

    if (!window.confirm(confirmMsg)) return;

    try {
      // Mark the payment as PAID
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'PAID',
        paidDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Update matching invoice on supplier side
      const invoiceType = payment.paymentType === 'INITIAL' ? 'INITIAL' : 'FINAL';
      const invoicesSnap = await getDocs(
        query(
          collection(db, 'invoices'),
          where('purchaseOrderId', '==', payment.purchaseOrderId),
          where('invoiceType', '==', invoiceType)
        )
      );

      if (!invoicesSnap.empty) {
        await updateDoc(doc(db, 'invoices', invoicesSnap.docs[0].id), {
          paymentStatus: 'Paid',
          paidAmount: payment.amount,
          paidDate: Timestamp.now(),
          paymentMethod: 'Bank Transfer',
          updatedAt: Timestamp.now(),
        });
      }

      // If this is the INITIAL payment, update the purchaseOrder and notify supplier to deliver
      if (payment.paymentType === 'INITIAL') {
        await updateDoc(doc(db, 'purchaseOrders', payment.purchaseOrderId), {
          initialPaymentStatus: 'PAID',
          initialPaymentDate: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        await addDoc(collection(db, 'notifications'), {
          type: 'INITIAL_PAYMENT_PAID',
          recipientId: payment.supplierId,
          recipientType: 'supplier',
          purchaseOrderId: payment.purchaseOrderId,
          poId: payment.orderId,
          supplierId: payment.supplierId,
          supplierName: payment.supplierName,
          productName: payment.productName,
          message: `Initial payment of 50% has been made for order ${payment.orderId}. Please proceed with delivery.`,
          read: false,
          createdAt: Timestamp.now(),
        });
      }

      // If this is the FINAL payment, notify supplier all payments are complete
      // If this is the FINAL payment, complete the order + notify supplier
if (payment.paymentType === 'FINAL') {

  // ✅ NEW: Mark purchase order as fully completed
  await updateDoc(doc(db, 'purchaseOrders', payment.purchaseOrderId), {
    finalPaymentStatus: 'PAID',
    finalPaymentDate: Timestamp.now(),
    paymentStatus: 'COMPLETED',   // 🔥 IMPORTANT
    orderStatus: 'COMPLETED',     // 🔥 IMPORTANT
    updatedAt: Timestamp.now(),
  });

  // Notify supplier
  await addDoc(collection(db, 'notifications'), {
    type: 'FINAL_PAYMENT_PAID',
    recipientId: payment.supplierId,
    recipientType: 'supplier',
    purchaseOrderId: payment.purchaseOrderId,
    poId: payment.orderId,
    supplierId: payment.supplierId,
    supplierName: payment.supplierName,
    productName: payment.productName,
    message: `Final payment of 50% has been made for order ${payment.orderId}. All payments are now complete.`,
    read: false,
    createdAt: Timestamp.now(),
  });
}

      const successMsg = payment.paymentType === 'INITIAL'
        ? 'Initial payment marked as paid!\n\nSupplier has been notified to proceed with delivery.'
        : 'Final payment marked as paid!\n\nAll payments for this order are now complete.';

      alert(successMsg);
      fetchPayments();
      setSelectedPayment(null);
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      alert('Failed to update payment: ' + error.message);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return 0;
    const due = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
    return Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24));
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-800';
      case 'PAID':    return 'bg-emerald-100 text-emerald-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      default:        return 'bg-gray-100 text-gray-600';
    }
  };

  const getPaymentTypeStyle = (type) => {
    switch (type) {
      case 'INITIAL': return 'bg-violet-100 text-violet-800';
      case 'FINAL':   return 'bg-blue-100 text-blue-800';
      default:        return 'bg-gray-100 text-gray-600';
    }
  };

  const statCards = [
    { label: 'Total Payments', value: stats.total,                           accent: 'border-slate-400' },
    { label: 'Pending',        value: stats.pending,                         accent: 'border-amber-400' },
    { label: 'Paid',           value: stats.paid,                            accent: 'border-emerald-400' },
    { label: 'Overdue',        value: stats.overdue,                         accent: 'border-red-400' },
    { label: 'Total Amount',   value: `Rs. ${stats.totalAmount.toFixed(2)}`,  accent: 'border-violet-400' },
    { label: 'Total Paid',     value: `Rs. ${stats.totalPaid.toFixed(2)}`,    accent: 'border-emerald-400' },
    { label: 'Total Pending',  value: `Rs. ${stats.totalPending.toFixed(2)}`, accent: 'border-amber-400' },
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen">

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Payments Management</h1>
        <p className="text-slate-500 text-[15px]">Track and manage supplier payments</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-5 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${card.accent} transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md`}
          >
            <p className="text-[13px] text-slate-500 font-medium mb-2">{card.label}</p>
            <p className="text-[26px] font-bold text-slate-800 leading-tight">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <input
          type="text"
          placeholder="Search by PO ID, Supplier, or Product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-[15px] mb-4 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />
        <div className="flex gap-2.5 flex-wrap">
          {statusOptions.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-full border-2 text-sm font-medium cursor-pointer transition-all duration-200
                ${statusFilter === status
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-lg">Loading payments...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-lg">No payments found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1000px]">
              <thead className="bg-slate-50">
                <tr>
                  {['PO ID', 'Supplier', 'Product', 'Payment Type', 'Quantity', 'Amount', 'Due Date', 'Days Until Due', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-4 text-left text-[13px] font-semibold text-slate-500 uppercase tracking-wide border-b-2 border-slate-200">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map(payment => {
                  const days = getDaysUntilDue(payment.dueDate);
                  return (
                    <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-4 py-4 font-mono font-semibold text-blue-600 text-sm">
                        {payment.orderId}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-800">{payment.supplierName}</td>
                      <td className="px-4 py-4 text-sm text-slate-800">{payment.productName}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${getPaymentTypeStyle(payment.paymentType)}`}>
                          {payment.paymentLabel || payment.paymentType || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-800">{payment.quantity} units</td>
                      <td className="px-4 py-4 text-sm font-semibold text-emerald-600">
                        Rs. {Number(payment.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-800">{formatDate(payment.dueDate)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold
                          ${days < 0
                            ? 'bg-red-100 text-red-800'
                            : days <= 7
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-500'
                          }`}>
                          {days < 0 ? `${Math.abs(days)} days overdue` : `${days} days`}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-semibold uppercase ${getStatusStyle(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedPayment(payment)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-md"
                          >
                            View
                          </button>
                          {payment.status !== 'PAID' && (
                            <button
                              onClick={() => markAsPaid(payment.id)}
                              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-md"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedPayment && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-5 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setSelectedPayment(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto shadow-2xl animate-[slideUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center px-7 py-6 border-b-2 border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800 m-0">Payment Details</h2>
              <button
                onClick={() => setSelectedPayment(null)}
                className="w-8 h-8 flex items-center justify-center text-3xl text-slate-400 bg-transparent border-none cursor-pointer rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-all duration-200"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-7">
              {/* PO ID + Status */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-slate-100">
                <h3 className="text-xl font-bold text-blue-600 font-mono m-0">
                  {selectedPayment.orderId}
                </h3>
                <div className="flex gap-2 items-center">
                  {selectedPayment.paymentType && (
                    <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-semibold ${getPaymentTypeStyle(selectedPayment.paymentType)}`}>
                      {selectedPayment.paymentLabel || selectedPayment.paymentType}
                    </span>
                  )}
                  <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-semibold uppercase ${getStatusStyle(selectedPayment.status)}`}>
                    {selectedPayment.status}
                  </span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-5 mb-6">
                {[
                  { label: 'Supplier',          value: selectedPayment.supplierName },
                  { label: 'Product',           value: selectedPayment.productName },
                  { label: 'Quantity',          value: `${selectedPayment.quantity} units` },
                  { label: 'Payment Amount',    value: `Rs. ${Number(selectedPayment.amount).toFixed(2)}`, highlight: 'text-emerald-600 text-xl font-bold' },
                  { label: 'Total Order Amount', value: selectedPayment.totalOrderAmount ? `Rs. ${Number(selectedPayment.totalOrderAmount).toFixed(2)}` : 'N/A' },
                  { label: 'Payment Type',      value: selectedPayment.paymentLabel || selectedPayment.paymentType || '—' },
                  { label: 'Created Date',      value: formatDate(selectedPayment.createdAt) },
                  { label: 'Due Date',          value: formatDate(selectedPayment.dueDate) },
                  ...(selectedPayment.paidDate ? [{ label: 'Paid Date', value: formatDate(selectedPayment.paidDate) }] : []),
                  {
                    label: 'Days Until Due',
                    value: getDaysUntilDue(selectedPayment.dueDate) < 0
                      ? `${Math.abs(getDaysUntilDue(selectedPayment.dueDate))} days overdue`
                      : `${getDaysUntilDue(selectedPayment.dueDate)} days`,
                    highlight: getDaysUntilDue(selectedPayment.dueDate) < 0 ? 'text-red-500 font-semibold' : '',
                  },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col">
                    <label className="text-[13px] text-slate-500 font-medium mb-1.5">{item.label}</label>
                    <p className={`m-0 text-[15px] text-slate-800 font-medium ${item.highlight || ''}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Context note for payment type */}
              {selectedPayment.paymentType === 'INITIAL' && selectedPayment.status !== 'PAID' && (
                <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 mb-5">
                  <p className="text-[13px] text-violet-800 font-medium m-0">
                    This is the initial 50% payment. Once paid, the supplier will be notified to proceed with delivery.
                  </p>
                </div>
              )}
              {selectedPayment.paymentType === 'FINAL' && selectedPayment.status !== 'PAID' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
                  <p className="text-[13px] text-blue-800 font-medium m-0">
                    This is the final 50% payment due after order receipt. Once paid, all transactions for this order will be complete.
                  </p>
                </div>
              )}

              {/* Mark as Paid */}
              {selectedPayment.status !== 'PAID' && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 text-center">
                  <button
                    onClick={() => markAsPaid(selectedPayment.id)}
                    className="w-full py-3.5 px-6 bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-lg text-base font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg mb-2"
                  >
                    ✓ Mark as Paid
                  </button>
                  <p className="m-0 text-[13px] text-blue-700">
                    Click to record this payment as completed
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keyframe animations via style tag */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AdminPayments;