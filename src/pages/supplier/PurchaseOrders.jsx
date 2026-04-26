import React, { useState, useEffect, useCallback } from "react";
import {
  collection, getDocs, doc, updateDoc, query, where,
  orderBy, addDoc, Timestamp, getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../services/firebase";

// ─── Sub-components ──────────────────────────────────────────────────────────
import PurchaseOrderHeader from "../../components/supplier/PurchaseOrderHeader";
import OrderFilters        from "../../components/supplier/OrderFilters";
import OrderTable          from "../../components/supplier/OrderTable";
import OrderDetailsModal   from "../../components/supplier/OrderDetailsModal";
import RejectOrderModal    from "../../components/supplier/RejectOrderModal";

/**
 * PurchaseOrders page — allows the logged-in supplier to view, filter,
 * approve, and reject incoming purchase orders.
 *
 * Data flow:
 *   1. Firebase Auth resolves the supplier's UID and fetches their display name.
 *   2. Orders are queried from `purchaseOrders`, optionally filtered by status.
 *   3. Approving an order triggers a multi-step write:
 *        - Updates order status in `purchaseOrders`.
 *        - Deducts quantity from the supplier's `products` remaining stock.
 *        - Increments stock in the shared `adminProducts` collection.
 *        - Creates an initial 50% payment record in `payments`.
 *        - Creates a matching invoice in `invoices`.
 *        - Notifies the admin via `notifications`.
 *   4. Rejecting an order updates the status and posts an admin notification.
 */
export default function PurchaseOrders() {
  const [supplierId, setSupplierId]       = useState(null);
  const [supplierName, setSupplierName]   = useState("");
  const [orders, setOrders]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);  // order open in the details modal
  const [filterStatus, setFilterStatus]   = useState("All Orders");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason]   = useState("");
  const [orderToReject, setOrderToReject] = useState(null);  // order staged for rejection

  /* ── AUTH ────────────────────────────────────────────────────────────────── */
  /**
   * Subscribes to Firebase Auth state changes to resolve the supplier's UID
   * and display name. The name is looked up first in the `suppliers` collection,
   * then falls back to the `users` collection, and finally to the Auth email.
   * The subscription is cleaned up on unmount to prevent memory leaks.
   */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setSupplierId(user.uid);
        try {
          // Prefer the suppliers collection for the company name
          let userDoc = await getDoc(doc(db, "suppliers", user.uid));
          if (userDoc.exists()) {
            setSupplierName(userDoc.data().name || user.email);
          } else {
            // Fall back to the users collection if no supplier document exists
            userDoc = await getDoc(doc(db, "users", user.uid));
            setSupplierName(userDoc.exists()
              ? userDoc.data().name || userDoc.data().fullName || user.email
              : user.email);
          }
        } catch { setSupplierName(user.email); }
      } else {
        setSupplierId(null); setSupplierName("");
      }
    });
    return () => unsub();
  }, []);

  /* ── FETCH ───────────────────────────────────────────────────────────────── */
  /**
   * Fetches purchase orders for the current supplier from Firestore.
   * When filterStatus is "All Orders" no status filter is applied; otherwise
   * a compound query filters by both supplierId and the selected status.
   * Wrapped in useCallback so it can be called imperatively after mutations
   * without triggering unnecessary re-renders.
   */
  const fetchOrders = useCallback(async () => {
    if (!supplierId) { setLoading(false); return; }
    try {
      setLoading(true);
      const q = filterStatus === "All Orders"
        ? query(collection(db, "purchaseOrders"), where("supplierId", "==", supplierId), orderBy("createdAt", "desc"))
        : query(collection(db, "purchaseOrders"), where("supplierId", "==", supplierId), where("status", "==", filterStatus), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setOrders(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error loading orders:", error);
      alert("Error loading orders: " + error.message);
    } finally { setLoading(false); }
  }, [supplierId, filterStatus]);

  // Re-fetch whenever the supplier identity or the active filter changes
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /* ── APPROVE ─────────────────────────────────────────────────────────────── */
  /**
   * Approves a purchase order and executes all downstream side-effects atomically
   * (each step awaits the previous to preserve consistency).
   *
   * Steps:
   *   1. Validates that the product exists and that remaining stock is sufficient.
   *   2. Prompts the supplier to confirm the approval.
   *   3. Marks the order as APPROVED in `purchaseOrders`.
   *   4. Deducts the ordered quantity from the supplier's remaining stock (minStock).
   *   5. Increments the admin's stock and marks the product as "in stock".
   *   6. Creates a PENDING initial-payment (50%) record in `payments`.
   *   7. Creates a matching invoice document in `invoices`.
   *   8. Posts an ORDER_APPROVED notification to the admin in `notifications`.
   *
   * @param {string} orderId - Firestore document ID of the purchase order.
   * @param {Object} order   - The purchase order data object.
   */
  const approveOrder = async (orderId, order) => {
    try {
      const productRef  = doc(db, "products", order.productId);
      const productSnap = await getDoc(productRef);
      if (!productSnap.exists()) { alert("Product not found in your inventory"); return; }

      const currentSupplierStock    = productSnap.data().stock;
      const currentSupplierMinStock = productSnap.data().minStock;

      // Prevent approval if remaining stock is less than the ordered quantity
      if (currentSupplierMinStock < order.quantity) {
        alert(
          `Insufficient remaining stock!\n\nRequired: ${order.quantity} units\nAvailable (remaining): ${currentSupplierMinStock} units`
        );
        return;
      }

      if (!window.confirm(
        `Approve this order?\n\nProduct: ${order.product || order.productName}\nQuantity: ${order.quantity} units\nAmount: Rs. ${Number(order.amount || order.totalAmount).toFixed(2)}\n\nThis will:\n• Add ${order.quantity} units to Stock Supplied\n• Deduct ${order.quantity} units from your Remaining Stock`
      )) return;

      // Step 1 — mark the order as approved
      await updateDoc(doc(db, "purchaseOrders", orderId), {
        status: "APPROVED",
        approvedAt: Timestamp.now(),
        approvalDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Step 2 — deduct ordered quantity from the supplier's remaining stock
      await updateDoc(productRef, {
        minStock: currentSupplierMinStock - order.quantity,
        updatedAt: Timestamp.now(),
      });

      // Step 3 — increment admin product stock if the admin product reference exists
      if (order.adminProductId) {
        const adminProductRef  = doc(db, "adminProducts", order.adminProductId);
        const adminProductSnap = await getDoc(adminProductRef);
        if (adminProductSnap.exists()) {
          const currentAdminStock = adminProductSnap.data().stock || 0;
          await updateDoc(adminProductRef, {
            stock:         currentAdminStock + order.quantity,
            minStock:      currentSupplierMinStock - order.quantity,
            availability:  "in stock",
            lastRestocked: Timestamp.now(),
            updatedAt:     Timestamp.now(),
          });
        }
      }

      const totalAmount = Number(order.amount || order.totalAmount);

      // Payment due 7 days from approval
      const initialPaymentDueDate = Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      // Step 4 — create an initial 50% payment record for the admin to process
      await addDoc(collection(db, "payments"), {
        orderId: order.poId,
        purchaseOrderId: orderId,
        supplierName,
        supplierId,
        productName: order.product || order.productName,
        quantity: order.quantity,
        amount: totalAmount * 0.5,           // 50% of the total order amount
        totalOrderAmount: totalAmount,
        paymentType: "INITIAL",
        paymentLabel: "Initial Payment (50%)",
        status: "PENDING",
        adminProductId: order.adminProductId,
        dueDate: initialPaymentDueDate,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Step 5 — create the matching invoice for the initial payment
      await addDoc(collection(db, "invoices"), {
        purchaseOrderId: orderId,
        orderId: order.poId,
        invoiceNumber: `INV-${order.poId}-INITIAL`,
        pharmacy: "MediCareX",
        supplierId,
        supplierName,
        productName: order.product || order.productName,
        adminProductId: order.adminProductId,
        quantity: order.quantity,
        invoiceType: "INITIAL",
        invoiceLabel: "Initial Payment (50%)",
        items: [
          {
            productName: order.product || order.productName,
            quantity: order.quantity,
            unitPrice: Number(order.unitPrice || 0),
          },
        ],
        subtotal: totalAmount * 0.5,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: totalAmount * 0.5,
        totalOrderAmount: totalAmount,
        paymentStatus: "Pending",
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: initialPaymentDueDate.toDate().toISOString().split("T")[0],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Step 6 — notify the admin that the order has been approved
      await addDoc(collection(db, "notifications"), {
        type: "ORDER_APPROVED", recipientId: "admin", recipientType: "admin",
        orderId, poId: order.poId, supplierId, supplierName,
        productName: order.product || order.productName,
        quantity: order.quantity, totalAmount: order.amount || order.totalAmount,
        adminProductId: order.adminProductId,
        message: `Order Approved: ${supplierName} approved order ${order.poId} for ${order.quantity} units of ${order.product || order.productName}`,
        read: false, createdAt: Timestamp.now(),
      });

      alert(
        "Order approved successfully!\n\n" +
        "• Stock Supplied has been incremented.\n" +
        "• Remaining Stock has been decremented.\n" +
        "• Admin inventory has been updated.\n" +
        "• Admin has been notified.\n" +
        "• An invoice has been created for the initial 50% payment."
      );
      fetchOrders(); setSelectedOrder(null);
    } catch (error) {
      console.error("Error approving order:", error);
      alert("Failed to approve order: " + error.message);
    }
  };

  /* ── REJECT ──────────────────────────────────────────────────────────────── */
  /**
   * Stages an order for rejection and opens the rejection reason modal.
   * The reason input is cleared each time so previous text does not persist.
   *
   * @param {Object} order - The purchase order to be rejected.
   */
  const openRejectModal = (order) => {
    setOrderToReject(order);
    setRejectReason("");
    setShowRejectModal(true);
  };

  /**
   * Confirms the rejection of the staged order.
   * Requires a non-empty reason before proceeding.
   * Updates the order status in `purchaseOrders` and notifies the admin
   * via the `notifications` collection, then refreshes the orders list.
   */
  const rejectOrder = async () => {
    if (!rejectReason.trim()) { alert("Please provide a reason for rejection"); return; }
    try {
      // Mark the order as rejected and record the reason and timestamp
      await updateDoc(doc(db, "purchaseOrders", orderToReject.id), {
        status: "REJECTED",
        rejectedAt: Timestamp.now(),
        rejectionReason: rejectReason,
        rejectionDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Notify the admin with the rejection reason so they can follow up
      await addDoc(collection(db, "notifications"), {
        type: "ORDER_REJECTED", recipientId: "admin", recipientType: "admin",
        orderId: orderToReject.id, poId: orderToReject.poId, supplierId, supplierName,
        productName: orderToReject.product || orderToReject.productName,
        quantity: orderToReject.quantity, totalAmount: orderToReject.amount || orderToReject.totalAmount,
        rejectionReason: rejectReason,
        message: `Order Rejected: ${supplierName} rejected order ${orderToReject.poId} - Reason: ${rejectReason}`,
        read: false, createdAt: Timestamp.now(),
      });
      alert("Order rejected successfully.\nAdmin has been notified.");
      setShowRejectModal(false); setOrderToReject(null); setRejectReason("");
      fetchOrders(); setSelectedOrder(null);
    } catch (error) {
      console.error("Error rejecting order:", error);
      alert("Failed to reject order: " + error.message);
    }
  };

  /* ── HELPER ──────────────────────────────────────────────────────────────── */
  /**
   * Converts a Firestore Timestamp or any Date-constructable value to a
   * human-readable date-time string. Returns "N/A" when the value is absent.
   *
   * @param {Timestamp|Date|string|number|null} timestamp - The value to format.
   * @returns {string} Formatted date string or "N/A".
   */
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">

      {/* Page header — displays the supplier's name and page title */}
      <PurchaseOrderHeader supplierName={supplierName} />

      {/* Status filter tabs and order count stats */}
      <OrderFilters
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        orders={orders}
      />

      {/* Main orders table with approve and reject action buttons */}
      <OrderTable
        loading={loading}
        orders={orders}
        onView={setSelectedOrder}
        onApprove={approveOrder}
        onReject={openRejectModal}
        formatDate={formatDate}
      />

      {/* Slide-over modal showing full order details */}
      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onApprove={approveOrder}
        onReject={openRejectModal}
        formatDate={formatDate}
      />

      {/* Modal prompting the supplier to enter a rejection reason */}
      <RejectOrderModal
        order={showRejectModal ? orderToReject : null}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        onConfirm={rejectOrder}
        onClose={() => setShowRejectModal(false)}
      />

      {/* Keyframe animations used by modal entrance transitions */}
      <style>{`
        @keyframes fadeIn  { from{opacity:0}                            to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>
    </div>
  );
}