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
} from 'firebase/firestore';
import { db } from '../../services/firebase';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const statusOptions = ['All', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];

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
          o.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    setFilteredOrders(filtered);
  }, [statusFilter, searchTerm, orders]);

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const markAsReceived = async (orderId, order) => {
    if (!window.confirm('Mark this order as RECEIVED?\n\nThis will update the inventory stock.')) return;
    try {
      await updateDoc(doc(db, 'purchaseOrders', orderId), {
        status: 'COMPLETED',
        completionDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
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
      alert('Order marked as received and stock updated!');
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
      case 'PENDING':   return 'bg-amber-100 text-amber-800';
      case 'APPROVED':  return 'bg-blue-100 text-blue-800';
      case 'REJECTED':  return 'bg-red-100 text-red-800';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-800';
      default:          return 'bg-gray-100 text-gray-600';
    }
  };

  const stats = [
    { label: 'Total Orders',  value: orders.length,                                      accent: 'border-slate-400' },
    { label: 'Pending',       value: orders.filter((o) => o.status === 'PENDING').length,   accent: 'border-amber-400' },
    { label: 'Approved',      value: orders.filter((o) => o.status === 'APPROVED').length,  accent: 'border-blue-400' },
    { label: 'Completed',     value: orders.filter((o) => o.status === 'COMPLETED').length, accent: 'border-emerald-400' },
    { label: 'Total Amount',  value: `Rs. ${orders.reduce((s, o) => s + (o.totalAmount || 0), 0).toFixed(2)}`, accent: 'border-violet-400' },
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen">

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Purchase Orders</h1>
        <p className="text-slate-500 text-[15px]">Manage and track all purchase orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        {stats.map((card) => (
          <div
            key={card.label}
            className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${card.accent} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
          >
            <p className="text-sm text-slate-500 font-medium mb-2">{card.label}</p>
            <p className="text-[28px] font-bold text-slate-800 leading-tight">{card.value}</p>
          </div>
        ))}
      </div>

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
                      {order.poId}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-800 text-sm m-0">{order.productName}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 m-0">{order.productCode}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-800">{order.supplierName}</td>
                    <td className="px-4 py-4 text-sm text-slate-800">{order.quantity} units</td>
                    <td className="px-4 py-4 text-sm text-slate-800">Rs. {Number(order.unitPrice).toFixed(2)}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-emerald-600">
                      Rs. {Number(order.totalAmount).toFixed(2)}
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
                <h3 className="text-xl font-semibold text-blue-600 font-mono m-0">{selectedOrder.poId}</h3>
                <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-semibold uppercase ${getStatusStyle(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-5 mb-6">
                {[
                  { label: 'Product',     value: selectedOrder.productName },
                  { label: 'Product Code', value: selectedOrder.productCode, mono: true },
                  { label: 'Category',    value: selectedOrder.category },
                  { label: 'Supplier',    value: selectedOrder.supplierName },
                  { label: 'Quantity',    value: `${selectedOrder.quantity} units` },
                  { label: 'Unit Price',  value: `Rs. ${Number(selectedOrder.unitPrice).toFixed(2)}` },
                  { label: 'Total Amount', value: `Rs. ${Number(selectedOrder.totalAmount).toFixed(2)}`, highlight: 'text-emerald-600 text-lg font-bold' },
                  { label: 'Order Date',  value: formatDate(selectedOrder.orderDate || selectedOrder.createdAt) },
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

              {/* Mark as Received */}
              {selectedOrder.status === 'APPROVED' && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 text-center">
                  <button
                    onClick={() => markAsReceived(selectedOrder.id, selectedOrder)}
                    className="w-full py-3.5 px-6 bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-lg text-base font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg mb-2"
                  >
                    ✓ Mark as Received
                  </button>
                  <p className="m-0 text-[13px] text-blue-700">
                    Click this when you receive the products
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