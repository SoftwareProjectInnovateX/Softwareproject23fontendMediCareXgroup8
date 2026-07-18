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

const STATUS_FLOW  = ['APPROVED', 'PACKED', 'IN DELIVERY', 'DELIVERED'];
const ALL_STATUSES = [...STATUS_FLOW, 'COMPLETED'];

const COURIERS = [
  { id: 'citypak', name: 'Citypak',       trackUrl: (tn) => `https://track.citypak.lk/?awb=${tn}` },
  { id: 'domex',   name: 'Domex Express', trackUrl: (tn) => `https://domex.lk/track?ref=${tn}` },
  { id: 'other',   name: 'Other / Manual', trackUrl: null },
];

/* ── Backend API helper (same pattern as useNotifications.js) ── */
const RAW_API_URL = import.meta.env.VITE_API_URL_RAILWAY || 'http://localhost:5000';
const API_BASE = `${RAW_API_URL.replace(/\/$/, '')}/api`;
const apiFetch = async (url, options = {}) => {
  const res = await fetch(`${API_BASE}${url}`, options);
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
};

const formatDateOnly = (ts) => {
  if (!ts) return '—';
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toISOString().split('T')[0];
  } catch { return '—'; }
};

/* ── Inline Toast Notification ── */
const Toast = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg border text-sm font-medium transition-all
            ${t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              t.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800' :
              t.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                     'bg-blue-50 border-blue-200 text-blue-800'}`}
        >
          <span className="mt-0.5 shrink-0">
            {t.type === 'success' && (
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg>
            )}
            {t.type === 'error' && (
              <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            )}
            {t.type === 'warning' && (
              <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            )}
            {t.type === 'info' && (
              <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
            )}
          </span>
          <span className="flex-1 leading-snug">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="shrink-0 text-current opacity-40 hover:opacity-70 transition-opacity">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
};

/* ── Tracking Number Modal (replaces window.prompt) ── */
const TrackingModal = ({ onConfirm, onCancel }) => {
  const [value, setValue] = useState('');
  const [courierId, setCourierId] = useState(COURIERS[0].id);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Enter Tracking Number</h3>
            <p className="text-xs text-slate-500 mt-0.5">Required before marking as In Delivery</p>
          </div>
        </div>

        <label className="block text-xs font-medium text-slate-500 mb-1.5">Courier</label>
        <select
          value={courierId}
          onChange={(e) => setCourierId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 mb-4"
        >
          {COURIERS.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <label className="block text-xs font-medium text-slate-500 mb-1.5">Tracking Number</label>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onConfirm(value.trim(), courierId); }}
          placeholder="e.g. TRK-20240101-001"
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 mb-4"
        />
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            disabled={!value.trim()}
            onClick={() => value.trim() && onConfirm(value.trim(), courierId)}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Confirm Status Modal (replaces window.confirm) ── */
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 mx-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
          <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-800">Confirm Status Update</h3>
      </div>
      <p className="text-sm text-slate-600 mb-5 leading-relaxed">{message}</p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
);

let toastIdCounter = 0;

const UpdateDelivery = () => {
  const [supplierId,    setSupplierId]    = useState(null);
  const [deliveries,    setDeliveries]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [updatingId,    setUpdatingId]    = useState(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [toasts,        setToasts]        = useState([]);
  const [trackingModal, setTrackingModal] = useState(null);  // { delivery, newStatus }
  const [confirmModal,  setConfirmModal]  = useState(null);  // { message, delivery, newStatus }

  const addToast = (message, type = 'info') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setSupplierId(user?.uid ?? null));
    return () => unsub();
  }, []);

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
      (err) => {
        addToast('Failed to load deliveries: ' + err.message, 'error');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [supplierId]);

  const updateDeliveryStatus = async (deliveryId, newStatus, trackingNumber = '', courierId = '') => {
    try {
      setUpdatingId(deliveryId);
      const payload = { status: newStatus, updatedAt: new Date() };

      const courier = COURIERS.find((c) => c.id === courierId);
      const trackingUrl = (courier && courier.trackUrl && trackingNumber)
        ? courier.trackUrl(trackingNumber)
        : '';

      if (trackingNumber)              payload.trackingNumber = trackingNumber;
      if (courierId)                   payload.courierId      = courierId;
      if (trackingUrl)                 payload.trackingUrl    = trackingUrl;
      if (newStatus === 'PACKED')      payload.packedAt       = new Date();
      if (newStatus === 'IN DELIVERY') payload.shippedAt      = new Date();
      if (newStatus === 'DELIVERED')   payload.deliveredAt    = new Date();

      await updateDoc(doc(db, 'purchaseOrders', deliveryId), payload);

      if (newStatus === 'IN DELIVERY' && trackingNumber) {
        const delivery = deliveries.find((d) => d.id === deliveryId);
        try {
          await apiFetch('/notifications/order-shipped', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: deliveryId,
              poId: delivery?.poId,
              supplierName: delivery?.supplierName,
              courier: courier?.name || courierId,
              trackingNumber,
              trackingUrl,
            }),
          });
        } catch (notifErr) {
          addToast('Status updated, but failed to notify admin: ' + notifErr.message, 'warning');
        }
      }

      addToast(`Status updated to ${newStatus}`, 'success');
    } catch (err) {
      addToast('Failed to update delivery: ' + err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = (delivery, newStatus) => {
    if (delivery.initialPaymentStatus !== 'PAID') {
      addToast('Delivery is locked. Proceed once MediCareX has paid the initial 50% payment. Check the Invoice & Payments page.', 'warning');
      return;
    }
    if (newStatus === 'IN DELIVERY' && !delivery.trackingNumber) {
      setTrackingModal({ delivery, newStatus });
    } else {
      setConfirmModal({
        message: `Are you sure you want to update the status of ${delivery.poId} to "${newStatus}"?`,
        delivery,
        newStatus,
      });
    }
  };

  const activeDeliveries    = deliveries.filter((d) => d.status !== 'COMPLETED');
  const completedDeliveries = deliveries.filter((d) => d.status === 'COMPLETED');
  const hasLockedApproved   = activeDeliveries.some(
    (d) => d.initialPaymentStatus !== 'PAID' && d.status === 'APPROVED'
  );

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">

      <Toast toasts={toasts} onDismiss={dismissToast} />

      {trackingModal && (
        <TrackingModal
          onConfirm={(tn, courierId) => {
            updateDeliveryStatus(trackingModal.delivery.id, trackingModal.newStatus, tn, courierId);
            setTrackingModal(null);
          }}
          onCancel={() => setTrackingModal(null)}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={() => {
            updateDeliveryStatus(confirmModal.delivery.id, confirmModal.newStatus);
            setConfirmModal(null);
          }}
          onCancel={() => setConfirmModal(null)}
        />
      )}

    {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-start gap-3">
          {/* Icon (if you add one later, place here) */}
          
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Delivery Status
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Track and update order delivery progress
            </p>
          </div>
        </div>
      </div>
      {/* Status summary cards */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {ALL_STATUSES.map((status) => (
          <Card
            key={status}
            title={status}
            value={deliveries.filter((d) => d.status === status).length}
          />
        ))}
      </div>

      {/* Warning banner */}
      {hasLockedApproved && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-sm text-amber-800 font-medium">
            Some orders are awaiting initial payment from MediCareX before delivery can begin.
          </p>
        </div>
      )}

      {/* Active deliveries */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl bg-white border border-slate-200 py-20">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <svg className="h-6 w-6 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span className="text-sm font-medium">Loading deliveries…</span>
            </div>
          </div>
        ) : activeDeliveries.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl bg-white border border-slate-200 py-14">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
              <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500">No active deliveries found</p>
            <p className="text-xs text-slate-400 mt-1">New orders will appear here once approved</p>
          </div>
        ) : (
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

      {/* Completed orders */}
      {!loading && completedDeliveries.length > 0 && (
        <div className="mt-10">
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="mb-4 flex w-full items-center justify-between rounded-xl bg-white border border-slate-200 px-5 py-3.5 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100">
                <svg className="h-3.5 w-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-700">Completed Orders</span>
              <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-700">
                {completedDeliveries.length}
              </span>
            </div>
            <svg
              className={`h-4 w-4 text-slate-400 transition-transform ${showCompleted ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

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