import React, { useState, useEffect } from 'react';
import {
  MdShoppingCart,
  MdCheckCircle,
  MdCancel,
  MdWarning,
  MdCampaign,
} from 'react-icons/md';

// ── API base URL ────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [processing, setProcessing] = useState(false);

  const notificationTypes = [
    'All',
    'ORDER_PLACED',
    'ORDER_APPROVED',
    'ORDER_REJECTED',
    'LOW_STOCK_ALERT',
  ];

  // ── FETCH all notifications ──────────────────────────────────
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/notifications?recipientType=admin`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      alert('Failed to load notifications: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const filteredNotifications =
    filter === 'All' ? notifications : notifications.filter((n) => n.type === filter);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── MARK single as read ──────────────────────────────────────
  const markAsRead = async (notificationId) => {
    try {
      const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to mark as read');
      fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // ── MARK ALL as read ─────────────────────────────────────────
  const markAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
      alert('Failed to mark all as read');
    }
  };

  // ── DELETE notification ──────────────────────────────────────
  const deleteNotification = async (notificationId) => {
    if (!window.confirm('Delete this notification?')) return;
    try {
      const res = await fetch(`${API_BASE}/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete notification');
      fetchNotifications();
      setSelectedNotification(null);
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Failed to delete notification');
    }
  };

  // ── MARK ORDER as received (backend handles all logic) ───────
  const handleOrderApproval = async (notification) => {
    if (!window.confirm(
      `Mark order as RECEIVED?\n\nThis will:\n- Update order status to COMPLETED\n- Add units to your inventory\n- Update product availability`
    )) return;

    try {
      setProcessing(true);
      const res = await fetch(`${API_BASE}/notifications/${notification.id}/mark-received`, {
        method: 'PATCH',
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to process order');

      alert('Order marked as received!\n\nInventory has been updated.');
      fetchNotifications();
      setSelectedNotification(null);
    } catch (error) {
      console.error('Error handling order approval:', error);
      alert('Failed to process order: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // ── Helpers (UI only — no changes needed) ───────────────────
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp._seconds
      ? new Date(timestamp._seconds * 1000)
      : timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getNotificationIcon = (type, size = 24) => {
    switch (type) {
      case 'ORDER_PLACED':    return <MdShoppingCart size={size} className="text-blue-500" />;
      case 'ORDER_APPROVED':  return <MdCheckCircle  size={size} className="text-emerald-500" />;
      case 'ORDER_REJECTED':  return <MdCancel       size={size} className="text-red-500" />;
      case 'LOW_STOCK_ALERT': return <MdWarning      size={size} className="text-amber-500" />;
      default:                return <MdCampaign     size={size} className="text-slate-500" />;
    }
  };

  const getTypeLabel = (type) => type.replace(/_/g, ' ');

  const getCardAccent = (type, unread) => {
    if (unread) return 'border-blue-600';
    switch (type) {
      case 'ORDER_PLACED':    return 'border-blue-400';
      case 'ORDER_APPROVED':  return 'border-emerald-400';
      case 'ORDER_REJECTED':  return 'border-red-400';
      case 'LOW_STOCK_ALERT': return 'border-amber-400';
      default:                return 'border-slate-300';
    }
  };

  const statCards = [
    { label: 'Total',          value: notifications.length,                                            accent: 'border-slate-300' },
    { label: 'Unread',         value: unreadCount,                                                     accent: 'border-amber-400' },
    { label: 'Order Approved', value: notifications.filter((n) => n.type === 'ORDER_APPROVED').length, accent: 'border-emerald-400' },
    { label: 'Low Stock',      value: notifications.filter((n) => n.type === 'LOW_STOCK_ALERT').length, accent: 'border-red-400' },
  ];

  // ── JSX (zero UI changes) ────────────────────────────────────
  return (
    <div className="p-8 bg-slate-50 min-h-screen">

      {/* Page Header */}
      <div className="flex justify-between items-start mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Notifications</h1>
          <p className="text-slate-500 text-[15px]">Stay updated with supplier responses and stock alerts</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`bg-white px-6 py-5 rounded-xl shadow-sm border-l-4 ${card.accent} flex justify-between items-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
          >
            <span className="text-sm text-slate-500 font-medium">{card.label}</span>
            <span className="text-3xl font-bold text-slate-800">{card.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-xl shadow-sm mb-6 flex gap-3 flex-wrap">
        {notificationTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-full border-2 text-sm font-medium cursor-pointer transition-all duration-200
              ${filter === type
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
          >
            {type === 'All' ? 'All' : getTypeLabel(type)}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm py-20 text-center text-slate-500 text-lg">
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm py-20 text-center">
            <p className="text-lg text-slate-500 mb-2">No notifications found</p>
            <small className="text-sm text-slate-400">You'll see updates from suppliers here</small>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => setSelectedNotification(notification)}
              className={`relative bg-white px-6 py-5 rounded-xl shadow-sm border-l-4 ${getCardAccent(notification.type, !notification.read)}
                flex gap-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
                ${!notification.read ? 'bg-slate-50' : ''}`}
            >
              <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-full bg-slate-100">
                {getNotificationIcon(notification.type, 22)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1.5 flex-wrap gap-1">
                  <span className="text-[13px] font-semibold text-blue-600 uppercase tracking-wide">
                    {getTypeLabel(notification.type)}
                  </span>
                  <span className="text-[13px] text-slate-400">{formatDate(notification.createdAt)}</span>
                </div>
                <p className="text-[15px] text-slate-800 mb-1.5 leading-relaxed m-0">{notification.message}</p>
                {notification.supplierName && (
                  <p className="text-[13px] text-slate-500 mt-1 m-0">Supplier: {notification.supplierName}</p>
                )}
                {notification.productName && (
                  <p className="text-[13px] text-slate-500 mt-1 m-0">
                    Product: {notification.productName}
                    {notification.quantity && ` • Qty: ${notification.quantity}`}
                  </p>
                )}
              </div>
              {!notification.read && (
                <div className="absolute top-5 right-5 w-2.5 h-2.5 bg-blue-600 rounded-full" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {selectedNotification && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-5"
          onClick={() => setSelectedNotification(null)}
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            <div className="flex justify-between items-center px-7 py-6 border-b-2 border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800 m-0">Notification Details</h2>
              <button
                onClick={() => setSelectedNotification(null)}
                className="w-8 h-8 flex items-center justify-center text-3xl text-slate-400 bg-transparent border-none cursor-pointer rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-all duration-200"
              >
                ×
              </button>
            </div>

            <div className="p-7">
              <div className="flex gap-4 items-start mb-6 pb-5 border-b-2 border-slate-100">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  {getNotificationIcon(selectedNotification.type, 30)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 m-0 mb-1 uppercase tracking-wide">
                    {getTypeLabel(selectedNotification.type)}
                  </h3>
                  <p className="text-[13px] text-slate-400 m-0">{formatDate(selectedNotification.createdAt)}</p>
                </div>
              </div>

              <div className="bg-slate-50 border-l-4 border-blue-500 px-4 py-4 rounded-lg mb-6">
                <p className="m-0 text-[15px] text-slate-800 leading-relaxed">{selectedNotification.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  selectedNotification.poId         && { label: 'PO ID',        value: selectedNotification.poId },
                  selectedNotification.supplierName && { label: 'Supplier',     value: selectedNotification.supplierName },
                  selectedNotification.productName  && { label: 'Product',      value: selectedNotification.productName },
                  selectedNotification.quantity     && { label: 'Quantity',     value: `${selectedNotification.quantity} units` },
                  selectedNotification.totalAmount  && { label: 'Total Amount', value: `Rs. ${Number(selectedNotification.totalAmount).toFixed(2)}` },
                ]
                  .filter(Boolean)
                  .map((item) => (
                    <div key={item.label} className="flex flex-col">
                      <label className="text-[13px] text-slate-500 font-medium mb-1.5">{item.label}</label>
                      <p className="m-0 text-[15px] text-slate-800 font-semibold">{item.value}</p>
                    </div>
                  ))}
              </div>

              {selectedNotification.type === 'ORDER_APPROVED' && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 text-center mb-6">
                  <button
                    onClick={() => handleOrderApproval(selectedNotification)}
                    disabled={processing || selectedNotification.read}
                    className="w-full py-3.5 px-6 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white border-none rounded-lg text-base font-semibold cursor-pointer transition-all duration-200 mb-2"
                  >
                    {processing
                      ? 'Processing...'
                      : selectedNotification.read
                      ? 'Already Processed'
                      : '✓ Mark as Received'}
                  </button>
                  <p className="m-0 text-[13px] text-blue-700">
                    {selectedNotification.read
                      ? 'This order has been processed'
                      : 'Click to confirm product receipt and update inventory'}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-5 border-t-2 border-slate-100 flex-wrap">
                {!selectedNotification.read && (
                  <button
                    onClick={() => markAsRead(selectedNotification.id)}
                    className="flex-1 py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    Mark as Read
                  </button>
                )}
                <button
                  onClick={() => deleteNotification(selectedNotification.id)}
                  className="flex-1 py-3 px-5 bg-slate-100 hover:bg-red-500 text-red-500 hover:text-white border-2 border-red-400 text-sm font-semibold rounded-lg cursor-pointer transition-all duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

export default Notifications;