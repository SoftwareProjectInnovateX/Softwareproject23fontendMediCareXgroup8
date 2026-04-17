import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  Timestamp,
  getDoc,
  addDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import Card from "../../components/Card";

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const statusOptions = ['All', 'PENDING', 'APPROVED', 'REJECTED', 'DELIVERED', 'COMPLETED'];

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(
        query(collection(db, 'purchaseOrders'), orderBy('createdAt', 'desc'))
      );
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOrders(data);
      setFilteredOrders(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Failed to load orders: ' + error.message);
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    let filtered = orders;
    if (statusFilter !== 'All') filtered = filtered.filter((o) => o.status === statusFilter);
    if (searchTerm)
      filtered = filtered.filter(
        (o) =>
          o.poId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.productId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.product?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    setFilteredOrders(filtered);
  }, [statusFilter, searchTerm, orders]);

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  // ── Triggered by admin after supplier marks DELIVERED ──────────────────────
  const markAsReceived = async (orderId, order) => {
    if (!window.confirm('Mark this order as COMPLETED?\n\nThis will update the inventory stock and unlock the final payment.')) return;
    try {
      await updateDoc(doc(db, 'purchaseOrders', orderId), {
        status: 'COMPLETED',
        completionDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Update inventory stock
      const adminProductRef = doc(db, 'adminProducts', order.adminProductId);
      const adminProductSnap = await getDoc(adminProductRef);
      if (adminProductSnap.exists()) {
        await updateDoc(adminProductRef, {
          stock: adminProductSnap.data().stock + order.quantity,
          availability: 'in stock',
          lastRestocked: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      // Resolve field names defensively
      const resolvedProductName = order.productName || order.product || 'N/A';
      const resolvedPoId        = order.poId || order.productId || orderId;
      const resolvedTotal       = order.totalAmount ?? (order.quantity * order.unitPrice) ?? 0;

      // Unlock the FINAL payment so it appears in AdminPayments
      const paymentsSnap = await getDocs(
        query(
          collection(db, 'payments'),
          where('purchaseOrderId', '==', orderId),
          where('paymentType', '==', 'FINAL')
        )
      );

      if (!paymentsSnap.empty) {
        // Final payment record exists but was locked — make it PENDING
        await updateDoc(doc(db, 'payments', paymentsSnap.docs[0].id), {
          status: 'PENDING',
          unlockedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      } else {
        // Final payment record doesn't exist yet — create it now
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14); // 14 days to pay

        await addDoc(collection(db, 'payments'), {
          purchaseOrderId:  orderId,
          orderId:          resolvedPoId,
          supplierId:       order.supplierId   || null,
          supplierName:     order.supplierName || 'N/A',
          productName:      resolvedProductName,
          quantity:         order.quantity     || 0,
          amount:           resolvedTotal / 2,           // final 50%
          totalOrderAmount: resolvedTotal,
          paymentType:      'FINAL',
          paymentLabel:     'Final Payment (50%)',
          status:           'PENDING',
          dueDate:          Timestamp.fromDate(dueDate),
          createdAt:        Timestamp.now(),
          updatedAt:        Timestamp.now(),
        });
      }

      alert('Order marked as COMPLETED and stock updated!\n\nFinal payment is now available in Payments.');
      fetchOrders();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error marking order as received:', error);
      alert('Failed to update order: ' + error.message);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'PENDING':     return 'bg-amber-100 text-amber-800';
      case 'APPROVED':    return 'bg-blue-100 text-blue-800';
      case 'REJECTED':    return 'bg-red-100 text-red-800';
      case 'PACKED':      return 'bg-sky-100 text-sky-800';
      case 'IN DELIVERY': return 'bg-violet-100 text-violet-800';
      case 'DELIVERED':   return 'bg-orange-100 text-orange-800';
      case 'COMPLETED':   return 'bg-emerald-100 text-emerald-800';
      default:            return 'bg-gray-100 text-gray-600';
    }
  };
   const stats = [
  { title: 'Total Orders', value: orders.length, color: 'bg-slate-500' },
  { title: 'Pending', value: orders.filter(o => o.status === 'PENDING').length, color: 'bg-amber-500' },
  { title: 'Approved', value: orders.filter(o => o.status === 'APPROVED').length, color: 'bg-blue-500' },
  { title: 'Delivered', value: orders.filter(o => o.status === 'DELIVERED').length, color: 'bg-orange-500' },
  { title: 'Completed', value: orders.filter(o => o.status === 'COMPLETED').length, color: 'bg-emerald-500' },
  {
      title: 'Total Amount',
      value: `Rs. ${orders.reduce((s, o) =>
        s + ((o.quantity || 0) * (o.unitPrice || 0)), 0
      ).toFixed(2)}`,
      color: 'bg-violet-500'
    },
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen">

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Purchase Orders</h1>
        <p className="text-slate-500 text-[15px]">Manage and track all purchase orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-5 mb-8">
      {stats.map((card) => (
        <Card
          key={card.title}
          title={card.title}
          value={card.value}
          color={card.color}
        />
      ))}
    </div>

      {/* Alert: orders awaiting admin completion */}
      {orders.some((o) => o.status === 'DELIVERED') && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-orange-50 border border-orange-300 p-4">
          <svg className="h-5 w-5 flex-shrink-0 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-orange-800 font-medium m-0">
            {orders.filter((o) => o.status === 'DELIVERED').length} order(s) delivered by supplier — please verify receipt and mark as Completed to unlock final payment.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <input
          type="text"
          placeholder="Search by PO ID, Product, or Supplier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-[15px] mb-4 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />
        <div className="flex gap-2.5 flex-wrap">
          {statusOptions.map((status) => (
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
          <div className="py-20 text-center text-slate-500 text-lg">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-lg">No orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead className="bg-slate-50">
                <tr>
                  {['PO ID', 'Product', 'Supplier', 'Quantity', 'Unit Price', 'Total Amount', 'Status', 'Order Date', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-4 text-left text-[13px] font-semibold text-slate-500 uppercase tracking-wide border-b-2 border-slate-200">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-4 py-4 font-mono font-semibold text-blue-600 text-sm">
                      {order.poId || order.productId}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-800 text-sm m-0">{order.productName || order.product}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 m-0">{order.productCode}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-800">{order.supplierName}</td>
                    <td className="px-4 py-4 text-sm text-slate-800">{order.quantity} units</td>
                    <td className="px-4 py-4 text-sm text-slate-800">Rs. {Number(order.unitPrice).toFixed(2)}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-emerald-600">
                      Rs. {(order.totalAmount ?? order.quantity * order.unitPrice).toFixed(2)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-semibold uppercase ${getStatusStyle(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {formatDate(order.orderDate || order.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => viewOrderDetails(order)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-md"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showDetailsModal && selectedOrder && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-5"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto shadow-2xl"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center px-7 py-6 border-b-2 border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800 m-0">Order Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-8 h-8 flex items-center justify-center text-3xl text-slate-400 bg-transparent border-none cursor-pointer rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-all duration-200"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-7">

              {/* PO ID + Status */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-slate-100">
                <h3 className="text-xl font-semibold text-blue-600 font-mono m-0">
                  {selectedOrder.poId || selectedOrder.productId}
                </h3>
                <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-semibold uppercase ${getStatusStyle(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-5 mb-6">
                {[
                  { label: 'Product',      value: selectedOrder.productName || selectedOrder.product },
                  { label: 'Product Code', value: selectedOrder.productCode, mono: true },
                  { label: 'Category',     value: selectedOrder.category },
                  { label: 'Supplier',     value: selectedOrder.supplierName },
                  { label: 'Quantity',     value: `${selectedOrder.quantity} units` },
                  { label: 'Unit Price',   value: `Rs. ${Number(selectedOrder.unitPrice).toFixed(2)}` },
                  {
                    label: 'Total Amount',
                    value: `Rs. ${Number(selectedOrder.totalAmount ?? selectedOrder.quantity * selectedOrder.unitPrice).toFixed(2)}`,
                    highlight: 'text-emerald-600 text-lg font-bold',
                  },
                  { label: 'Order Date', value: formatDate(selectedOrder.orderDate || selectedOrder.createdAt) },
                  ...(selectedOrder.approvalDate   ? [{ label: 'Approval Date',   value: formatDate(selectedOrder.approvalDate) }]   : []),
                  ...(selectedOrder.completionDate ? [{ label: 'Completion Date', value: formatDate(selectedOrder.completionDate) }] : []),
                ].map((item) => (
                  <div key={item.label} className="flex flex-col">
                    <label className="text-[13px] text-slate-500 font-medium mb-1.5">{item.label}</label>
                    <p className={`m-0 text-[15px] text-slate-800 font-medium ${item.highlight || ''} ${item.mono ? 'font-mono text-sm' : ''}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="bg-slate-50 px-4 py-4 rounded-lg mb-5">
                  <label className="block text-[13px] text-slate-500 font-semibold mb-2">Notes</label>
                  <p className="m-0 text-sm text-slate-800 leading-relaxed">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedOrder.rejectionReason && (
                <div className="bg-red-50 border-l-4 border-red-500 px-4 py-4 rounded-lg mb-5">
                  <label className="block text-[13px] text-red-700 font-semibold mb-2">Rejection Reason</label>
                  <p className="m-0 text-sm text-red-900 leading-relaxed">{selectedOrder.rejectionReason}</p>
                </div>
              )}

              {/* ── Mark as Received — only shown when supplier has marked DELIVERED ── */}
              {selectedOrder.status === 'DELIVERED' && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5 text-center">
                  <p className="text-sm text-orange-700 font-semibold mb-3 m-0">
                    🚚 Supplier has marked this order as Delivered
                  </p>
                  <button
                    onClick={() => markAsReceived(selectedOrder.id, selectedOrder)}
                    className="w-full py-3.5 px-6 bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-lg text-base font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg mb-2"
                  >
                    ✓ Confirm Receipt &amp; Mark as Completed
                  </button>
                  <p className="m-0 text-[13px] text-orange-700">
                    Confirming receipt will update inventory and unlock the final 50% payment.
                  </p>
                </div>
              )}

              {/* Already completed notice */}
              {selectedOrder.status === 'COMPLETED' && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5 text-center">
                  <p className="text-sm text-emerald-700 font-semibold m-0">
                    ✅ Order completed. Inventory updated and final payment unlocked.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keyframe animations */}
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

export default OrderManagement;