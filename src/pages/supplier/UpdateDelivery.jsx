import React, { useState, useEffect } from 'react';
import {
  collection, doc, updateDoc, query, where,
  orderBy, onSnapshot,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../services/firebase';
import Card from '../../components/Card';
import DeliveryCard from '../../components/DeliveryCard';
import CompletedDeliveryCard from '../../components/CompletedDeliveryCard';

// Order of statuses a delivery moves through
const STATUS_FLOW  = ['APPROVED', 'PACKED', 'IN DELIVERY', 'DELIVERED'];

// All statuses including COMPLETED for Firestore queries
const ALL_STATUSES = [...STATUS_FLOW, 'COMPLETED'];

// Format Firestore timestamp to "YYYY-MM-DD", returns "—" if invalid
const formatDateOnly = (ts) => {
  if (!ts) return '—';
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toISOString().split('T')[0];
  } catch { return '—'; }
};

const UpdateDelivery = () => {
  const [supplierId,    setSupplierId]    = useState(null);
  const [deliveries,    setDeliveries]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [updatingId,    setUpdatingId]    = useState(null);  // tracks which delivery is being updated
  const [showCompleted, setShowCompleted] = useState(true);  // toggle for completed section

  // Listen for auth state and store current user's UID
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setSupplierId(user?.uid ?? null));
    return () => unsub();
  }, []);

  // Real-time listener for supplier's purchase orders from Firestore
  useEffect(() => {
    if (!supplierId) { setLoading(false); return; }
    setLoading(true);

    const q = query(
      collection(db, 'purchaseOrders'),
      where('supplierId', '==', supplierId),
      where('status', 'in', ALL_STATUSES),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q,
      (snapshot) => {
        // Map each doc to a flat object with normalized timestamps and formatted date
        setDeliveries(snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id, ...data,
            _createdAt:   data.createdAt,
            _packedAt:    data.packedAt,
            _shippedAt:   data.shippedAt,
            _deliveredAt: data.deliveredAt,
            _completedAt: data.completedAt,
            date: formatDateOnly(data.date ?? data.createdAt),
          };
        }));
        setLoading(false);
      },
      (err) => { alert('Failed to load deliveries: ' + err.message); setLoading(false); }
    );

    return () => unsub(); // cleanup listener on unmount
  }, [supplierId]);

  // Write new status to Firestore and stamp the matching milestone timestamp
  const updateDeliveryStatus = async (deliveryId, newStatus, trackingNumber = '') => {
    try {
      setUpdatingId(deliveryId);
      const payload = { status: newStatus, updatedAt: new Date() };

      if (trackingNumber)              payload.trackingNumber = trackingNumber;

      // Stamp timestamp based on which stage was reached
      if (newStatus === 'PACKED')      payload.packedAt       = new Date();
      if (newStatus === 'IN DELIVERY') payload.shippedAt      = new Date();
      if (newStatus === 'DELIVERED')   payload.deliveredAt    = new Date();

      await updateDoc(doc(db, 'purchaseOrders', deliveryId), payload);
      alert(`Delivery status updated to ${newStatus}`);
    } catch (err) {
      alert('Failed to update delivery: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Validate preconditions before advancing status
  const handleStatusChange = (delivery, newStatus) => {
    // Block if admin hasn't confirmed the initial 50% payment
    if (delivery.initialPaymentStatus !== 'PAID') {
      alert('Delivery is locked.\n\nYou can only proceed once MediCareX has paid the initial 50% payment.\n\nCheck the Invoice & Payments page for the payment status.');
      return;
    }
    // Require tracking number before moving to IN DELIVERY
    if (newStatus === 'IN DELIVERY' && !delivery.trackingNumber) {
      const tn = window.prompt('Enter tracking number:');
      if (tn) updateDeliveryStatus(delivery.id, newStatus, tn);
    } else if (window.confirm(`Update status to ${newStatus}?`)) {
      updateDeliveryStatus(delivery.id, newStatus);
    }
  };

  // Split deliveries into active and completed for separate rendering
  const activeDeliveries    = deliveries.filter((d) => d.status !== 'COMPLETED');
  const completedDeliveries = deliveries.filter((d) => d.status === 'COMPLETED');

  // Show locked notice if any approved order is awaiting payment
  const hasLockedApproved   = activeDeliveries.some(
    (d) => d.initialPaymentStatus !== 'PAID' && d.status === 'APPROVED'
  );

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Delivery Status</h1>
        <p className="mt-1 text-sm text-slate-500">Track and update order delivery progress</p>
      </div>

      {/* Status summary cards — shows count per status */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {ALL_STATUSES.map((status) => (
          <Card
            key={status}
            title={status}
            value={deliveries.filter((d) => d.status === status).length}
          />
        ))}
      </div>

      {/* Warning banner when an order is locked due to unpaid initial payment */}
      {hasLockedApproved && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-300 p-4">
          <svg className="h-5 w-5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-amber-800 font-medium m-0">
            Some orders are awaiting initial payment from MediCareX before delivery can begin.
          </p>
        </div>
      )}

      {/* Active deliveries — handles loading, empty, and populated states */}
      <div className="space-y-4">
        {loading ? (
          // Spinner while data loads
          <div className="flex items-center justify-center rounded-xl bg-white py-20 shadow-sm">
            <div className="flex items-center gap-3 text-slate-400">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span className="text-sm font-medium">Loading deliveries…</span>
            </div>
          </div>
        ) : activeDeliveries.length === 0 ? (
          // Empty state
          <div className="rounded-xl bg-white py-12 text-center shadow-sm">
            <p className="text-sm text-slate-400">No active deliveries found</p>
          </div>
        ) : (
          // Render a card for each active delivery
          activeDeliveries.map((delivery) => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              isUpdating={updatingId === delivery.id}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </div>

      {/* Completed orders — collapsible, shown only when completed orders exist */}
      {!loading && completedDeliveries.length > 0 && (
        <div className="mt-10">
          {/* Toggle button with rotating chevron */}
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="mb-4 flex w-full items-center justify-between rounded-xl bg-teal-50 border border-teal-200 px-5 py-3 text-left transition hover:bg-teal-100"
          >
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              <span className="text-sm font-semibold text-teal-800">Completed Orders</span>
              {/* Badge showing completed order count */}
              <span className="rounded-full bg-teal-200 px-2 py-0.5 text-xs font-bold text-teal-800">
                {completedDeliveries.length}
              </span>
            </div>
            {/* Chevron rotates when section is expanded */}
            <svg
              className={`h-4 w-4 text-teal-600 transition-transform ${showCompleted ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {/* Render completed cards only when section is expanded */}
          {showCompleted && (
            <div className="space-y-4">
              {completedDeliveries.map((delivery) => (
                <CompletedDeliveryCard key={delivery.id} delivery={delivery} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UpdateDelivery;