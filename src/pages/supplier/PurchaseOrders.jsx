import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { MdChevronLeft, MdChevronRight } from "react-icons/md";

// Sub-components for each UI section
import PurchaseOrderHeader from "../../components/supplier/PurchaseOrderHeader";
import OrderFilters        from "../../components/supplier/OrderFilters";
import OrderTable          from "../../components/supplier/OrderTable";
import OrderDetailsModal   from "../../components/supplier/OrderDetailsModal";
import RejectOrderModal    from "../../components/supplier/RejectOrderModal";

// ─── Toast Notification System ────────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] border px-4 py-3.5 transition-all duration-300
            ${toast.type === "success" ? "border-l-4 border-l-emerald-500 border-gray-100" : ""}
            ${toast.type === "error"   ? "border-l-4 border-l-red-500 border-gray-100"     : ""}
            ${toast.type === "info"    ? "border-l-4 border-l-gray-500 border-gray-100"    : ""}
          `}
        >
          {/* Icon */}
          <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold
            ${toast.type === "success" ? "bg-emerald-500" : ""}
            ${toast.type === "error"   ? "bg-red-500"     : ""}
            ${toast.type === "info"    ? "bg-gray-600"    : ""}
          `}>
            {toast.type === "success" && "✓"}
            {toast.type === "error"   && "✕"}
            {toast.type === "info"    && "i"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight">{toast.title}</p>
            {toast.message && (
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed whitespace-pre-line">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-gray-400 hover:text-gray-700 transition-colors text-base leading-none flex-shrink-0 cursor-pointer bg-transparent border-none"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Inline Confirm Dialog ────────────────────────────────────────────────────
function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  alertOnly    = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={alertOnly ? onConfirm : onCancel}
    >
      <div
        className="bg-white rounded-2xl p-7 max-w-md w-[90%] shadow-[0_20px_60px_rgba(0,0,0,0.22)] border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header accent bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-5 w-1 rounded-full bg-gray-800 flex-shrink-0" />
          <h3 className="text-base font-bold text-gray-900 tracking-tight">{title}</h3>
        </div>

        <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line mb-6 pl-4">
          {message}
        </p>

        <div className="flex gap-3 justify-end">
          {!alertOnly && (
            <button
              onClick={onCancel}
              className="px-5 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold text-sm cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-5 py-2 rounded-lg font-bold text-sm cursor-pointer text-white transition-all duration-200 hover:-translate-y-px
              ${alertOnly
                ? "bg-gray-800 hover:bg-gray-900 shadow-[0_4px_14px_rgba(0,0,0,0.20)]"
                : "bg-emerald-500 hover:bg-emerald-600 shadow-[0_4px_14px_rgba(16,185,129,0.30)]"
              }`}
          >
            {alertOnly ? "OK" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

// ─── Main component ───────────────────────────────────────────────────────────
export default function PurchaseOrders() {
  const [supplierId,    setSupplierId]    = useState(null);
  const [supplierName,  setSupplierName]  = useState("");
  const [authReady,     setAuthReady]     = useState(false);
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus,  setFilterStatus]  = useState("All Orders");

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason,    setRejectReason]    = useState("");
  const [orderToReject,   setOrderToReject]   = useState(null);

  const [confirmModal, setConfirmModal] = useState(null);

  const [toasts, setToasts] = useState([]);

  /* ── Pagination state ─────────────────────────────────────────────────────── */
  const [page, setPage] = useState(1);

  /* ── Toast helpers ────────────────────────────────────────────────────────── */
  const addToast = useCallback((type, title, message = "") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  /* ── showAlert / showConfirm ─────────────────────────────────────────────── */
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

  /* ── Format Firestore Timestamp ───────────────────────────────────────────── */
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  /* ── Auth ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setSupplierId(user.uid);
        try {
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
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  /* ── Fetch orders ─────────────────────────────────────────────────────────── */
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
      setPage(1);
    } catch (error) {
      console.error("Error loading orders:", error);
      addToast("error", "Failed to Load Orders", error.message);
    } finally {
      setLoading(false);
    }
  }, [supplierId, filterStatus, addToast]);

  useEffect(() => {
    if (authReady) fetchOrders();
  }, [fetchOrders, authReady]);

  /* ── Pagination derived values ───────────────────────────────────────────── */
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));

  // Clamp page if the order list shrinks
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const pagedOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Build the visible page-number list with ellipses, e.g. 1 2 3 4 5 ... 12
  const pageNumbers = useMemo(() => {
    const total = totalPages;
    const current = page;
    const delta = 1;
    const range = [];
    const withDots = [];
    let last = null;

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }
    for (const i of range) {
      if (last !== null) {
        if (i - last === 2) withDots.push(last + 1);
        else if (i - last > 2) withDots.push("...");
      }
      withDots.push(i);
      last = i;
    }
    return withDots;
  }, [totalPages, page]);

  /* ── Approve order ────────────────────────────────────────────────────────── */
  const approveOrder = async (orderId, order) => {
    if (!supplierId) {
      addToast("error", "Not Authenticated", "You must be logged in to approve orders.");
      return;
    }
    try {
      const productRef  = doc(db, "products", order.productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        addToast("error", "Product Not Found", "This product no longer exists in your inventory.");
        return;
      }

      const remainingStock = productSnap.data().minStock ?? 0;

      if (remainingStock < order.quantity) {
        addToast(
          "error",
          "Insufficient Stock",
          `Required: ${order.quantity} units — Available: ${remainingStock} units`
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
      const paymentDueDate = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      const initialAmount  = totalAmount * 0.5;
      const batch          = writeBatch(db);

      batch.update(doc(db, "purchaseOrders", orderId), {
        status: "APPROVED", approvedAt: now, approvalDate: now, updatedAt: now,
      });

      batch.update(productRef, {
        minStock: remainingStock - order.quantity, updatedAt: now,
      });

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

      await batch.commit();

      addToast(
        "success",
        "Order Approved",
        `${productName} — ${order.quantity} units approved. Invoice and payment record created.`
      );

      fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error approving order:", error);
      addToast("error", "Approval Failed", error.message);
    }
  };

  /* ── Reject order ─────────────────────────────────────────────────────────── */
  const openRejectModal = (order) => {
    setOrderToReject(order);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const rejectOrder = async () => {
    if (!rejectReason.trim()) {
      addToast("error", "Reason Required", "Please provide a reason for rejection.");
      return;
    }
    if (!supplierId) {
      addToast("error", "Not Authenticated", "You must be logged in to reject orders.");
      return;
    }
    try {
      const now         = Timestamp.now();
      const batch       = writeBatch(db);
      const productName = orderToReject.product || orderToReject.productName;

      batch.update(doc(db, "purchaseOrders", orderToReject.id), {
        status:          "REJECTED",
        rejectedAt:      now,
        rejectionReason: rejectReason,
        rejectionDate:   now,
        updatedAt:       now,
      });

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

      addToast("info", "Order Rejected", `${productName} — Admin has been notified.`);

      setShowRejectModal(false);
      setOrderToReject(null);
      setRejectReason("");
      fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error rejecting order:", error);
      addToast("error", "Rejection Failed", error.message);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="p-6 bg-[#f5f5f5] min-h-screen">

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <PurchaseOrderHeader supplierName={supplierName} />

      <OrderFilters
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        orders={orders}
      />

      <OrderTable
        loading={loading}
        orders={pagedOrders}
        onView={setSelectedOrder}
        onApprove={approveOrder}
        onReject={openRejectModal}
        formatDate={formatDate}
      />

      {/* Numbered pagination — prev / page numbers / next */}
      {!loading && orders.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-8 flex-wrap">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="Previous page"
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 transition-all duration-150 cursor-pointer"
          >
            <MdChevronLeft size={18} />
          </button>

          {pageNumbers.map((p, i) =>
            p === "..." ? (
              <span key={`dots-${i}`} className="h-9 w-9 flex items-center justify-center text-slate-400 text-sm font-medium select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                aria-current={p === page ? "page" : undefined}
                className={`h-9 min-w-9 px-2 flex items-center justify-center rounded-lg text-sm font-bold transition-all duration-150 cursor-pointer
                  ${p === page
                    ? "bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.30)]"
                    : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-800"
                  }`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            aria-label="Next page"
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 transition-all duration-150 cursor-pointer"
          >
            <MdChevronRight size={18} />
          </button>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onApprove={approveOrder}
          onReject={openRejectModal}
          formatDate={formatDate}
        />
      )}

      {showRejectModal && orderToReject && (
        <RejectOrderModal
          order={orderToReject}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          onConfirm={rejectOrder}
          onClose={() => setShowRejectModal(false)}
        />
      )}

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
    </div>
  );
}