import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, doc, updateDoc, addDoc,
  query, orderBy, where, Timestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../services/firebase';
import {
  MdCheckCircle, MdHourglassEmpty,
  MdWarning, MdVisibility, MdDownload,
  MdLocalShipping, MdClose, MdError, MdInfo,
} from 'react-icons/md';
import Card from '../../components/Card';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Toast notification component
const Toast = ({ toasts, removeToast }) => (
  <div className="fixed top-5 right-5 z-[2000] flex flex-col gap-2">
    {toasts.map((t) => {
      const styles = {
        success: 'bg-emerald-50 border-emerald-400 text-emerald-800',
        error:   'bg-red-50 border-red-400 text-red-800',
        warning: 'bg-amber-50 border-amber-400 text-amber-800',
        info:    'bg-blue-50 border-blue-400 text-blue-800',
      };
      const icons = {
        success: <MdCheckCircle size={20} className="text-emerald-500 flex-shrink-0" />,
        error:   <MdError size={20} className="text-red-500 flex-shrink-0" />,
        warning: <MdWarning size={20} className="text-amber-500 flex-shrink-0" />,
        info:    <MdInfo size={20} className="text-blue-500 flex-shrink-0" />,
      };
      return (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg min-w-[280px] max-w-[360px] ${styles[t.type]}`}
          style={{ animation: 'slideInRight 0.3s ease' }}
        >
          {icons[t.type]}
          <p className="text-sm font-medium m-0 flex-1">{t.message}</p>
          <button
            onClick={() => removeToast(t.id)}
            className="bg-transparent border-none cursor-pointer p-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <MdClose size={16} />
          </button>
        </div>
      );
    })}
  </div>
);

const InvoicePayments = () => {
  const [supplierId, setSupplierId]             = useState(null);
  const [invoices, setInvoices]                 = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [filterStatus, setFilterStatus]         = useState('All');
  const [selectedInvoice, setSelectedInvoice]   = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount]       = useState('');
  const [paymentMethod, setPaymentMethod]       = useState('Bank Transfer');
  const [paymentNote, setPaymentNote]           = useState('');
  const [toasts, setToasts]                     = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  /* ── AUTH ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setSupplierId(user ? user.uid : null);
    });
    return () => unsub();
  }, []);

  /* ── FETCH INVOICES ── */
  // FIX: Fetch ALL invoices for this supplier without a paymentStatus filter,
  // then filter client-side. This ensures FINAL invoices that were just marked
  // Paid by the admin are always included — previously a Firestore composite
  // index or missing field could silently drop them.
  const fetchInvoices = async () => {
    if (!supplierId) return;
    try {
      setLoading(true);

      // Always fetch all invoices for this supplier first
      const baseQuery = query(
        collection(db, 'invoices'),
        where('supplierId', '==', supplierId),
        orderBy('invoiceDate', 'desc')
      );

      const snapshot = await getDocs(baseQuery);
      const allInvoices = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id, ...data,
          invoiceDate: data.invoiceDate?.toDate
            ? data.invoiceDate.toDate().toISOString().split('T')[0]
            : data.invoiceDate,
          dueDate: data.dueDate?.toDate
            ? data.dueDate.toDate().toISOString().split('T')[0]
            : data.dueDate,
          paidDate: data.paidDate?.toDate
            ? data.paidDate.toDate().toISOString().split('T')[0]
            : null,
        };
      });

      // FIX: Apply status filter client-side so we never miss records due to
      // Firestore composite index issues or field name mismatches
      const filtered = filterStatus === 'All'
        ? allInvoices
        : allInvoices.filter((inv) => inv.paymentStatus === filterStatus);

      setInvoices(filtered);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      showToast('Failed to load invoices: ' + error.message, 'error');
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [filterStatus, supplierId]);

  const calculateTotals = () => ({
    total:   invoices.reduce((s, i) => s + (i.totalAmount || 0), 0),
    paid:    invoices.filter(i => i.paymentStatus === 'Paid').reduce((s, i) => s + (i.totalAmount || 0), 0),
    pending: invoices.filter(i => i.paymentStatus === 'Pending').reduce((s, i) => s + (i.totalAmount || 0), 0),
    overdue: invoices.filter(i => i.paymentStatus === 'Overdue').reduce((s, i) => s + (i.totalAmount || 0), 0),
  });

  /* ── RECORD PAYMENT ── */
  const recordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) {
      showToast('Please enter payment amount', 'warning');
      return;
    }
    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedInvoice.totalAmount) {
      showToast('Invalid payment amount', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'invoices', selectedInvoice.id), {
        paymentStatus: 'Paid', paidAmount: amount, paidDate: Timestamp.now(),
        paymentMethod, paymentNote, updatedAt: Timestamp.now(),
      });
      await addDoc(collection(db, 'payments'), {
        invoiceId: selectedInvoice.id, invoiceNumber: selectedInvoice.invoiceNumber,
        amount, paymentMethod, paymentDate: Timestamp.now(),
        note: paymentNote, pharmacy: selectedInvoice.pharmacy, createdAt: Timestamp.now(),
      });
      showToast('Payment recorded successfully!', 'success');
      setShowPaymentModal(false); setPaymentAmount('');
      setPaymentNote(''); setSelectedInvoice(null);
      fetchInvoices();
    } catch (error) {
      console.error('Error recording payment:', error);
      showToast('Failed to record payment: ' + error.message, 'error');
    }
  };

  /* ── GENERATE & DOWNLOAD PDF ── */
  const generatePDF = async (invoice) => {
    try {
      showToast('Generating PDF...', 'info');
      const response = await fetch(`${API_BASE}/supplier/invoices/generate-pdf`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber:    invoice.invoiceNumber,
          pharmacy:         invoice.pharmacy,
          invoiceType:      invoice.invoiceType,
          invoiceLabel:     invoice.invoiceLabel,
          paymentStatus:    invoice.paymentStatus,
          invoiceDate:      invoice.invoiceDate,
          dueDate:          invoice.dueDate,
          items:            invoice.items            || [],
          totalAmount:      invoice.totalAmount,
          subtotal:         invoice.subtotal,
          taxRate:          invoice.taxRate,
          taxAmount:        invoice.taxAmount,
          totalOrderAmount: invoice.totalOrderAmount,
          paidAmount:       invoice.paidAmount,
          paidDate:         invoice.paidDate,
          paymentMethod:    invoice.paymentMethod,
          paymentNote:      invoice.paymentNote,
        }),
      });

      // FIX: Handle non-ok responses by reading the JSON error body
      if (!response.ok) {
        let errMsg = `Server error ${response.status}`;
        try {
          const errJson = await response.json();
          errMsg = errJson.message || errMsg;
        } catch (_) { /* response wasn't JSON */ }
        throw new Error(errMsg);
      }

      const blob    = await response.blob();
      const url     = window.URL.createObjectURL(blob);
      const link    = document.createElement('a');
      link.href     = url;
      link.download = `Invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('PDF downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF: ' + error.message, 'error');
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Paid':    return 'bg-emerald-100 text-emerald-800';
      case 'Pending': return 'bg-amber-100 text-amber-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      default:        return 'bg-gray-100 text-gray-600';
    }
  };

  const getInvoiceTypeStyle = (type) => {
    switch (type) {
      case 'INITIAL': return 'bg-violet-100 text-violet-800';
      case 'FINAL':   return 'bg-blue-100 text-blue-800';
      default:        return 'bg-gray-100 text-gray-600';
    }
  };

  const totals = calculateTotals();

  const ModalWrap = ({ onClose, children }) => (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5"
      style={{ animation: 'fadeIn 0.2s' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-[800px] max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ animation: 'slideUp 0.3s' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  const inputCls    = "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10";
  const disabledCls = "bg-slate-100 cursor-not-allowed";

  // FIX: Count from ALL invoices regardless of current filter for accurate summary cards
  const [allInvoices, setAllInvoices] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      if (!supplierId) return;
      try {
        const snap = await getDocs(query(
          collection(db, 'invoices'),
          where('supplierId', '==', supplierId),
        ));
        setAllInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (_) {}
    };
    fetchAll();
  }, [supplierId]);

  const paidCount    = allInvoices.filter(i => i.paymentStatus === 'Paid').length;
  const pendingCount = allInvoices.filter(i => i.paymentStatus === 'Pending').length;
  const overdueCount = allInvoices.filter(i => i.paymentStatus === 'Overdue').length;

  const allTotals = {
    total:   allInvoices.reduce((s, i) => s + (i.totalAmount || 0), 0),
    paid:    allInvoices.filter(i => i.paymentStatus === 'Paid').reduce((s, i) => s + (i.totalAmount || 0), 0),
    pending: allInvoices.filter(i => i.paymentStatus === 'Pending').reduce((s, i) => s + (i.totalAmount || 0), 0),
    overdue: allInvoices.filter(i => i.paymentStatus === 'Overdue').reduce((s, i) => s + (i.totalAmount || 0), 0),
  };

  return (
    <div className="p-6 bg-slate-100 min-h-screen">

      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 mb-1">Invoice & Payments</h1>
        <p className="text-slate-500 text-base">Track payments received from MediCareX</p>
      </div>

      {/* Summary Cards — always show totals across ALL invoices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <Card title="Total Revenue"                          value={`Rs.${allTotals.total.toFixed(2)}`} />
        <Card title={`Received (${paidCount} invoices)`}    value={`Rs.${allTotals.paid.toFixed(2)}`} />
        <Card title={`Pending (${pendingCount} invoices)`}  value={`Rs.${allTotals.pending.toFixed(2)}`} />
        <Card title={`Overdue (${overdueCount} invoices)`}  value={`Rs.${allTotals.overdue.toFixed(2)}`} />
      </div>

      {/* Delivery unlock banner */}
      {allInvoices.some(inv => inv.invoiceType === 'INITIAL' && inv.paymentStatus === 'Pending') && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6 flex items-center gap-3">
          <MdLocalShipping size={22} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium m-0">
            You have pending initial payments. Delivery for those orders can only begin once MediCareX completes the initial 50% payment.
          </p>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm cursor-pointer min-w-[200px] focus:outline-none focus:border-blue-500"
        >
          <option value="All">All Invoices</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-20 text-center">
            <MdDownload size={56} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-base">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  {['Invoice #', 'Pharmacy', 'Order ID', 'Type', 'Invoice Date', 'Due Date', 'Amount', 'Status', 'Delivery', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[13px] font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-semibold text-blue-600 text-sm">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-4 text-sm text-slate-800">{invoice.pharmacy}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{invoice.orderId}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${getInvoiceTypeStyle(invoice.invoiceType)}`}>
                        {invoice.invoiceLabel || invoice.invoiceType || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{invoice.invoiceDate}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{invoice.dueDate}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-800">Rs.{Number(invoice.totalAmount).toFixed(2)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(invoice.paymentStatus)}`}>
                        {invoice.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {invoice.invoiceType === 'INITIAL' ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                          ${invoice.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'}`}>
                          <MdLocalShipping size={13} />
                          {invoice.paymentStatus === 'Paid' ? 'Unlocked' : 'Locked'}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          title="View Details"
                          onClick={() => setSelectedInvoice(invoice)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 border-none cursor-pointer transition-colors"
                        >
                          <MdVisibility size={16} />
                        </button>
                        <button
                          title="Download Receipt"
                          onClick={() => generatePDF(invoice)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-600 border-none cursor-pointer transition-colors"
                        >
                          <MdDownload size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && !showPaymentModal && (
        <ModalWrap onClose={() => setSelectedInvoice(null)}>
          <div className="flex justify-between items-center px-6 py-5 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Invoice Details</h2>
              <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-semibold ${getInvoiceTypeStyle(selectedInvoice.invoiceType)}`}>
                {selectedInvoice.invoiceLabel || selectedInvoice.invoiceType}
              </span>
            </div>
            <button onClick={() => setSelectedInvoice(null)} className="w-8 h-8 flex items-center justify-center text-3xl text-slate-400 bg-transparent border-none cursor-pointer rounded-lg hover:bg-slate-100 transition-colors">×</button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-5 mb-6">
              {[
                { label: 'Invoice Number', value: selectedInvoice.invoiceNumber },
                { label: 'Pharmacy',       value: selectedInvoice.pharmacy },
                { label: 'Order ID',       value: selectedInvoice.orderId },
                { label: 'Invoice Date',   value: selectedInvoice.invoiceDate },
                { label: 'Due Date',       value: selectedInvoice.dueDate },
              ].map((item) => (
                <div key={item.label}>
                  <label className="block text-xs text-slate-500 font-medium mb-1">{item.label}</label>
                  <p className="text-base text-slate-800 font-medium m-0">{item.value}</p>
                </div>
              ))}
              <div>
                <label className="block text-xs text-slate-500 font-medium mb-1">Status</label>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(selectedInvoice.paymentStatus)}`}>
                  {selectedInvoice.paymentStatus}
                </span>
              </div>
            </div>

            {selectedInvoice.invoiceType === 'INITIAL' && (
              <div className={`rounded-lg p-4 mb-6 border ${selectedInvoice.paymentStatus === 'Paid'
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <MdLocalShipping size={18} className={selectedInvoice.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'} />
                  <p className={`text-[13px] font-semibold m-0 ${selectedInvoice.paymentStatus === 'Paid' ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {selectedInvoice.paymentStatus === 'Paid'
                      ? 'Delivery Unlocked — You can proceed with delivery'
                      : 'Delivery Locked — Waiting for initial payment from MediCareX'}
                  </p>
                </div>
                <p className={`text-[12px] m-0 ${selectedInvoice.paymentStatus === 'Paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {selectedInvoice.paymentStatus === 'Paid'
                    ? 'Go to the Delivery Status page to update the delivery progress.'
                    : 'Once MediCareX pays the initial 50%, you will be able to start the delivery process.'}
                </p>
              </div>
            )}

            {selectedInvoice.invoiceType === 'FINAL' && (
              <div className={`rounded-lg p-4 mb-6 border ${selectedInvoice.paymentStatus === 'Paid'
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-blue-50 border-blue-200'}`}>
                <p className={`text-[13px] font-semibold m-0 ${selectedInvoice.paymentStatus === 'Paid' ? 'text-emerald-800' : 'text-blue-800'}`}>
                  {selectedInvoice.paymentStatus === 'Paid'
                    ? 'Final payment received — all transactions complete'
                    : 'Final payment pending — MediCareX will pay this after order receipt'}
                </p>
              </div>
            )}

            <h3 className="text-lg font-semibold text-slate-800 mb-4">Items</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    {['Product', 'Quantity', 'Unit Price', 'Total'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 border-b border-slate-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.items || []).map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-none">
                      <td className="px-3 py-3 text-sm text-slate-800">{item.productName}</td>
                      <td className="px-3 py-3 text-sm text-slate-700">{item.quantity}</td>
                      <td className="px-3 py-3 text-sm text-slate-700">Rs.{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-800">Rs.{(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between py-2 text-sm text-slate-700">
                <span>Subtotal:</span>
                <span>Rs.{Number(selectedInvoice.subtotal || selectedInvoice.totalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 text-sm text-slate-700">
                <span>Tax ({selectedInvoice.taxRate || 0}%):</span>
                <span>Rs.{Number(selectedInvoice.taxAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-3 mt-2 border-t-2 border-slate-200 text-lg font-bold text-blue-600">
                <span>Total:</span><span>Rs.{Number(selectedInvoice.totalAmount).toFixed(2)}</span>
              </div>
              {selectedInvoice.totalOrderAmount && (
                <p className="text-xs text-slate-400 mt-2 text-right">
                  Full order total: Rs.{Number(selectedInvoice.totalOrderAmount).toFixed(2)}
                </p>
              )}
            </div>

            {selectedInvoice.paymentStatus === 'Paid' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-3">Payment Information</h4>
                {[
                  { label: 'Paid Amount',    value: `Rs.${Number(selectedInvoice.paidAmount || selectedInvoice.totalAmount).toFixed(2)}` },
                  { label: 'Payment Date',   value: selectedInvoice.paidDate },
                  { label: 'Payment Method', value: selectedInvoice.paymentMethod },
                  ...(selectedInvoice.paymentNote ? [{ label: 'Note', value: selectedInvoice.paymentNote }] : []),
                ].map((item) => (
                  <p key={item.label} className="text-sm text-blue-700 mb-1 m-0">
                    <strong>{item.label}:</strong> {item.value}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
            <button onClick={() => generatePDF(selectedInvoice)} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg border-none cursor-pointer transition-colors">
              Download Receipt
            </button>
            <button onClick={() => setSelectedInvoice(null)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg border-none cursor-pointer transition-colors">
              Close
            </button>
          </div>
        </ModalWrap>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <ModalWrap onClose={() => setShowPaymentModal(false)}>
          <div className="flex justify-between items-center px-6 py-5 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800">Record Payment</h2>
            <button onClick={() => setShowPaymentModal(false)} className="w-8 h-8 flex items-center justify-center text-3xl text-slate-400 bg-transparent border-none cursor-pointer rounded-lg hover:bg-slate-100 transition-colors">×</button>
          </div>

          <div className="p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Invoice Number</label>
              <input type="text" value={selectedInvoice.invoiceNumber} disabled className={`${inputCls} ${disabledCls}`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Total Amount</label>
              <input type="text" value={`Rs.${Number(selectedInvoice.totalAmount).toFixed(2)}`} disabled className={`${inputCls} ${disabledCls}`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Payment Amount *</label>
              <input type="number" step="0.01" placeholder="0.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Payment Method *</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputCls}>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Check">Check</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Online Payment">Online Payment</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Payment Note</label>
              <textarea rows={3} placeholder="Add any notes..." value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} className={`${inputCls} resize-none`} />
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
            <button onClick={recordPayment} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg border-none cursor-pointer transition-colors">
              Record Payment
            </button>
            <button onClick={() => setShowPaymentModal(false)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg border-none cursor-pointer transition-colors">
              Cancel
            </button>
          </div>
        </ModalWrap>
      )}

      <style>{`
        @keyframes fadeIn      { from{opacity:0}                              to{opacity:1} }
        @keyframes slideUp     { from{transform:translateY(20px);opacity:0}   to{transform:translateY(0);opacity:1} }
        @keyframes slideInRight{ from{transform:translateX(60px);opacity:0}   to{transform:translateX(0);opacity:1} }
      `}</style>
    </div>
  );
};

export default InvoicePayments;