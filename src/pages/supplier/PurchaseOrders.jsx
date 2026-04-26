import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../services/firebase";

// Sub-components for each UI section
import PurchaseOrderHeader from "../../components/supplier/PurchaseOrderHeader";
import OrderFilters        from "../../components/supplier/OrderFilters";
import OrderTable          from "../../components/supplier/OrderTable";
import OrderDetailsModal   from "../../components/supplier/OrderDetailsModal";
import RejectOrderModal    from "../../components/supplier/RejectOrderModal";

/**
 * PurchaseOrders — lets a supplier view, filter, approve, and reject orders.
 *
 * BUG FIX: Modals are conditionally MOUNTED, not just conditionally shown.
 * Old code always mounted ModalWrap (position:fixed inset-0 backdrop), even
 * when the modal was "closed". That invisible backdrop swallowed all clicks,
 * freezing the page. Fix: {condition && <Modal />} so the backdrop only exists
 * in the DOM when the modal is genuinely open.
 */

// ─── Reusable confirm/alert modal (replaces window.confirm / window.alert) ───
function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  alertOnly    = false, // true = show only an OK button (alert mode)
  onConfirm,
  onCancel,
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 0.15s ease",
      }}
      onClick={alertOnly ? onConfirm : onCancel} // click backdrop to dismiss
    >
      <div
        style={{
          background: "#fff", borderRadius: 12, padding: "28px 32px",
          maxWidth: 440, width: "90%",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          animation: "slideUp 0.2s ease",
        }}
        onClick={(e) => e.stopPropagation()} // prevent backdrop click from bubbling
      >
        <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
          {title}
        </h3>
        <p style={{
          margin: "0 0 24px", fontSize: 14, color: "#475569",
          whiteSpace: "pre-line", lineHeight: 1.6,
        }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {/* Cancel button hidden in alert-only mode */}
          {!alertOnly && (
            <button
              onClick={onCancel}
              style={{
                padding: "9px 20px", borderRadius: 8,
                border: "1.5px solid #e2e8f0",
                background: "#fff", color: "#475569",
                fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{
              padding: "9px 20px", borderRadius: 8, border: "none",
              background: alertOnly ? "#3b82f6" : "#10b981", // blue for alert, green for confirm
              color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PurchaseOrders() {
  const [supplierId,    setSupplierId]    = useState(null);
  const [supplierName,  setSupplierName]  = useState("");
  const [authReady,     setAuthReady]     = useState(false); // true once Firebase auth settles
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null); // order open in details modal
  const [filterStatus,  setFilterStatus]  = useState("All Orders");

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason,    setRejectReason]    = useState("");
  const [orderToReject,   setOrderToReject]   = useState(null);

  const [confirmModal, setConfirmModal] = useState(null); // drives ConfirmModal above

  /* ── Promise-based alert/confirm helpers (avoids native browser dialogs) ── */
  const showAlert = (title, message) =>
    new Promise((resolve) => {
      setConfirmModal({
        title, message, alertOnly: true,
        onConfirm: () => { setConfirmModal(null); resolve(); },
        onCancel:  () => { setConfirmModal(null); resolve(); },
      });
    });

  const showConfirm = (title, message, confirmLabel = "Confirm") =>
    new Promise((resolve) => {
      setConfirmModal({
        title, message, confirmLabel,
        onConfirm: () => { setConfirmModal(null); resolve(true); },
        onCancel:  () => { setConfirmModal(null); resolve(false); },
      });
    });

  /* ── Format Firestore Timestamp or plain date to readable string ─────────── */
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  /* ── Auth: track logged-in supplier and load their display name ──────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setSupplierId(user.uid);
        try {
          // Try suppliers collection first, fall back to users collection
          let snap = await getDoc(doc(db, "suppliers", user.uid));
          if (snap.exists()) {
            setSupplierName(snap.data().name || user.email);
          } else {
            snap = await getDoc(doc(db, "users", user.uid));
            setSupplierName(
              snap.exists()
                ? snap.data().name || snap.data().fullName || user.email
                : user.email
            );
          }
        } catch {
          setSupplierName(user.email);
        }
      } else {
        setSupplierId(null);
        setSupplierName("");
      }
      setAuthReady(true); // signal that auth is settled so fetchOrders can run
    });
    return () => unsub();
  }, []);

  /* ── Fetch orders filtered by supplierId and optional status ─────────────── */
  // NOTE: filtering by supplierId + status + orderBy requires a composite Firestore index.
  const fetchOrders = useCallback(async () => {
    if (!supplierId) { setLoading(false); return; }
    try {
      setLoading(true);
      const q =
        filterStatus === "All Orders"
          ? query(
              collection(db, "purchaseOrders"),
              where("supplierId", "==", supplierId),
              orderBy("createdAt", "desc")
            )
          : query(
              collection(db, "purchaseOrders"),
              where("supplierId", "==", supplierId),
              where("status",     "==", filterStatus),
              orderBy("createdAt", "desc")
            );
      const snapshot = await getDocs(q);
      setOrders(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error loading orders:", error);
      await showAlert("Error", "Error loading orders: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [supplierId, filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wait for auth to settle before first fetch so supplierId is never stale-null
  useEffect(() => {
    if (authReady) fetchOrders();
  }, [fetchOrders, authReady]);

  /* ── Approve order: single atomic batch across 6 Firestore writes ─────────── */
  const approveOrder = async (orderId, order) => {
    if (!supplierId) {
      await showAlert("Not Authenticated", "You must be logged in to approve orders.");
      return;
    }
    try {
      const productRef  = doc(db, "products", order.productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        await showAlert("Product Not Found", "This product no longer exists in your inventory.");
        return;
      }

      const remainingStock = productSnap.data().minStock ?? 0;

      // Block approval if not enough remaining stock
      if (remainingStock < order.quantity) {
        await showAlert(
          "Insufficient Stock",
          `Cannot approve — not enough remaining stock.\n\n` +
          `Required:  ${order.quantity} units\n` +
          `Available: ${remainingStock} units`
        );
        return;
      }

      const productName = order.product || order.productName;
      const totalAmount = Number(order.amount || order.totalAmount);

      const confirmed = await showConfirm(
        "Confirm Approval",
        `Approve this purchase order?\n\n` +
        `Product:  ${productName}\n` +
        `Quantity: ${order.quantity} units\n` +
        `Amount:   Rs. ${totalAmount.toFixed(2)}\n\n` +
        `This will:\n` +
        `• Add ${order.quantity} units to Stock Supplied\n` +
        `• Deduct ${order.quantity} units from Remaining Stock\n` +
        `• Update admin inventory\n` +
        `• Create a 50% initial payment record`,
        "Approve Order"
      );
      if (!confirmed) return;

      const now            = Timestamp.now();
      const paymentDueDate = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days from now
      const initialAmount  = totalAmount * 0.5; // 50% initial payment
      const batch          = writeBatch(db);

      // 1. Mark order as APPROVED
      batch.update(doc(db, "purchaseOrders", orderId), {
        status: "APPROVED", approvedAt: now, approvalDate: now, updatedAt: now,
      });

      // 2. Deduct ordered quantity from supplier's remaining stock
      batch.update(productRef, {
        minStock: remainingStock - order.quantity, updatedAt: now,
      });

      // 3. Add ordered quantity to admin's product stock
      if (order.adminProductId) {
        const adminProductRef  = doc(db, "adminProducts", order.adminProductId);
        const adminProductSnap = await getDoc(adminProductRef);
        if (adminProductSnap.exists()) {
          const currentAdminStock = adminProductSnap.data().stock || 0;
          batch.update(adminProductRef, {
            stock:         currentAdminStock + order.quantity,
            minStock:      remainingStock - order.quantity,
            availability:  "in stock",
            lastRestocked: now,
            updatedAt:     now,
          });
        }
      }

      // 4. Create a pending 50% initial payment record
      batch.set(doc(collection(db, "payments")), {
        orderId:          order.poId,
        purchaseOrderId:  orderId,
        supplierName,     supplierId,
        productName,      quantity: order.quantity,
        amount:           initialAmount,
        totalOrderAmount: totalAmount,
        paymentType:      "INITIAL",
        paymentLabel:     "Initial Payment (50%)",
        status:           "PENDING",
        adminProductId:   order.adminProductId,
        dueDate:          paymentDueDate,
        createdAt:        now, updatedAt: now,
      });

      // 5. Create matching invoice for the initial payment
      batch.set(doc(collection(db, "invoices")), {
        purchaseOrderId:  orderId,
        orderId:          order.poId,
        invoiceNumber:    `INV-${order.poId}-INITIAL`,
        pharmacy:         "MediCareX",
        supplierId,       supplierName,
        productName,      adminProductId: order.adminProductId,
        quantity:         order.quantity,
        invoiceType:      "INITIAL",
        invoiceLabel:     "Initial Payment (50%)",
        items: [{ productName, quantity: order.quantity, unitPrice: Number(order.unitPrice || 0) }],
        subtotal:         initialAmount,
        taxRate:          0, taxAmount: 0,
        totalAmount:      initialAmount,
        totalOrderAmount: totalAmount,
        paymentStatus:    "Pending",
        invoiceDate:      new Date().toISOString().split("T")[0],
        dueDate:          paymentDueDate.toDate().toISOString().split("T")[0],
        createdAt:        now, updatedAt: now,
      });

      // 6. Notify admin of the approval
      batch.set(doc(collection(db, "notifications")), {
        type: "ORDER_APPROVED", recipientId: "admin", recipientType: "admin",
        orderId, poId: order.poId, supplierId, supplierName,
        productName, quantity: order.quantity,
        totalAmount:    order.amount || order.totalAmount,
        adminProductId: order.adminProductId,
        message:
          `Order Approved: ${supplierName} approved order ${order.poId} ` +
          `for ${order.quantity} units of ${productName}`,
        read: false, createdAt: now,
      });

      await batch.commit(); // all 6 writes succeed or none do

      await showAlert(
        "Order Approved ✓",
        "The order has been approved successfully.\n\n" +
        "• Stock Supplied has been incremented.\n" +
        "• Remaining Stock has been decremented.\n" +
        "• Admin inventory has been updated.\n" +
        "• Admin has been notified.\n" +
        "• An invoice has been created for the initial 50% payment."
      );

      fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error approving order:", error);
      await showAlert("Approval Failed", "Failed to approve order: " + error.message);
    }
  };

  /* ── Reject order: open modal to collect a reason before writing ─────────── */
  const openRejectModal = (order) => {
    setOrderToReject(order);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const rejectOrder = async () => {
    if (!rejectReason.trim()) {
      await showAlert("Reason Required", "Please provide a reason for rejection.");
      return;
    }
    if (!supplierId) {
      await showAlert("Not Authenticated", "You must be logged in to reject orders.");
      return;
    }
    try {
      const now         = Timestamp.now();
      const batch       = writeBatch(db);
      const productName = orderToReject.product || orderToReject.productName;

      // Mark order as REJECTED with the supplier's reason
      batch.update(doc(db, "purchaseOrders", orderToReject.id), {
        status:          "REJECTED",
        rejectedAt:      now,
        rejectionReason: rejectReason,
        rejectionDate:   now,
        updatedAt:       now,
      });

      // Notify admin of the rejection and include the reason
      batch.set(doc(collection(db, "notifications")), {
        type: "ORDER_REJECTED", recipientId: "admin", recipientType: "admin",
        orderId:   orderToReject.id,
        poId:      orderToReject.poId,
        supplierId, supplierName, productName,
        quantity:    orderToReject.quantity,
        totalAmount: orderToReject.amount || orderToReject.totalAmount,
        rejectionReason: rejectReason,
        message:
          `Order Rejected: ${supplierName} rejected order ${orderToReject.poId} — ` +
          `Reason: ${rejectReason}`,
        read: false, createdAt: now,
      });

      await batch.commit();

      await showAlert(
        "Order Rejected",
        "The order has been rejected.\nThe admin has been notified with your reason."
      );

      setShowRejectModal(false);
      setOrderToReject(null);
      setRejectReason("");
      fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error rejecting order:", error);
      await showAlert("Rejection Failed", "Failed to reject order: " + error.message);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="p-8 bg-slate-50 min-h-screen">

      {/* Page title and supplier name */}
      <PurchaseOrderHeader supplierName={supplierName} />

      {/* Status filter tabs and order count badges */}
      <OrderFilters
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        orders={orders}
      />

      {/* Main orders table with approve/reject actions */}
      <OrderTable
        loading={loading}
        orders={orders}
        onView={setSelectedOrder}
        onApprove={approveOrder}
        onReject={openRejectModal}
        formatDate={formatDate}
      />

      {/*
        Modals are conditionally MOUNTED so their fixed backdrop only exists
        when the modal is open — prevents invisible overlay swallowing clicks.
      */}

      {/* Order details modal — opens when a row is clicked */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onApprove={approveOrder}
          onReject={openRejectModal}
          formatDate={formatDate}
        />
      )}

      {/* Reject modal — collects a rejection reason before submitting */}
      {showRejectModal && orderToReject && (
        <RejectOrderModal
          order={orderToReject}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          onConfirm={rejectOrder}
          onClose={() => setShowRejectModal(false)}
        />
      )}

      {/* Custom alert/confirm dialog driven by showAlert / showConfirm helpers */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          cancelLabel={confirmModal.cancelLabel}
          alertOnly={confirmModal.alertOnly}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; }                              to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}