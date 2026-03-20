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

const STATUS_CONFIG = {
  APPROVED: {
    border: 'border-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300',
    card: 'border-l-emerald-400',
    dot: 'bg-emerald-400',
    cardCount: 'text-emerald-600',
  },
  PACKED: {
    border: 'border-blue-400',
    badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-300',
    card: 'border-l-blue-400',
    dot: 'bg-blue-400',
    cardCount: 'text-blue-600',
  },
  'IN DELIVERY': {
    border: 'border-violet-400',
    badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-300',
    card: 'border-l-violet-400',
    dot: 'bg-violet-400',
    cardCount: 'text-violet-600',
  },
  DELIVERED: {
    border: 'border-slate-300',
    badge: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
    card: 'border-l-slate-300',
    dot: 'bg-slate-400',
    cardCount: 'text-slate-500',
  },
};

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
          date: data.date?.toDate
            ? data.date.toDate().toISOString().split('T')[0]
            : data.date,
        });
      });
      setDeliveries(deliveriesData);
    } catch (error) {
      alert('Failed to load deliveries: ' + error.message);
    } finally {
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
      const updateData = { status: newStatus, updatedAt: new Date() };
      if (trackingNumber) updateData.trackingNumber = trackingNumber;
      if (newStatus === 'PACKED') updateData.packedAt = new Date();
      else if (newStatus === 'IN DELIVERY') updateData.shippedAt = new Date();
      else if (newStatus === 'DELIVERED') updateData.deliveredAt = new Date();
      await updateDoc(deliveryRef, updateData);
      alert(`Delivery status updated to ${newStatus}`);
      fetchDeliveries();
    } catch (error) {
      alert('Failed to update delivery: ' + error.message);
    } finally {
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
    return index >= 0 && index < statusFlow.length - 1 ? statusFlow[index + 1] : null;
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Delivery Status
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track and update order delivery progress
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statusFlow.map((status) => {
          const cfg = STATUS_CONFIG[status];
          const count = deliveries.filter((d) => d.status === status).length;
          return (
            <div
              key={status}
              className={`rounded-xl border-l-4 bg-white p-5 shadow-sm ${cfg.card}`}
            >
              <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
                {status}
              </p>
              <p className={`mt-2 text-4xl font-bold ${cfg.cardCount}`}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Deliveries List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center rounded-xl bg-white py-20 shadow-sm">
            <div className="flex items-center gap-3 text-slate-400">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span className="text-sm font-medium">Loading deliveries…</span>
            </div>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="rounded-xl bg-white py-20 text-center shadow-sm">
            <p className="text-sm text-slate-400">No deliveries found</p>
          </div>
        ) : (
          deliveries.map((delivery) => {
            const nextStatus = getNextStatus(delivery.status);
            const isUpdating = updatingId === delivery.id;
            const cfg = STATUS_CONFIG[delivery.status] || {};

            return (
              <div
                key={delivery.id}
                className={`flex flex-col gap-5 rounded-xl border-2 bg-white p-6 shadow-sm transition-opacity sm:flex-row sm:items-start sm:justify-between ${cfg.border} ${isUpdating ? 'opacity-60' : ''}`}
              >
                {/* Left: Info */}
                <div className="flex-1 space-y-4">
                  {/* Status badge + PO */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      {delivery.status}
                    </span>
                    <span className="text-base font-bold text-slate-800">
                      {delivery.poId}
                    </span>
                    <span className="text-sm text-slate-500">{delivery.product}</span>
                  </div>

                  {/* Grid details */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Pharmacy
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-slate-700">
                        {delivery.pharmacy}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Quantity
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-slate-700">
                        {delivery.quantity} units
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Order Date
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-slate-700">
                        {delivery.date}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Amount
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-emerald-600">
                        ${delivery.amount?.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Tracking */}
                  {delivery.trackingNumber && (
                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10" />
                      </svg>
                      <span className="font-medium text-slate-500">Tracking:</span>
                      <span className="font-mono text-slate-700">{delivery.trackingNumber}</span>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:items-end">
                  {nextStatus && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(delivery, nextStatus)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <>
                          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Updating…
                        </>
                      ) : (
                        <>
                          Mark as {nextStatus}
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                          </svg>
                        </>
                      )}
                    </button>
                  )}

                  <select
                    value={delivery.status}
                    disabled={isUpdating}
                    onChange={(e) => handleStatusChange(delivery, e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Change Status…</option>
                    {statusFlow.map((s) => (
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