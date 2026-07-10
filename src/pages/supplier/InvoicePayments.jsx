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

const API_BASE = `${import.meta.env.VITE_API_URL_RAILWAY || 'http://localhost:5000'}/api`;

const fmtRs = (n) =>
  `Rs. ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ── Toast Notification System ── */
const TOAST_CONFIG = {
  success: { bar: 'bg-emerald-500', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: '✓', iconBg: 'bg-emerald-500' },
  error:   { bar: 'bg-red-500',     bg: 'bg-red-50 border-red-200',         text: 'text-red-800',     icon: '✕', iconBg: 'bg-red-500'     },
  warning: { bar: 'bg-amber-500',   bg: 'bg-amber-50 border-amber-200',     text: 'text-amber-800',   icon: '⚠', iconBg: 'bg-amber-500'   },
  info:    { bar: 'bg-blue-500',    bg: 'bg-blue-50 border-blue-200',       text: 'text-blue-800',    icon: 'ℹ', iconBg: 'bg-blue-500'    },
};

const MessageCard = ({ messages, removeMessage }) => (
  <div className="fixed top-5 right-5 z-[2000] flex flex-col gap-2.5 pointer-events-none">
    {messages.map((m) => {
      const cfg = TOAST_CONFIG[m.type];
      return (
        <div
          key={m.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg shadow-slate-200/60 min-w-[300px] max-w-[400px] ${cfg.bg}`}
          style={{ animation: 'slideInRight 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
        >
          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-white text-[11px] font-bold shrink-0 mt-0.5 ${cfg.iconBg}`}>
            {cfg.icon}
          </span>
          <p className={`text-[13px] font-medium flex-1 leading-snug m-0 ${cfg.text}`}>{m.message}</p>
          <button
            onClick={() => removeMessage(m.id)}
            className="shrink-0 opacity-40 hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer text-lg leading-none p-0"
          >×</button>
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
  const [messages, setMessages]                 = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setMessages(prev => [...prev, { id, type, message }]);
    setTimeout(() => removeMessage(id), 5000);
  };
  const removeMessage = (id) => setMessages(prev => prev.filter(m => m.id !== id));

  const downloadReceipt = (invoice) => {
    if (!invoice.receiptBase64) return;
    const link = document.createElement('a');
    link.href = invoice.receiptBase64;
    link.download = invoice.receiptName || 'payment-receipt';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const isPDF = (inv) => inv?.receiptType === 'application/pdf' || inv?.receiptName?.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setSupplierId(user ? user.uid : null);
    });
    return () => unsub();
  }, []);

  const fetchInvoices = async () => {
    if (!supplierId) return;
    try {
      setLoading(true);
      const baseQuery = query(
        collection(db, 'invoices'),
        where('supplierId', '==', supplierId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(baseQuery);
      const allInvoices = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id, ...data,
          invoiceDate: data.invoiceDate?.toDate ? data.invoiceDate.toDate().toISOString().split('T')[0] : data.invoiceDate,
          dueDate:     data.dueDate?.toDate     ? data.dueDate.toDate().toISOString().split('T')[0]     : data.dueDate,
          paidDate:    data.paidDate?.toDate    ? data.paidDate.toDate().toISOString().split('T')[0]    : null,
        };
      });
      const filtered = filterStatus === 'All' ? allInvoices : allInvoices.filter(inv => inv.paymentStatus === filterStatus);
      setInvoices(filtered);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      showToast('Failed to load invoices: ' + error.message, 'error');
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [filterStatus, supplierId]);

  const recordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) { showToast('Please enter payment amount', 'warning'); return; }
    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedInvoice.totalAmount) { showToast('Invalid payment amount', 'error'); return; }
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
      setShowPaymentModal(false); setPaymentAmount(''); setPaymentNote(''); setSelectedInvoice(null);
      fetchInvoices();
    } catch (error) {
      console.error('Error recording payment:', error);
      showToast('Failed to record payment: ' + error.message, 'error');
    }
  };

  const generatePDF = async (invoice) => {
    try {
      showToast('Generating PDF...', 'info');
      const response = await fetch(`${API_BASE}/supplier/invoices/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber, pharmacy: invoice.pharmacy,
          invoiceType: invoice.invoiceType, invoiceLabel: invoice.invoiceLabel,
          paymentStatus: invoice.paymentStatus, invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate, items: invoice.items || [],
          totalAmount: invoice.totalAmount, subtotal: invoice.subtotal,
          taxRate: invoice.taxRate, taxAmount: invoice.taxAmount,
          totalOrderAmount: invoice.totalOrderAmount, paidAmount: invoice.paidAmount,
          paidDate: invoice.paidDate, paymentMethod: invoice.paymentMethod,
          paymentNote: invoice.paymentNote,
        }),
      });
      if (!response.ok) {
        let errMsg = `Server error ${response.status}`;
        try { const j = await response.json(); errMsg = j.message || errMsg; } catch (_) {}
        throw new Error(errMsg);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `Invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
      showToast('PDF downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF: ' + error.message, 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
      case 'Pending': return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
      case 'Overdue': return 'bg-red-50 text-red-700 ring-1 ring-red-200';
      default:        return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusDot = (status) => {
    switch (status) {
      case 'Paid':    return 'bg-emerald-500';
      case 'Pending': return 'bg-amber-500';
      case 'Overdue': return 'bg-red-500';
      default:        return 'bg-slate-400';
    }
  };

  const getInvoiceTypeBadge = (type) => {
    switch (type) {
      case 'INITIAL': return 'bg-violet-50 text-violet-700 ring-1 ring-violet-200';
      case 'FINAL':   return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
      default:        return 'bg-slate-100 text-slate-600';
    }
  };

  const ModalWrap = ({ onClose, children }) => (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-5"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[820px] max-h-[90vh] overflow-y-auto shadow-2xl shadow-slate-900/20 border border-slate-200"
        style={{ animation: 'slideUp 0.25s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  const inputCls    = "w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-[14px] text-slate-800 transition-all focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 focus:bg-white";
  const disabledCls = "opacity-60 cursor-not-allowed bg-slate-100";

  const [allInvoices, setAllInvoices] = useState([]);
  useEffect(() => {
    const fetchAll = async () => {
      if (!supplierId) return;
      try {
        const snap = await getDocs(query(collection(db, 'invoices'), where('supplierId', '==', supplierId)));
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

  const FILTER_TABS = ['All', 'Paid', 'Pending', 'Overdue'];
  const filterTabColor = (tab) => {
    if (filterStatus !== tab) return 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-blue-600';
    switch (tab) {
      case 'All':     return 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200';
      case 'Paid':    return 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200';
      case 'Pending': return 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200';
      case 'Overdue': return 'bg-red-500 text-white border-red-500 shadow-md shadow-red-200';
      default:        return 'bg-blue-600 text-white border-blue-600';
    }
  };

  return (
    <div className="p-6 bg-slate-100 min-h-screen">
      <MessageCard messages={messages} removeMessage={removeMessage} />

      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Invoice & Payments</h1>
        <p className="text-[13.5px] text-slate-500">Track payments received from MediCareX</p>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card title="Total Revenue"                          value={fmtRs(allTotals.total)} />
        <Card title={`Received (${paidCount} invoices)`}    value={fmtRs(allTotals.paid)} />
        <Card title={`Pending (${pendingCount} invoices)`}  value={fmtRs(allTotals.pending)} />
        <Card title={`Overdue (${overdueCount} invoices)`}  value={fmtRs(allTotals.overdue)} />
      </div>

      {/* ── Delivery warning banner ── */}
      {allInvoices.some(inv => inv.invoiceType === 'INITIAL' && inv.paymentStatus === 'Pending') && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <MdLocalShipping size={18} className="text-amber-600" />
          </div>
          <p className="text-[13px] text-amber-800 font-medium m-0 leading-relaxed">
            You have pending initial payments. Delivery for those orders can only begin once MediCareX completes the initial 50% payment.
          </p>
        </div>
      )}

      {/* ── Filter tabs ── */}
      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-5 flex items-center gap-2 flex-wrap shadow-sm">
        <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-widest mr-2">Filter</span>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterStatus(tab)}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold border transition-all duration-200 ${filterTabColor(tab)}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[14px] text-slate-400 font-medium">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <MdDownload size={26} className="text-slate-400" />
            </div>
            <p className="text-[15px] font-semibold text-slate-700">No invoices found</p>
            <p className="text-[13px] text-slate-400">Invoices will appear here once generated</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Invoice #', 'Product', 'Order ID', 'Type', 'Invoice Date', 'Due Date', 'Amount', 'Status', 'Delivery', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11.5px] font-bold text-slate-400 uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-blue-50/30 transition-colors duration-150 group">
                    <td className="px-5 py-4">
                      <span className="text-[13.5px] font-bold text-blue-600">{invoice.invoiceNumber}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[13.5px] font-semibold text-slate-800 leading-snug">
                        {invoice.productName || invoice.items?.[0]?.productName || invoice.items?.[0]?.name || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[13px] text-slate-500 font-mono">{invoice.orderId}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11.5px] font-bold ${getInvoiceTypeBadge(invoice.invoiceType)}`}>
                        {invoice.invoiceLabel || invoice.invoiceType || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-slate-500">{invoice.invoiceDate}</td>
                    <td className="px-5 py-4 text-[13px] text-slate-500">{invoice.dueDate}</td>
                    <td className="px-5 py-4">
                      <span className="text-[13.5px] font-bold text-slate-800">Rs.{Number(invoice.totalAmount).toFixed(2)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold ${getStatusBadge(invoice.paymentStatus)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(invoice.paymentStatus)}`} />
                        {invoice.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {invoice.invoiceType === 'INITIAL' ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold
                          ${invoice.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-slate-100 text-slate-500'}`}>
                          <MdLocalShipping size={13} />
                          {invoice.paymentStatus === 'Paid' ? 'Unlocked' : 'Locked'}
                        </span>
                      ) : <span className="text-[12px] text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          title="View Details"
                          onClick={() => setSelectedInvoice(invoice)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 transition-all duration-200 cursor-pointer"
                        ><MdVisibility size={15} /></button>
                        <button
                          title="Download PDF"
                          onClick={() => generatePDF(invoice)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 transition-all duration-200 cursor-pointer"
                        ><MdDownload size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Invoice Details Modal ── */}
      {selectedInvoice && !showPaymentModal && (
        <ModalWrap onClose={() => setSelectedInvoice(null)}>
          {/* Modal Header */}
          <div className="flex justify-between items-start px-7 py-5 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
            <div>
              <h2 className="text-[18px] font-bold text-slate-900">Invoice Details</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-[11.5px] font-bold ${getInvoiceTypeBadge(selectedInvoice.invoiceType)}`}>
                  {selectedInvoice.invoiceLabel || selectedInvoice.invoiceType}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11.5px] font-semibold ${getStatusBadge(selectedInvoice.paymentStatus)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(selectedInvoice.paymentStatus)}`} />
                  {selectedInvoice.paymentStatus}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedInvoice(null)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer bg-transparent border-none text-xl"
            >×</button>
          </div>

          <div className="px-7 py-6">
            {/* Basic details grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              {[
                { label: 'Invoice Number', value: selectedInvoice.invoiceNumber },
                { label: 'Product',        value: selectedInvoice.productName || selectedInvoice.items?.[0]?.productName || selectedInvoice.items?.[0]?.name || '—' },
                { label: 'Order ID',       value: selectedInvoice.orderId },
                { label: 'Invoice Date',   value: selectedInvoice.invoiceDate },
                { label: 'Due Date',       value: selectedInvoice.dueDate },
              ].map((item) => (
                <div key={item.label} className="bg-slate-50 rounded-xl px-4 py-3">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">{item.label}</p>
                  <p className="text-[14px] text-slate-800 font-semibold m-0">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Delivery status banner */}
            {selectedInvoice.invoiceType === 'INITIAL' && (
              <div className={`rounded-xl p-4 mb-5 border flex items-start gap-3 ${selectedInvoice.paymentStatus === 'Paid' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <MdLocalShipping size={18} className={selectedInvoice.paymentStatus === 'Paid' ? 'text-emerald-600 shrink-0 mt-0.5' : 'text-amber-600 shrink-0 mt-0.5'} />
                <div>
                  <p className={`text-[13px] font-bold m-0 mb-0.5 ${selectedInvoice.paymentStatus === 'Paid' ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {selectedInvoice.paymentStatus === 'Paid' ? 'Delivery Unlocked — You can proceed with delivery' : 'Delivery Locked — Waiting for initial payment from MediCareX'}
                  </p>
                  <p className={`text-[12px] m-0 ${selectedInvoice.paymentStatus === 'Paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {selectedInvoice.paymentStatus === 'Paid'
                      ? 'Go to the Delivery Status page to update the delivery progress.'
                      : 'Once MediCareX pays the initial 50%, you will be able to start the delivery process.'}
                  </p>
                </div>
              </div>
            )}

            {selectedInvoice.invoiceType === 'FINAL' && (
              <div className={`rounded-xl p-4 mb-5 border ${selectedInvoice.paymentStatus === 'Paid' ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
                <p className={`text-[13px] font-semibold m-0 ${selectedInvoice.paymentStatus === 'Paid' ? 'text-emerald-800' : 'text-blue-800'}`}>
                  {selectedInvoice.paymentStatus === 'Paid'
                    ? 'Final payment received — all transactions complete'
                    : 'Final payment pending — MediCareX will pay this after order receipt'}
                </p>
              </div>
            )}

            {/* Bank Receipt Section */}
            {selectedInvoice.paymentStatus === 'Paid' && selectedInvoice.receiptBase64 && (
              <div className="mb-6">
                <h3 className="text-[14px] font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">✓</span>
                  Payment Receipt from MediCareX
                </h3>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-xl">{isPDF(selectedInvoice) ? '📄' : '🖼️'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-bold text-emerald-800 m-0 truncate">{selectedInvoice.receiptName || 'Payment Slip'}</p>
                      <p className="text-[11.5px] text-emerald-600 m-0 mt-0.5">
                        {isPDF(selectedInvoice) ? 'PDF Document' : 'Image'} · {((selectedInvoice.receiptSize || 0) / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => downloadReceipt(selectedInvoice)}
                      className="shrink-0 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-xl border-none cursor-pointer transition-all"
                    >
                      <MdDownload size={15} /> Download
                    </button>
                  </div>
                  {!isPDF(selectedInvoice) && (
                    <img
                      src={selectedInvoice.receiptBase64}
                      alt="Payment Receipt"
                      className="w-full max-h-[280px] object-contain rounded-xl border border-emerald-200"
                    />
                  )}
                  {isPDF(selectedInvoice) && (
                    <div className="bg-white border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                      <span>ℹ️</span>
                      <p className="text-[12px] text-slate-600 m-0">Click <strong>Download</strong> to open or save the PDF payment slip.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedInvoice.paymentStatus === 'Paid' && !selectedInvoice.receiptBase64 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 flex items-center gap-3">
                <span className="text-xl">🧾</span>
                <p className="text-[13px] text-slate-600 m-0">Bank receipt not yet attached to this payment.</p>
              </div>
            )}

            {/* Items table */}
            <h3 className="text-[14px] font-bold text-slate-800 mb-3">Line Items</h3>
            <div className="border border-slate-200 rounded-xl overflow-x-auto mb-5">
              <table className="w-full border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Product', 'Quantity', 'Unit Price', 'Total'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedInvoice.items || []).map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-[13.5px] font-medium text-slate-800">{item.productName}</td>
                      <td className="px-4 py-3 text-[13.5px] text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-[13.5px] text-slate-600">Rs.{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="px-4 py-3 text-[13.5px] font-bold text-slate-800">Rs.{(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="bg-slate-50 rounded-xl p-5 mb-5 border border-slate-200">
              <div className="flex justify-between py-2 text-[13.5px] text-slate-600 border-b border-slate-200">
                <span>Subtotal</span>
                <span className="font-semibold">Rs.{Number(selectedInvoice.subtotal || selectedInvoice.totalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 text-[13.5px] text-slate-600 border-b border-slate-200">
                <span>Tax ({selectedInvoice.taxRate || 0}%)</span>
                <span className="font-semibold">Rs.{Number(selectedInvoice.taxAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-3 mt-1 text-[16px] font-bold text-blue-600">
                <span>Total</span>
                <span>Rs.{Number(selectedInvoice.totalAmount).toFixed(2)}</span>
              </div>
              {selectedInvoice.totalOrderAmount && (
                <p className="text-[11.5px] text-slate-400 mt-2 text-right">
                  Full order total: Rs.{Number(selectedInvoice.totalOrderAmount).toFixed(2)}
                </p>
              )}
            </div>

            {/* Payment info */}
            {selectedInvoice.paymentStatus === 'Paid' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <h4 className="text-[13px] font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-bold">✓</span>
                  Payment Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Paid Amount',    value: `Rs.${Number(selectedInvoice.paidAmount || selectedInvoice.totalAmount).toFixed(2)}` },
                    { label: 'Payment Date',   value: selectedInvoice.paidDate },
                    { label: 'Payment Method', value: selectedInvoice.paymentMethod },
                    ...(selectedInvoice.paymentNote ? [{ label: 'Note', value: selectedInvoice.paymentNote }] : []),
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[11px] text-blue-400 font-semibold uppercase tracking-wide mb-0.5">{item.label}</p>
                      <p className="text-[13.5px] text-blue-800 font-semibold m-0">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 px-7 py-5 border-t border-slate-100">
            <button
              onClick={() => generatePDF(selectedInvoice)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[13.5px] font-semibold rounded-xl border-none cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-200"
            >
              <MdDownload size={16} /> Download Invoice
            </button>
            <button
              onClick={() => setSelectedInvoice(null)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[13.5px] font-semibold rounded-xl border-none cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </ModalWrap>
      )}

      {/* ── Record Payment Modal ── */}
      {showPaymentModal && selectedInvoice && (
        <ModalWrap onClose={() => setShowPaymentModal(false)}>
          <div className="flex justify-between items-center px-7 py-5 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
            <div>
              <h2 className="text-[18px] font-bold text-slate-900">Record Payment</h2>
              <p className="text-[12.5px] text-slate-400 mt-0.5">Invoice {selectedInvoice.invoiceNumber}</p>
            </div>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer bg-transparent border-none text-xl"
            >×</button>
          </div>
          <div className="px-7 py-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-slate-700">Invoice Number</label>
              <input type="text" value={selectedInvoice.invoiceNumber} disabled className={`${inputCls} ${disabledCls}`} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-slate-700">Total Amount</label>
              <input type="text" value={`Rs.${Number(selectedInvoice.totalAmount).toFixed(2)}`} disabled className={`${inputCls} ${disabledCls}`} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-slate-700">Payment Amount <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" placeholder="0.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-slate-700">Payment Method <span className="text-red-500">*</span></label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputCls}>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Check">Check</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Online Payment">Online Payment</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-slate-700">Payment Note</label>
              <textarea rows={3} placeholder="Add any notes..." value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} className={`${inputCls} resize-none`} />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-7 py-5 border-t border-slate-100">
            <button
              onClick={recordPayment}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[13.5px] font-semibold rounded-xl border-none cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-200"
            >
              Record Payment
            </button>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[13.5px] font-semibold rounded-xl border-none cursor-pointer transition-all"
            >
              Cancel
            </button>
          </div>
        </ModalWrap>
      )}

      <style>{`
        @keyframes fadeIn       { from{opacity:0}                            to{opacity:1} }
        @keyframes slideUp      { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes slideInRight { from{transform:translateX(60px);opacity:0} to{transform:translateX(0);opacity:1} }
      `}</style>
    </div>
  );
};

export default InvoicePayments;