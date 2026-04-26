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

/**
 * Ordered sequence of delivery statuses a purchase order progresses through.
 * Used to drive status-change logic and filter queries.
 */
const STATUS_FLOW  = ['APPROVED', 'PACKED', 'IN DELIVERY', 'DELIVERED'];

/**
 * Full set of statuses fetched from Firestore, including COMPLETED orders
 * which are displayed separately from the active delivery list.
 */
const ALL_STATUSES = [...STATUS_FLOW, 'COMPLETED'];

/**
 * Converts a Firestore Timestamp or any Date-constructable value to a
 * "YYYY-MM-DD" date string. Returns "—" for null, invalid, or missing values.
 *
 * @param {Timestamp|Date|string|number|null} ts - The value to format.
 * @returns {string} ISO date string (date part only) or "—".
 */
const formatDateOnly = (ts) => {
  if (!ts) return '—';
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toISOString().split('T')[0];
  } catch { return '—'; }
};

/**
 * UpdateDelivery page — allows the logged-in supplier to track and advance
 * the delivery status of their approved purchase orders.
 *
 * Status progression: APPROVED → PACKED → IN DELIVERY → DELIVERED → COMPLETED
 *
 * Key behaviours:
 *   - Uses a real-time Firestore listener (onSnapshot) so status changes made
 *     by other parties are reflected immediately without a page refresh.
 *   - Locks status advancement if the admin's initial 50% payment has not been
 *     confirmed, preventing dispatch before financial clearance.
 *   - Requires a tracking number when transitioning to IN DELIVERY.
 *   - Completed orders are shown in a collapsible section separate from active ones.
 */
const UpdateDelivery = () => {
  const [supplierId,    setSupplierId]    = useState(null);
  const [deliveries,    setDeliveries]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [updatingId,    setUpdatingId]    = useState(null);  // ID of the delivery currently being updated
  const [showCompleted, setShowCompleted] = useState(true);  // controls collapsible completed section

  /* ── Auth ────────────────────────────────────────────────────────────────── */
  /**
   * Subscribes to Firebase Auth state changes to resolve the current supplier's UID.
   * Sets supplierId to null when the user signs out, which halts the Firestore listener.
   */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setSupplierId(user?.uid ?? null));
    return () => unsub();
  }, []);

  /* ── Real-time listener ──────────────────────────────────────────────────── */
  /**
   * Opens a real-time Firestore listener on `purchaseOrders` for all statuses
   * in ALL_STATUSES that belong to the current supplier.
   *
   * onSnapshot is preferred over getDocs so that status updates from the admin
   * side (e.g. payment confirmation) are reflected in real time without polling.
   *
   * Each document is mapped to a flat object with normalised timestamp fields
   * (prefixed with _) to avoid conflicts with other data properties, plus a
   * pre-formatted `date` string for display.
   *
   * The listener is cleaned up on unmount or when supplierId changes.
   */
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
        setDeliveries(snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id, ...data,
            // Normalised timestamp fields for use in DeliveryCard timeline display
            _createdAt:   data.createdAt,
            _packedAt:    data.packedAt,
            _shippedAt:   data.shippedAt,
            _deliveredAt: data.deliveredAt,
            _completedAt: data.completedAt,
            // Pre-formatted date string — falls back to createdAt if date is absent
            date: formatDateOnly(data.date ?? data.createdAt),
          };
        }));
        setLoading(false);
      },
      (err) => { alert('Failed to load deliveries: ' + err.message); setLoading(false); }
    );

    return () => unsub();
  }, [supplierId]);

  /* ── Update status ───────────────────────────────────────────────────────── */
  /**
   * Writes a status update to the `purchaseOrders` document and stamps the
   * appropriate milestone timestamp for the new status.
   *
   * Sets `updatingId` while the write is in progress so the DeliveryCard can
   * display a loading indicator and disable its action buttons.
   *
   * @param {string} deliveryId     - Firestore document ID of the order to update.
   * @param {string} newStatus      - The target status from STATUS_FLOW.
   * @param {string} trackingNumber - Optional tracking number added on IN DELIVERY.
   */
  const updateDeliveryStatus = async (deliveryId, newStatus, trackingNumber = '') => {
    try {
      setUpdatingId(deliveryId);
      const payload = { status: newStatus, updatedAt: new Date() };

      // Attach the optional tracking number when provided
      if (trackingNumber)              payload.trackingNumber = trackingNumber;

      // Stamp the relevant milestone timestamp for the new status
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

  /**
   * Validates preconditions before advancing a delivery's status, then
   * delegates to updateDeliveryStatus.
   *
   * Preconditions:
   *   1. The admin's initial 50% payment must be confirmed (initialPaymentStatus === 'PAID').
   *      If not, the delivery is locked and the supplier is directed to the payments page.
   *   2. Transitioning to IN DELIVERY requires a tracking number entered via prompt.
   *      If the supplier cancels the prompt, the update is aborted.
   *   3. All other transitions require a confirmation dialog.
   *
   * @param {Object} delivery  - The delivery object from local state.
   * @param {string} newStatus - The target status requested by the supplier.
   */
  const handleStatusChange = (delivery, newStatus) => {
    // Block advancement until the admin's initial payment has been confirmed
    if (delivery.initialPaymentStatus !== 'PAID') {
      alert('Delivery is locked.\n\nYou can only proceed once MediCareX has paid the initial 50% payment.\n\nCheck the Invoice & Payments page for the payment status.');
      return;
    }
    // Prompt for a tracking number before transitioning to IN DELIVERY
    if (newStatus === 'IN DELIVERY' && !delivery.trackingNumber) {
      const tn = window.prompt('Enter tracking number:');
      if (tn) updateDeliveryStatus(delivery.id, newStatus, tn);
    } else if (window.confirm(`Update status to ${newStatus}?`)) {
      updateDeliveryStatus(delivery.id, newStatus);
    }
  };

  // Separate active and completed deliveries for rendering in distinct sections
  const activeDeliveries    = deliveries.filter((d) => d.status !== 'COMPLETED');
  const completedDeliveries = deliveries.filter((d) => d.status === 'COMPLETED');

  // True when at least one APPROVED order is awaiting initial payment — drives the locked notice banner
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

      {/* Summary Cards — one card per status showing the count of orders at that stage */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {ALL_STATUSES.map((status) => (
          <Card
            key={status}
            title={status}
            value={deliveries.filter((d) => d.status === status).length}
          />
        ))}
      </div>

      {/* Locked Payment Notice — shown only when an APPROVED order is awaiting initial payment */}
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

      {/* Active Deliveries — three render states: loading, empty, and populated */}
      <div className="space-y-4">
        {loading ? (
          // Loading state — spinner shown while Firestore snapshot is pending
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
          // Empty state — no active orders for this supplier
          <div className="rounded-xl bg-white py-12 text-center shadow-sm">
            <p className="text-sm text-slate-400">No active deliveries found</p>
          </div>
        ) : (
          // Populated state — each active delivery rendered as a DeliveryCard
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

      {/* Completed Deliveries — collapsible section shown only when completed orders exist */}
      {!loading && completedDeliveries.length > 0 && (
        <div className="mt-10">
          {/* Toggle button — chevron rotates to indicate expanded/collapsed state */}
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="mb-4 flex w-full items-center justify-between rounded-xl bg-teal-50 border border-teal-200 px-5 py-3 text-left transition hover:bg-teal-100"
          >
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              <span className="text-sm font-semibold text-teal-800">Completed Orders</span>
              {/* Count badge showing how many orders are fully completed */}
              <span className="rounded-full bg-teal-200 px-2 py-0.5 text-xs font-bold text-teal-800">
                {completedDeliveries.length}
              </span>
            </div>
            <svg
              className={`h-4 w-4 text-teal-600 transition-transform ${showCompleted ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {/* Completed order cards — only rendered when the section is expanded */}
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