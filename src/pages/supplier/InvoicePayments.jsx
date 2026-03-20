import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, doc, updateDoc, addDoc,
  query, orderBy, where, Timestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  MdAttachMoney, MdCheckCircle, MdHourglassEmpty,
  MdWarning, MdVisibility, MdDownload, MdCreditCard,
} from 'react-icons/md';

const InvoicePayments = () => {
  const [invoices, setInvoices]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [filterStatus, setFilterStatus]       = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount]     = useState('');
  const [paymentMethod, setPaymentMethod]     = useState('Bank Transfer');
  const [paymentNote, setPaymentNote]         = useState('');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const invoicesQuery = filterStatus === 'All'
        ? query(collection(db, 'invoices'), orderBy('invoiceDate', 'desc'))
        : query(collection(db, 'invoices'), where('paymentStatus', '==', filterStatus), orderBy('invoiceDate', 'desc'));

      const snapshot = await getDocs(invoicesQuery);
      setInvoices(snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id, ...data,
          invoiceDate: data.invoiceDate?.toDate ? data.invoiceDate.toDate().toISOString().split('T')[0] : data.invoiceDate,
          dueDate:     data.dueDate?.toDate     ? data.dueDate.toDate().toISOString().split('T')[0]     : data.dueDate,
          paidDate:    data.paidDate?.toDate    ? data.paidDate.toDate().toISOString().split('T')[0]    : null,
        };
      }));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      alert('Failed to load invoices: ' + error.message);
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [filterStatus]);

  const calculateTotals = () => ({
    total:   invoices.reduce((s, i) => s + (i.totalAmount || 0), 0),
    paid:    invoices.filter(i => i.paymentStatus === 'Paid').reduce((s, i) => s + (i.totalAmount || 0), 0),
    pending: invoices.filter(i => i.paymentStatus === 'Pending').reduce((s, i) => s + (i.totalAmount || 0), 0),
    overdue: invoices.filter(i => i.paymentStatus === 'Overdue').reduce((s, i) => s + (i.totalAmount || 0), 0),
  });

  const recordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) { alert('Please enter payment amount'); return; }
    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedInvoice.totalAmount) { alert('Invalid payment amount'); return; }
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
      alert('Payment recorded successfully!');
      setShowPaymentModal(false); setPaymentAmount('');
      setPaymentNote(''); setSelectedInvoice(null);
      fetchInvoices();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment: ' + error.message);
    }
  };

  const generatePDF = (invoice) => {
    const w = window.open('', '', 'width=800,height=600');
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${invoice.invoiceNumber}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:40px;background:white}
      .container{max-width:800px;margin:0 auto;border:2px solid #333;padding:30px}
      .header{display:flex;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:20px;margin-bottom:20px}
      h1{font-size:28px;color:#2563eb}table{width:100%;border-collapse:collapse;margin:20px 0}
      th{background:#f3f4f6;padding:12px;text-align:left;border-bottom:2px solid #333}td{padding:12px;border-bottom:1px solid #e5e7eb}
      .badge{display:inline-block;padding:5px 15px;border-radius:20px;font-size:12px;font-weight:bold}
      .Paid{background:#dcfce7;color:#166534}.Pending{background:#fef3c7;color:#92400e}.Overdue{background:#fee2e2;color:#991b1b}
      .totals{text-align:right;margin-top:20px}.total-row{display:flex;justify-content:flex-end;margin:8px 0}
      .tl{width:200px;text-align:right;padding-right:20px;font-weight:bold}.ta{width:150px;text-align:right}
      .grand{border-top:2px solid #333;padding-top:10px;font-size:20px;font-weight:bold;color:#2563eb}
      .info{background:#f9fafb;padding:15px;margin:20px 0;border-left:4px solid #2563eb}
      .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;color:#666;font-size:12px}
      @media print{.no-print{display:none}}</style></head><body>
      <div class="container">
        <div class="header">
          <div><h1>MedSupply Co.</h1><p>Supplier Portal</p><p>123 Medical Street</p></div>
          <div style="text-align:right"><h2>INVOICE</h2><p><strong>#${invoice.invoiceNumber}</strong></p>
          <span class="badge ${invoice.paymentStatus}">${invoice.paymentStatus}</span></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin:20px 0">
          <div><h3>Bill To</h3><p><strong>${invoice.pharmacy}</strong></p></div>
          <div><h3>Details</h3><p>Invoice: ${invoice.invoiceDate}</p><p>Due: ${invoice.dueDate}</p></div>
        </div>
        <table><thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>
        ${invoice.items.map(i => `<tr><td>${i.productName}</td><td>${i.quantity}</td><td>$${i.unitPrice.toFixed(2)}</td><td>$${(i.quantity*i.unitPrice).toFixed(2)}</td></tr>`).join('')}
        </tbody></table>
        <div class="totals">
          <div class="total-row"><div class="tl">Subtotal:</div><div class="ta">$${invoice.subtotal.toFixed(2)}</div></div>
          <div class="total-row"><div class="tl">Tax (${invoice.taxRate}%):</div><div class="ta">$${invoice.taxAmount.toFixed(2)}</div></div>
          <div class="total-row grand"><div class="tl">Total:</div><div class="ta">$${invoice.totalAmount.toFixed(2)}</div></div>
        </div>
        <div class="info"><h3>Payment ${invoice.paymentStatus==='Paid'?'Info':'Instructions'}</h3>
        ${invoice.paymentStatus==='Paid'
          ? `<p>Paid: $${invoice.paidAmount?.toFixed(2)} via ${invoice.paymentMethod} on ${invoice.paidDate}</p>`
          : `<p>Bank: Bank of America | Ref: ${invoice.invoiceNumber}</p>`}
        </div>
        <div class="footer"><p>Thank you! Generated ${new Date().toLocaleDateString()}</p></div>
      </div>
      <div class="no-print" style="text-align:center;margin-top:20px">
        <button onclick="window.print()" style="padding:12px 24px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;margin-right:10px">Print / Save PDF</button>
        <button onclick="window.close()" style="padding:12px 24px;background:#6b7280;color:white;border:none;border-radius:6px;cursor:pointer">Close</button>
      </div></body></html>`);
    w.document.close();
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Paid':    return 'bg-emerald-100 text-emerald-800';
      case 'Pending': return 'bg-amber-100 text-amber-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      default:        return 'bg-gray-100 text-gray-600';
    }
  };

  const totals = calculateTotals();

  const summaryCards = [
    { label: 'Total Revenue', value: totals.total,   count: null,                                                   accent: 'border-blue-500',    icon: <MdAttachMoney size={26} className="text-blue-600" />,   bg: 'bg-blue-50' },
    { label: 'Paid',          value: totals.paid,    count: invoices.filter(i => i.paymentStatus === 'Paid').length,    accent: 'border-emerald-500', icon: <MdCheckCircle size={26} className="text-emerald-600" />, bg: 'bg-emerald-50' },
    { label: 'Pending',       value: totals.pending, count: invoices.filter(i => i.paymentStatus === 'Pending').length, accent: 'border-amber-400',   icon: <MdHourglassEmpty size={26} className="text-amber-500" />, bg: 'bg-amber-50' },
    { label: 'Overdue',       value: totals.overdue, count: invoices.filter(i => i.paymentStatus === 'Overdue').length, accent: 'border-red-500',     icon: <MdWarning size={26} className="text-red-500" />,        bg: 'bg-red-50' },
  ];

  /* ---- shared modal wrapper ---- */
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

  const inputCls = "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10";
  const disabledCls = "bg-slate-100 cursor-not-allowed";

  return (
    <div className="p-6 bg-slate-100 min-h-screen">

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 mb-1">Invoice & Payments</h1>
        <p className="text-slate-500 text-base">Manage invoices and track payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`bg-white rounded-xl p-5 flex items-center gap-4 shadow-sm border-l-4 ${card.accent} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
          >
            <div className={`${card.bg} w-14 h-14 flex items-center justify-center rounded-lg flex-shrink-0`}>
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-500 font-medium mb-1">{card.label}</p>
              <p className="text-[26px] font-bold text-slate-800 leading-tight">
                Rs.{card.value.toFixed(2)}
              </p>
              {card.count !== null && (
                <p className="text-xs text-slate-400 mt-0.5">{card.count} invoices</p>
              )}
            </div>
          </div>
        ))}
      </div>

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

      {/* Table */}
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
            <table className="w-full border-collapse min-w-[800px]">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  {['Invoice #', 'Pharmacy', 'Order ID', 'Invoice Date', 'Due Date', 'Amount', 'Status', 'Actions'].map((h) => (
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
                    <td className="px-4 py-4 text-sm text-slate-600">{invoice.invoiceDate}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{invoice.dueDate}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-800">Rs.{invoice.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(invoice.paymentStatus)}`}>
                        {invoice.paymentStatus}
                      </span>
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
                        {invoice.paymentStatus !== 'Paid' && (
                          <button
                            title="Record Payment"
                            onClick={() => { setSelectedInvoice(invoice); setPaymentAmount(invoice.totalAmount.toString()); setShowPaymentModal(true); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-600 border-none cursor-pointer transition-colors"
                          >
                            <MdCreditCard size={16} />
                          </button>
                        )}
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
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-5 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800">Invoice Details</h2>
            <button onClick={() => setSelectedInvoice(null)} className="w-8 h-8 flex items-center justify-center text-3xl text-slate-400 bg-transparent border-none cursor-pointer rounded-lg hover:bg-slate-100 transition-colors">×</button>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Detail Grid */}
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

            {/* Items */}
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
                  {selectedInvoice.items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-none">
                      <td className="px-3 py-3 text-sm text-slate-800">{item.productName}</td>
                      <td className="px-3 py-3 text-sm text-slate-700">{item.quantity}</td>
                      <td className="px-3 py-3 text-sm text-slate-700">${item.unitPrice.toFixed(2)}</td>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-800">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              {[
                { label: `Subtotal:`, value: `$${selectedInvoice.subtotal.toFixed(2)}` },
                { label: `Tax (${selectedInvoice.taxRate}%):`, value: `$${selectedInvoice.taxAmount.toFixed(2)}` },
              ].map((row) => (
                <div key={row.label} className="flex justify-between py-2 text-sm text-slate-700">{row.label}<span>{row.value}</span></div>
              ))}
              <div className="flex justify-between py-3 mt-2 border-t-2 border-slate-200 text-lg font-bold text-blue-600">
                <span>Total:</span><span>${selectedInvoice.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment info box */}
            {selectedInvoice.paymentStatus === 'Paid' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-3">Payment Information</h4>
                {[
                  { label: 'Paid Amount',     value: `$${selectedInvoice.paidAmount?.toFixed(2)}` },
                  { label: 'Payment Date',    value: selectedInvoice.paidDate },
                  { label: 'Payment Method',  value: selectedInvoice.paymentMethod },
                  ...(selectedInvoice.paymentNote ? [{ label: 'Note', value: selectedInvoice.paymentNote }] : []),
                ].map((item) => (
                  <p key={item.label} className="text-sm text-blue-700 mb-1 m-0">
                    <strong>{item.label}:</strong> {item.value}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
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

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <ModalWrap onClose={() => setShowPaymentModal(false)}>
          <div className="flex justify-between items-center px-6 py-5 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800">Record Payment</h2>
            <button onClick={() => setShowPaymentModal(false)} className="w-8 h-8 flex items-center justify-center text-3xl text-slate-400 bg-transparent border-none cursor-pointer rounded-lg hover:bg-slate-100 transition-colors">×</button>
          </div>

          <div className="p-6 flex flex-col gap-4">
            {/* Read-only fields */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Invoice Number</label>
              <input type="text" value={selectedInvoice.invoiceNumber} disabled className={`${inputCls} ${disabledCls}`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Total Amount</label>
              <input type="text" value={`$${selectedInvoice.totalAmount.toFixed(2)}`} disabled className={`${inputCls} ${disabledCls}`} />
            </div>

            {/* Payment Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Payment Amount *</label>
              <input
                type="number" step="0.01" placeholder="0.00"
                value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Payment Method */}
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

            {/* Payment Note */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Payment Note</label>
              <textarea
                rows={3} placeholder="Add any notes about this payment..."
                value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)}
                className={`${inputCls} resize-none`}
              />
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

      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>
    </div>
  );
};

export default InvoicePayments;