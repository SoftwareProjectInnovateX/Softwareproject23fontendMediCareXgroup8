// src/pages/AdminNotifications/AdminNotifications.jsx
import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import './Notifications.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [processing, setProcessing] = useState(false);

  const notificationTypes = ['All', 'ORDER_PLACED', 'ORDER_APPROVED', 'ORDER_REJECTED', 'LOW_STOCK_ALERT'];

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('recipientType', '==', 'admin'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(notificationsQuery);
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setNotifications(notificationsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      alert('Failed to load notifications: ' + error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Filter notifications
  const filteredNotifications = filter === 'All' 
    ? notifications 
    : notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Mark as read
  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const updatePromises = unreadNotifications.map(n =>
        updateDoc(doc(db, 'notifications', n.id), { read: true })
      );
      await Promise.all(updatePromises);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
      alert('Failed to mark all as read');
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    const confirmDelete = window.confirm('Delete this notification?');
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      fetchNotifications();
      setSelectedNotification(null);
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Failed to delete notification');
    }
  };

  // Handle order approval (mark as received)
  const handleOrderApproval = async (notification) => {
    try {
      setProcessing(true);

      // Get order details
      const orderRef = doc(db, 'purchaseOrders', notification.orderId);
      const orderSnap = await getDoc(orderRef);

      if (!orderSnap.exists()) {
        alert('Order not found');
        return;
      }

      const order = orderSnap.data();

      // Check if order is approved
      if (order.status !== 'APPROVED') {
        alert('Order must be APPROVED before marking as received');
        return;
      }

      const confirmReceive = window.confirm(
        `Mark order ${order.poId} as RECEIVED?\n\nThis will:\n- Update order status to COMPLETED\n- Add ${order.quantity} units to your inventory\n- Update product availability`
      );

      if (!confirmReceive) {
        setProcessing(false);
        return;
      }

      // Update order to COMPLETED
      await updateDoc(orderRef, {
        status: 'COMPLETED',
        completionDate: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Update adminProducts stock
      const adminProductRef = doc(db, 'adminProducts', order.adminProductId);
      const adminProductSnap = await getDoc(adminProductRef);

      if (adminProductSnap.exists()) {
        const currentStock = adminProductSnap.data().stock || 0;
        await updateDoc(adminProductRef, {
          stock: currentStock + order.quantity,
          availability: 'in stock',
          lastRestocked: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      // Mark notification as read
      await updateDoc(doc(db, 'notifications', notification.id), {
        read: true
      });

      alert('✅ Order marked as received!\n\nInventory has been updated.');
      fetchNotifications();
      setSelectedNotification(null);
    } catch (error) {
      console.error('Error handling order approval:', error);
      alert('❌ Failed to process order: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ORDER_PLACED':
        return '🛒';
      case 'ORDER_APPROVED':
        return '✅';
      case 'ORDER_REJECTED':
        return '❌';
      case 'LOW_STOCK_ALERT':
        return '⚠️';
      default:
        return '📢';
    }
  };

  // Get notification type label
  const getTypeLabel = (type) => {
    return type.replace(/_/g, ' ');
  };

  // Get notification class
  const getNotificationClass = (type) => {
    switch (type) {
      case 'ORDER_PLACED':
        return 'notif-order-placed';
      case 'ORDER_APPROVED':
        return 'notif-order-approved';
      case 'ORDER_REJECTED':
        return 'notif-order-rejected';
      case 'LOW_STOCK_ALERT':
        return 'notif-low-stock';
      default:
        return '';
    }
  };

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <div>
          <h1>Notifications</h1>
          <p>Stay updated with supplier responses and stock alerts</p>
        </div>
        {unreadCount > 0 && (
          <button className="mark-all-read-btn" onClick={markAllAsRead}>
            Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Statistics */}
      <div className="notif-stats">
        <div className="stat-item">
          <span className="stat-label">Total</span>
          <span className="stat-value">{notifications.length}</span>
        </div>
        <div className="stat-item unread">
          <span className="stat-label">Unread</span>
          <span className="stat-value">{unreadCount}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Order Approved</span>
          <span className="stat-value">
            {notifications.filter(n => n.type === 'ORDER_APPROVED').length}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Low Stock</span>
          <span className="stat-value">
            {notifications.filter(n => n.type === 'LOW_STOCK_ALERT').length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="notif-filters">
        {notificationTypes.map(type => (
          <button
            key={type}
            className={`filter-btn ${filter === type ? 'active' : ''}`}
            onClick={() => setFilter(type)}
          >
            {type === 'All' ? 'All' : getTypeLabel(type)}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="notifications-list">
        {loading ? (
          <div className="loading-state">
            <p>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <p>No notifications found</p>
            <small>You'll see updates from suppliers here</small>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-card ${!notification.read ? 'unread' : ''} ${getNotificationClass(notification.type)}`}
              onClick={() => setSelectedNotification(notification)}
            >
              <div className="notif-icon">{getNotificationIcon(notification.type)}</div>
              
              <div className="notif-content">
                <div className="notif-header-row">
                  <span className="notif-type">{getTypeLabel(notification.type)}</span>
                  <span className="notif-date">{formatDate(notification.createdAt)}</span>
                </div>
                
                <p className="notif-message">{notification.message}</p>
                
                {notification.supplierName && (
                  <div className="notif-meta">
                    <span>Supplier: {notification.supplierName}</span>
                  </div>
                )}

                {notification.productName && (
                  <div className="notif-meta">
                    <span>Product: {notification.productName}</span>
                    {notification.quantity && <span> • Qty: {notification.quantity}</span>}
                  </div>
                )}
              </div>

              {!notification.read && <div className="unread-badge"></div>}
            </div>
          ))
        )}
      </div>

      {/* Notification Details Modal */}
      {selectedNotification && (
        <div className="modal-overlay" onClick={() => setSelectedNotification(null)}>
          <div className="notif-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Notification Details</h2>
              <button className="close-btn" onClick={() => setSelectedNotification(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="notif-detail-header">
                <span className="notif-icon-large">{getNotificationIcon(selectedNotification.type)}</span>
                <div>
                  <h3>{getTypeLabel(selectedNotification.type)}</h3>
                  <p className="notif-date">{formatDate(selectedNotification.createdAt)}</p>
                </div>
              </div>

              <div className="notif-message-box">
                <p>{selectedNotification.message}</p>
              </div>

              <div className="notif-details-grid">
                {selectedNotification.poId && (
                  <div className="detail-item">
                    <label>PO ID</label>
                    <p>{selectedNotification.poId}</p>
                  </div>
                )}
                {selectedNotification.supplierName && (
                  <div className="detail-item">
                    <label>Supplier</label>
                    <p>{selectedNotification.supplierName}</p>
                  </div>
                )}
                {selectedNotification.productName && (
                  <div className="detail-item">
                    <label>Product</label>
                    <p>{selectedNotification.productName}</p>
                  </div>
                )}
                {selectedNotification.quantity && (
                  <div className="detail-item">
                    <label>Quantity</label>
                    <p>{selectedNotification.quantity} units</p>
                  </div>
                )}
                {selectedNotification.totalAmount && (
                  <div className="detail-item">
                    <label>Total Amount</label>
                    <p>Rs. {Number(selectedNotification.totalAmount).toFixed(2)}</p>
                  </div>
                )}
              </div>

              {/* Action buttons based on notification type */}
              {selectedNotification.type === 'ORDER_APPROVED' && (
                <div className="action-section">
                  <button
                    className="receive-order-btn"
                    onClick={() => handleOrderApproval(selectedNotification)}
                    disabled={processing || selectedNotification.read}
                  >
                    {processing ? 'Processing...' : selectedNotification.read ? 'Already Processed' : '✓ Mark as Received'}
                  </button>
                  <p className="action-hint">
                    {selectedNotification.read 
                      ? 'This order has been processed' 
                      : 'Click to confirm product receipt and update inventory'}
                  </p>
                </div>
              )}

              <div className="modal-actions">
                {!selectedNotification.read && (
                  <button
                    className="mark-read-btn"
                    onClick={() => markAsRead(selectedNotification.id)}
                  >
                    Mark as Read
                  </button>
                )}
                <button
                  className="delete-btn"
                  onClick={() => deleteNotification(selectedNotification.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;