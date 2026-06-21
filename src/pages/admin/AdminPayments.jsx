import React, { useState, useEffect, useRef } from 'react';
import {
  collection, query, orderBy, getDocs, doc, updateDoc,
  Timestamp, where, addDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import Card from '../../components/Card';
import PageLayout from '../../components/PageLayout';
import ResponsiveTable from '../../components/ResponsiveTable';

/* ── Message Card System ── */
const MessageCard = ({ messages, removeMessage }) => (
  <div className="fixed top-5 right-5 z-[2000] flex flex-col gap-2 pointer-events-none">
    {messages.map((m) => {
      const styles = {
        success: 'bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800',
        error:   'bg-red-50 border-l-4 border-red-500 text-red-800',
        warning: 'bg-amber-50 border-l-4 border-amber-500 text-amber-800',
        info:    'bg-blue-50 border-l-4 border-blue-500 text-blue-800',
      };
      const icons  = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
      const iconBg = { success: 'bg-emerald-500', error: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-blue-500' };
      return (
        <div key={m.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg w-[90vw] max-w-[400px] pointer-events-auto ${styles[m.type]}`}
          style={{ animation: 'slideInRight 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-white text-xs font-bold flex-shrink-0 mt-0.5 ${iconBg[m.type]}`}>{icons[m.type]}</span>
          <p className="text-sm font-medium m-0 flex-1 leading-snug">{m.message}</p>
          <button onClick={() => removeMessage(m.id)} className="bg-transparent border-none cursor-pointer p-0 opacity-40 hover:opacity-80 text-lg leading-none flex-shrink-0">×</button>
        </div>
      );
    })}
  </div>
);

const AdminPayments = () => {
  const [payments, setPayments]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [statusFilter, setStatusFilter]       = useState('All');
  const [searchTerm, setSearchTerm]           = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [messages, setMessages]               = useState([]);
  const [receiptFile, setReceiptFile]         = useState(null);
  const [receiptPreview, setReceiptPreview]   = useState(null);
  const [receiptBase64, setReceiptBase64]     = useState(null);
  const [uploading, setUploading]             = useState(false);
  const fileInputRef                          = useRef(null);

  const statusOptions = ['All', 'PENDING', 'PAID', 'OVERDUE'];

  const showMessage = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setMessages(prev => [...prev, { id, type, message }]);
    setTimeout(() => removeMessage(id), 5000);
  };
  const removeMessage = (id) => setMessages(prev => prev.filter(m => m.id !== id));

  const handleReceiptChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(file.type)) { showMessage('Please select a JPG, PNG or PDF file.', 'error'); return; }
    if (file.size > 900 * 1024) { showMessage('File must be under 900KB.', 'error'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setReceiptBase64(base64); setReceiptFile(file);
      setReceiptPreview(file.type === 'application/pdf' ? 'pdf' : base64);
    };
    reader.onerror = () => showMessage('Failed to read file.', 'error');
    reader.readAsDataURL(file);
  };

  const clearReceipt = () => {
    setReceiptFile(null); setReceiptPreview(null); setReceiptBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadReceipt = (payment) => {
    if (!payment.receiptBase64) return;
    const link = document.createElement('a');
    link.href = payment.receiptBase64;
    link.download = payment.receiptName || 'receipt';
    document.body.appendChild(link); link.click(); link.remove();
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc')));
      const paymentsData = snapshot.docs.map(d => {
        const data = { id: d.id, ...d.data() };
        if (data.status === 'PENDING' && data.dueDate) {
          const dueDate = data.dueDate.toDate ? data.dueDate.toDate() : new Date(data.dueDate);
          if (dueDate < new Date()) { updateDoc(doc(db, 'payments', d.id), { status: 'OVERDUE' }); data.status = 'OVERDUE'; }
        }
        return data;
      });
      setPayments(paymentsData);
    } catch (error) {
      showMessage('Failed to load payments: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  const filteredPayments = payments.filter(payment => {
    const matchStatus = statusFilter === 'All' || payment.status === statusFilter;
    const matchSearch = !searchTerm ||
      payment.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.productName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total:        payments.length,
    pending:      payments.filter(p => p.status === 'PENDING').length,
    paid:         payments.filter(p => p.status === 'PAID').length,
    overdue:      payments.filter(p => p.status === 'OVERDUE').length,
    totalAmount:  payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    totalPaid:    payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + (p.amount || 0), 0),
    totalPending: payments.filter(p => p.status === 'PENDING' || p.status === 'OVERDUE').reduce((sum, p) => sum + (p.amount || 0), 0),
  };

  const findAndUpdateInvoice = async (payment, invoiceType, extraFields = {}) => {
    const tryQuery = async (...constraints) => {
      try { const snap = await getDocs(query(collection(db, 'invoices'), ...constraints)); return snap.docs; } catch { return []; }
    };
    let docs = [];
    if (payment.purchaseOrderId) docs = await tryQuery(where('purchaseOrderId', '==', payment.purchaseOrderId), where('invoiceType', '==', invoiceType));
    if (!docs.length && payment.orderId) docs = await tryQuery(where('orderId', '==', payment.orderId), where('invoiceType', '==', invoiceType));
    if (!docs.length && payment.orderId) docs = await tryQuery(where('poId', '==', payment.orderId), where('invoiceType', '==', invoiceType));
    if (docs.length > 0) {
      await updateDoc(doc(db, 'invoices', docs[0].id), { paymentStatus: 'Paid', paidAmount: payment.amount, paidDate: Timestamp.now(), paymentMethod: 'Bank Transfer', updatedAt: Timestamp.now(), ...extraFields });
      return true;
    }
    return false;
  };

  const markAsPaid = async (paymentId) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;
    if (!receiptBase64) { showMessage('Please upload a bank receipt before marking as paid.', 'warning'); return; }
    try {
      setUploading(true);
      const receiptFields = { receiptBase64, receiptName: receiptFile.name, receiptType: receiptFile.type, receiptSize: receiptFile.size };
      await updateDoc(doc(db, 'payments', paymentId), { status: 'PAID', paidDate: Timestamp.now(), updatedAt: Timestamp.now(), ...receiptFields });
      await findAndUpdateInvoice(payment, payment.paymentType === 'INITIAL' ? 'INITIAL' : 'FINAL', receiptFields);
      if (payment.paymentType === 'INITIAL') {
        await updateDoc(doc(db, 'purchaseOrders', payment.purchaseOrderId), { initialPaymentStatus: 'PAID', initialPaymentDate: Timestamp.now(), updatedAt: Timestamp.now() });
        await addDoc(collection(db, 'notifications'), { type: 'INITIAL_PAYMENT_PAID', recipientId: payment.supplierId, recipientType: 'supplier', purchaseOrderId: payment.purchaseOrderId, poId: payment.orderId, supplierId: payment.supplierId, supplierName: payment.supplierName, productName: payment.productName, message: `Initial payment of 50% has been made for order ${payment.orderId}. Please proceed with delivery.`, read: false, createdAt: Timestamp.now() });
      }
      if (payment.paymentType === 'FINAL') {
        await updateDoc(doc(db, 'purchaseOrders', payment.purchaseOrderId), { finalPaymentStatus: 'PAID', finalPaymentDate: Timestamp.now(), paymentStatus: 'COMPLETED', orderStatus: 'COMPLETED', updatedAt: Timestamp.now() });
        await addDoc(collection(db, 'notifications'), { type: 'FINAL_PAYMENT_PAID', recipientId: payment.supplierId, recipientType: 'supplier', purchaseOrderId: payment.purchaseOrderId, poId: payment.orderId, supplierId: payment.supplierId, supplierName: payment.supplierName, productName: payment.productName, message: `Final payment of 50% has been made for order ${payment.orderId}. All payments are now complete.`, read: false, createdAt: Timestamp.now() });
      }
      showMessage(payment.paymentType === 'INITIAL' ? 'Initial payment marked as paid! Supplier notified.' : 'Final payment marked as paid! Order complete.', 'success');
      clearReceipt(); fetchPayments(); setSelectedPayment(null);
    } catch (error) {
      showMessage('Failed to update payment: ' + error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return 'N/A';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return 0;
    const due = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
    return Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24));
  };

  const getStatusStyle = (status) => ({
    PENDING: 'bg-amber-100 text-amber-800',
    PAID:    'bg-emerald-100 text-emerald-800',
    OVERDUE: 'bg-red-100 text-red-800',
  }[status] || 'bg-gray-100 text-gray-600');

  const getPaymentTypeStyle = (type) => ({
    INITIAL: 'bg-violet-100 text-violet-800',
    FINAL:   'bg-blue-100 text-blue-800',
  }[type] || 'bg-gray-100 text-gray-600');

  const isPDF = (p) => p?.receiptType === 'application/pdf' || p?.receiptName?.toLowerCase().endsWith('.pdf');
  const handleCloseModal = () => { setSelectedPayment(null); clearReceipt(); };

  // ── Table columns for ResponsiveTable ──
  const columns = [
    {
      key: 'orderId', label: 'PO ID',
      render: (val) => <span className="font-mono font-semibold text-blue-600 text-sm">{val}</span>,
    },
    { key: 'supplierName', label: 'Supplier' },
    { key: 'productName',  label: 'Product'  },
    {
      key: 'paymentType', label: 'Payment Type',
      render: (val, row) => (
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${getPaymentTypeStyle(val)}`}>
          {row.paymentLabel || val || '—'}
        </span>
      ),
    },
    {
      key: 'quantity', label: 'Quantity',
      render: (val) => `${val} units`,
    },
    {
      key: 'amount', label: 'Amount',
      render: (val) => <span className="font-semibold text-emerald-600">Rs. {Number(val).toFixed(2)}</span>,
    },
    {
      key: 'dueDate', label: 'Due Date',
      render: (val) => formatDate(val),
    },
    {
      key: 'dueDate', label: 'Days Until Due',
      render: (val) => {
        const days = getDaysUntilDue(val);
        return (
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${days < 0 ? 'bg-red-100 text-red-800' : days <= 7 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
            {days < 0 ? `${Math.abs(days)}d overdue` : `${days} days`}
          </span>
        );
      },
    },
    {
      key: 'status', label: 'Status',
      render: (val) => (
        <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-semibold uppercase ${getStatusStyle(val)}`}>{val}</span>
      ),
    },
  ];

  const statCards = [
    { label: 'Total Payments', value: stats.total },
    { label: 'Pending',        value: stats.pending },
    { label: 'Paid',           value: stats.paid },
    { label: 'Overdue',        value: stats.overdue },
    { label: 'Total Amount',   value: `Rs. ${stats.totalAmount.toFixed(2)}` },
    { label: 'Total Paid',     value: `Rs. ${stats.totalPaid.toFixed(2)}` },
    { label: 'Total Pending',  value: `Rs. ${stats.totalPending.toFixed(2)}` },
  ];

  return (
    <PageLayout title="Payments Management" subtitle="Track and manage supplier payments">
      <MessageCard messages={messages} removeMessage={removeMessage} />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {statCards.map((card) => (
          <Card key={card.label} title={card.label} value={card.value} />
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm mb-4 md:mb-6">
        <input
          type="text"
          placeholder="Search by PO ID, Supplier, or Product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-sm mb-4 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
        />
        <div className="flex gap-2 flex-wrap">
          {statusOptions.map(status => (
            <button key={status} onClick={() => setStatusFilter(status)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full border-2 text-xs md:text-sm font-medium cursor-pointer transition-all
                ${statusFilter === status ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table — ResponsiveTable handles desktop/mobile automatically */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        <ResponsiveTable
          columns={columns}
          data={filteredPayments}
          keyField="id"
          cardTitle="orderId"
          cardBadge="status"
          loading={loading}
          emptyMessage="No payments found"
          actions={(row) => (
            <div className="flex gap-2">
              <button onClick={() => { setSelectedPayment(row); clearReceipt(); }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg border-none cursor-pointer">
                View
              </button>
              {row.status !== 'PAID' && (
                <button onClick={() => { setSelectedPayment(row); clearReceipt(); }}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg border-none cursor-pointer">
                  Pay
                </button>
              )}
            </div>
          )}
        />
      </div>

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-[1000] p-0 md:p-5"
          style={{ animation: 'fadeIn 0.2s ease-out' }} onClick={handleCloseModal}>
          <div className="bg-white w-full md:rounded-2xl md:max-w-[750px] max-h-[95vh] overflow-y-auto shadow-2xl rounded-t-2xl"
            style={{ animation: 'slideUp 0.3s ease-out' }} onClick={(e) => e.stopPropagation()}>

            <div className="flex justify-between items-center px-5 md:px-7 py-4 md:py-6 border-b-2 border-slate-100">
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 m-0">Payment Details</h2>
              <button onClick={handleCloseModal} className="w-8 h-8 flex items-center justify-center text-3xl text-slate-400 bg-transparent border-none cursor-pointer rounded-lg hover:bg-slate-100">×</button>
            </div>

            <div className="p-5 md:p-7">
              {/* Order ID + badges */}
              <div className="flex flex-wrap justify-between items-center gap-2 mb-5 pb-4 border-b-2 border-slate-100">
                <h3 className="text-lg md:text-xl font-bold text-blue-600 font-mono m-0">{selectedPayment.orderId}</h3>
                <div className="flex gap-2 flex-wrap">
                  {selectedPayment.paymentType && (
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${getPaymentTypeStyle(selectedPayment.paymentType)}`}>
                      {selectedPayment.paymentLabel || selectedPayment.paymentType}
                    </span>
                  )}
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase ${getStatusStyle(selectedPayment.status)}`}>
                    {selectedPayment.status}
                  </span>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-6">
                {[
                  { label: 'Supplier',           value: selectedPayment.supplierName },
                  { label: 'Product',            value: selectedPayment.productName },
                  { label: 'Quantity',           value: `${selectedPayment.quantity} units` },
                  { label: 'Payment Amount',     value: `Rs. ${Number(selectedPayment.amount).toFixed(2)}`, highlight: 'text-emerald-600 text-xl font-bold' },
                  { label: 'Total Order Amount', value: selectedPayment.totalOrderAmount ? `Rs. ${Number(selectedPayment.totalOrderAmount).toFixed(2)}` : 'N/A' },
                  { label: 'Payment Type',       value: selectedPayment.paymentLabel || selectedPayment.paymentType || '—' },
                  { label: 'Created Date',       value: formatDate(selectedPayment.createdAt) },
                  { label: 'Due Date',           value: formatDate(selectedPayment.dueDate) },
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
                    <label className="text-[13px] text-slate-500 font-medium mb-1">{item.label}</label>
                    <p className={`m-0 text-[15px] text-slate-800 font-medium ${item.highlight || ''}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Existing receipt */}
              {selectedPayment.status === 'PAID' && selectedPayment.receiptBase64 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5">
                  <p className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2"><span>✓</span> Bank Receipt Attached</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">{isPDF(selectedPayment) ? '📄' : '🖼️'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-emerald-800 m-0 truncate">{selectedPayment.receiptName || 'Receipt'}</p>
                      <p className="text-xs text-emerald-600 m-0 mt-0.5">{isPDF(selectedPayment) ? 'PDF' : 'Image'} · {((selectedPayment.receiptSize || 0) / 1024).toFixed(0)} KB</p>
                    </div>
                    <button onClick={() => downloadReceipt(selectedPayment)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg border-none cursor-pointer flex-shrink-0">⬇ Download</button>
                  </div>
                  {!isPDF(selectedPayment) && (
                    <img src={selectedPayment.receiptBase64} alt="Receipt" className="mt-4 w-full max-h-[200px] object-contain rounded-lg border border-emerald-200" />
                  )}
                </div>
              )}

              {/* Hints */}
              {selectedPayment.paymentType === 'INITIAL' && selectedPayment.status !== 'PAID' && (
                <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 mb-5">
                  <p className="text-[13px] text-violet-800 font-medium m-0">This is the initial 50% payment. Once paid, the supplier will be notified to proceed with delivery.</p>
                </div>
              )}
              {selectedPayment.paymentType === 'FINAL' && selectedPayment.status !== 'PAID' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
                  <p className="text-[13px] text-blue-800 font-medium m-0">This is the final 50% payment. Once paid, all transactions for this order will be complete.</p>
                </div>
              )}

              {/* Upload Receipt */}
              {selectedPayment.status !== 'PAID' && (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 mb-5">
                  <p className="text-sm font-semibold text-slate-700 mb-1">Upload Bank Receipt <span className="text-red-500">*</span></p>
                  <p className="text-[13px] text-slate-500 mb-4">PDF, JPG or PNG · Max 900KB</p>
                  {!receiptPreview ? (
                    <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-3 py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                      <span className="text-4xl">📎</span>
                      <p className="text-sm font-medium text-slate-700">Click to upload payment slip</p>
                      <span className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg">Browse Files</span>
                    </div>
                  ) : receiptPreview === 'pdf' ? (
                    <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-3 border border-blue-200">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0"><span className="text-2xl">📄</span></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-blue-800 m-0 truncate">{receiptFile?.name}</p>
                        <p className="text-xs text-blue-600 m-0 mt-1">PDF · {((receiptFile?.size || 0) / 1024).toFixed(0)} KB · Ready</p>
                      </div>
                      <button onClick={clearReceipt} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 border-none cursor-pointer flex-shrink-0">×</button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <img src={receiptPreview} alt="Receipt preview" className="w-full max-h-[200px] object-contain rounded-xl border-2 border-slate-200" />
                        <button onClick={clearReceipt} className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-red-500 text-white border-none cursor-pointer text-sm font-bold shadow-md">×</button>
                      </div>
                      <div className="mt-2 px-3 py-2 bg-slate-50 rounded-lg flex items-center gap-2">
                        <span>🖼️</span>
                        <p className="text-xs text-slate-600 m-0 truncate">{receiptFile?.name} · {((receiptFile?.size || 0) / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                  )}
                  {receiptPreview && (
                    <button onClick={() => fileInputRef.current?.click()} className="mt-3 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg border-none cursor-pointer">Replace file</button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/jpg,application/pdf" onChange={handleReceiptChange} className="hidden" />
                </div>
              )}

              {/* Mark as Paid */}
              {selectedPayment.status !== 'PAID' && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
                  <button onClick={() => markAsPaid(selectedPayment.id)} disabled={uploading || !receiptBase64}
                    className={`w-full py-3.5 px-6 text-white border-none rounded-lg text-base font-semibold cursor-pointer transition-all mb-2
                      ${uploading || !receiptBase64 ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-0.5 hover:shadow-lg'}`}>
                    {uploading ? '⏳ Saving...' : '✓ Mark as Paid'}
                  </button>
                  <p className="m-0 text-[13px] text-blue-700">
                    {receiptBase64 ? 'Receipt ready — click to complete payment' : 'Upload a bank receipt to enable payment confirmation'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn       { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp      { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </PageLayout>
  );
};

export default AdminPayments;