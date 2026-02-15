import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc,
  updateDoc,
  query,
  where,
  orderBy 
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import './UpdateDelivery.css';

const UpdateDelivery = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const statusFlow = ['APPROVED', 'PACKED', 'IN DELIVERY', 'DELIVERED'];

  const fetchDeliveries = async () => {
    try {
      setLoading(true);

      const deliveriesQuery = query(
        collection(db, 'purchaseOrders'),
        where('status', 'in', statusFlow),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(deliveriesQuery);
      const deliveriesData = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        deliveriesData.push({
          id: doc.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate().toISOString().split('T')[0] : data.date
        });
      });

      setDeliveries(deliveriesData);
      setLoading(false);
    } catch (error) {
      alert('Failed to load deliveries: ' + error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const updateDeliveryStatus = async (deliveryId, newStatus, trackingNumber = '') => {
    try {
      setUpdatingId(deliveryId);

      const deliveryRef = doc(db, 'purchaseOrders', deliveryId);
      const updateData = {
        status: newStatus,
        updatedAt: new Date()
      };

      if (trackingNumber) updateData.trackingNumber = trackingNumber;
      if (newStatus === 'PACKED') updateData.packedAt = new Date();
      else if (newStatus === 'IN DELIVERY') updateData.shippedAt = new Date();
      else if (newStatus === 'DELIVERED') updateData.deliveredAt = new Date();

      await updateDoc(deliveryRef, updateData);

      alert(`Delivery status updated to ${newStatus}`);
      fetchDeliveries();
      setUpdatingId(null);
    } catch (error) {
      alert('Failed to update delivery: ' + error.message);
      setUpdatingId(null);
    }
  };

  const handleStatusChange = (delivery, newStatus) => {
    if (newStatus === 'IN DELIVERY' && !delivery.trackingNumber) {
      const trackingNumber = window.prompt('Enter tracking number:');
      if (trackingNumber) updateDeliveryStatus(delivery.id, newStatus, trackingNumber);
    } else {
      if (window.confirm(`Update status to ${newStatus}?`)) {
        updateDeliveryStatus(delivery.id, newStatus);
      }
    }
  };

  const getNextStatus = (currentStatus) => {
    const index = statusFlow.indexOf(currentStatus);
    return index >= 0 && index < statusFlow.length - 1
      ? statusFlow[index + 1]
      : null;
  };

  const getStatusColor = (status) => ({
    'APPROVED': 'approved',
    'PACKED': 'packed',
    'IN DELIVERY': 'in-delivery',
    'DELIVERED': 'delivered'
  }[status]);

  return (
    <div className="ud-container">
      <div className="ud-header">
        <h1>Update Delivery Status</h1>
        <p>Track and update order delivery progress</p>
      </div>

      <div className="ud-cards">
        {statusFlow.map(status => (
          <div key={status} className={`ud-card ${getStatusColor(status)}`}>
            <div className="ud-card-title">{status}</div>
            <div className="ud-card-count">
              {deliveries.filter(d => d.status === status).length}
            </div>
          </div>
        ))}
      </div>

      <div className="ud-list">
        {loading ? (
          <div className="ud-empty">Loading deliveries...</div>
        ) : deliveries.length === 0 ? (
          <div className="ud-empty">No deliveries found</div>
        ) : (
          deliveries.map(delivery => {
            const nextStatus = getNextStatus(delivery.status);
            const isUpdating = updatingId === delivery.id;

            return (
              <div key={delivery.id} className={`ud-item ${getStatusColor(delivery.status)}`}>
                <div className="ud-main">
                  <div className="ud-info">
                    <span className="ud-badge">{delivery.status}</span>
                    <div>
                      <div className="ud-po">{delivery.poId}</div>
                      <div className="ud-product">{delivery.product}</div>
                    </div>
                  </div>

                  <div className="ud-grid">
                    <div><span>Pharmacy</span>{delivery.pharmacy}</div>
                    <div><span>Quantity</span>{delivery.quantity} units</div>
                    <div><span>Order Date</span>{delivery.date}</div>
                    <div className="ud-amount">${delivery.amount?.toFixed(2)}</div>
                  </div>

                  {delivery.trackingNumber && (
                    <div className="ud-tracking">
                      Tracking Number: {delivery.trackingNumber}
                    </div>
                  )}
                </div>

                <div className="ud-actions">
                  {nextStatus && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(delivery, nextStatus)}
                    >
                      {isUpdating ? 'Updating...' : `Mark as ${nextStatus}`}
                    </button>
                  )}

                  <select
                    value={delivery.status}
                    disabled={isUpdating}
                    onChange={(e) => handleStatusChange(delivery, e.target.value)}
                  >
                    <option value="">Change Status...</option>
                    {statusFlow.map(s => (
                      <option key={s} value={s} disabled={s === delivery.status}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UpdateDelivery;
