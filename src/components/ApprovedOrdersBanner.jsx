'use client';

import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import {
  collection, query, where, onSnapshot, updateDoc, doc, Timestamp,
} from "firebase/firestore";

function StatusBadge({ status }) {
  const map = {
    APPROVED: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7", label: "Approved" },
    PENDING:  { bg: "#fef3c7", color: "#92400e", border: "#fcd34d", label: "Pending" },
    REJECTED: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5", label: "Rejected" },
  };
  const s = map[status] || { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1", label: status };
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: 20,
      padding: "3px 11px",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    }}>
      {s.label}
    </span>
  );
}

function OrderCard({ order, onDismiss }) {
  const [dismissing, setDismissing] = useState(false);

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await updateDoc(doc(db, "purchaseOrders", order.id), {
        pharmacistAcknowledged: true,
        acknowledgedAt: Timestamp.now(),
      });
      onDismiss(order.id);
    } catch (e) {
      console.error("Dismiss failed", e);
      setDismissing(false);
    }
  };

  return (
    <div style={{
      background: "#ffffff",
      border: "1.5px solid #bbf7d0",
      borderRadius: 14,
      padding: "16px 20px",
      display: "flex",
      alignItems: "flex-start",
      gap: 16,
      position: "relative",
      boxShadow: "0 1px 4px rgba(16,185,129,0.08)",
    }}>
      {/* Green left accent bar */}
      <div style={{
        position: "absolute",
        left: 0, top: 12, bottom: 12,
        width: 4,
        background: "#10b981",
        borderRadius: "0 4px 4px 0",
      }} />

      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: "#d1fae5",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
            {order.product}
          </span>
          <StatusBadge status={order.status} />
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "4px 20px",
          marginTop: 8,
        }}>
          {[
            { label: "PO ID",         value: order.poId },
            { label: "Qty Ordered",   value: `${order.quantity} units` },
            { label: "Unit Price",    value: `Rs. ${Number(order.unitPrice ?? 0).toFixed(2)}` },
            { label: "Total Amount",  value: `Rs. ${Number(order.totalAmount ?? 0).toFixed(2)}` },
            { label: "Supplier",      value: order.supplierName || "—" },
            { label: "Category",      value: order.category || "—" },
            { label: "Order Date",    value: order.date || "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {label}
              </span>
              <span style={{ fontSize: 13, color: "#334155", fontWeight: 500, marginTop: 1 }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        disabled={dismissing}
        title="Dismiss"
        style={{
          background: "transparent",
          border: "none",
          cursor: dismissing ? "not-allowed" : "pointer",
          padding: 4,
          borderRadius: 6,
          color: "#94a3b8",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "#475569"}
        onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export default function ApprovedOrdersBanner() {
  const [orders, setOrders] = useState([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "purchaseOrders"),
      where("status", "==", "APPROVED"),
      where("pharmacistAcknowledged", "==", false)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort newest first
      list.sort((a, b) =>
        (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
      );
      setOrders(list);
    });

    return () => unsub();
  }, []);

  const handleDismiss = (id) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  if (orders.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Pulsing dot */}
          <span style={{
            display: "inline-block",
            width: 8, height: 8,
            background: "#10b981",
            borderRadius: "50%",
            boxShadow: "0 0 0 3px rgba(16,185,129,0.2)",
            animation: "pulse 2s infinite",
          }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#065f46" }}>
            {orders.length} Approved Order{orders.length !== 1 ? "s" : ""} — Ready to Add Products
          </span>
        </div>

        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            color: "#64748b",
            fontWeight: 600,
            padding: "4px 8px",
            borderRadius: 6,
          }}
        >
          {collapsed ? "Show ▾" : "Hide ▴"}
        </button>
      </div>

      {!collapsed && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {orders.map(order => (
            <OrderCard key={order.id} order={order} onDismiss={handleDismiss} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(16,185,129,0.2); }
          50%       { box-shadow: 0 0 0 6px rgba(16,185,129,0.05); }
        }
      `}</style>
    </div>
  );
}