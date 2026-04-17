import React, { useState, useEffect, useCallback } from "react";
import {
  collection, getDocs, doc, updateDoc, query, where,
  orderBy, addDoc, Timestamp, getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../services/firebase";

export default function PurchaseOrders() {
  const [supplierId, setSupplierId]     = useState(null);
  const [supplierName, setSupplierName] = useState("");
  const [orders, setOrders]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All Orders");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [orderToReject, setOrderToReject] = useState(null);

  /* AUTH*/
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setSupplierId(user.uid);
        try {
          let userDoc = await getDoc(doc(db, "suppliers", user.uid));
          if (userDoc.exists()) {
            setSupplierName(userDoc.data().name || user.email);
          } else {
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

  /*  FETCH  */
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

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /*  APPROVE */
  const approveOrder = async (orderId, order) => {
    try {
      // ── Supplier product (products collection) ──────────────────────────
      const productRef  = doc(db, "products", order.productId);
      const productSnap = await getDoc(productRef);
      if (!productSnap.exists()) { alert("Product not found in your inventory"); return; }

      const currentSupplierStock    = productSnap.data().stock;    // Stock Supplied to MediCareX
      const currentSupplierMinStock = productSnap.data().minStock; // Remaining Stock with supplier

      // Guard: supplier remaining must cover the order quantity
      if (currentSupplierMinStock < order.quantity) {
        alert(
          `Insufficient remaining stock!\n\nRequired: ${order.quantity} units\nAvailable (remaining): ${currentSupplierMinStock} units`
        );
        return;
      }

      if (!window.confirm(
        `Approve this order?\n\nProduct: ${order.product || order.productName}\nQuantity: ${order.quantity} units\nAmount: Rs. ${Number(order.amount || order.totalAmount).toFixed(2)}\n\nThis will:\n• Add ${order.quantity} units to Stock Supplied\n• Deduct ${order.quantity} units from your Remaining Stock`
      )) return;

      // ── 1. Update purchaseOrder status
      await updateDoc(doc(db, "purchaseOrders", orderId), {
        status: "APPROVED",
        approvedAt: Timestamp.now(),
        approvalDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // ── 2. Supplier side (products collection) 
      //   stock    = Stock Supplied to MediCareX  → INCREMENT
      //   minStock = Remaining Stock with supplier → DECREMENT
      await updateDoc(productRef, {
        
        minStock: currentSupplierMinStock - order.quantity,
        updatedAt: Timestamp.now(),
      });

      // ── 3. Admin side (adminProducts collection) 
      //   stock = Admin Stock → INCREMENT
      if (order.adminProductId) {
        const adminProductRef  = doc(db, "adminProducts", order.adminProductId);
        const adminProductSnap = await getDoc(adminProductRef);
        if (adminProductSnap.exists()) {
          const currentAdminStock = adminProductSnap.data().stock || 0;
          await updateDoc(adminProductRef, {
            stock:         currentAdminStock + order.quantity,
            minStock:      currentSupplierMinStock - order.quantity, // keep in sync
            availability:  "in stock",
            lastRestocked: Timestamp.now(),
            updatedAt:     Timestamp.now(),
          });
        }
      }

      // ── 4. Create payment & invoice records 
      const totalAmount = Number(order.amount || order.totalAmount);
      const initialPaymentDueDate = Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      await addDoc(collection(db, "payments"), {
        orderId: order.poId,
        purchaseOrderId: orderId,
        supplierName,
        supplierId,
        productName: order.product || order.productName,
        quantity: order.quantity,
        amount: totalAmount * 0.5,
        totalOrderAmount: totalAmount,
        paymentType: "INITIAL",
        paymentLabel: "Initial Payment (50%)",
        status: "PENDING",
        adminProductId: order.adminProductId,
        dueDate: initialPaymentDueDate,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

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

      // ── 5. Notify admin 
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

  /* REJECT  */
  const openRejectModal = (order) => { setOrderToReject(order); setRejectReason(""); setShowRejectModal(true); };

  const rejectOrder = async () => {
    if (!rejectReason.trim()) { alert("Please provide a reason for rejection"); return; }
    try {
      await updateDoc(doc(db, "purchaseOrders", orderToReject.id), {
        status: "REJECTED",
        rejectedAt: Timestamp.now(),
        rejectionReason: rejectReason,
        rejectionDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
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

  /*  HELPERS  */
  const getStatusStyle = (status) => {
    switch (status) {
      case "PENDING":   return "bg-amber-100 text-amber-800";
      case "APPROVED":  return "bg-blue-100 text-blue-800";
      case "REJECTED":  return "bg-red-100 text-red-800";
      case "COMPLETED": return "bg-emerald-100 text-emerald-800";
      default:          return "bg-amber-100 text-amber-800";
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getInitialPaymentBadge = (order) => {
    if (order.status !== "APPROVED" && order.status !== "COMPLETED") return null;
    const paid = order.initialPaymentStatus === "PAID";
    return (
      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold
        ${paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
        Initial: {paid ? "Paid" : "Awaiting Payment"}
      </span>
    );
  };

  /*  SHARED MODAL WRAPPER  */
  const ModalWrap = ({ onClose, maxW = "max-w-[700px]", children }) => (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-5"
      style={{ animation: "fadeIn 0.2s ease-out" }}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl ${maxW} w-full max-h-[90vh] overflow-y-auto shadow-2xl`}
        style={{ animation: "slideUp 0.3s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  
  return (
    <div className="p-8 bg-slate-50 min-h-screen">

      {/* Page Header */}
      <div className="mb-7 bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-2xl text-white shadow-md">
        <h1 className="text-[28px] font-bold mb-1">Purchase Orders</h1>
        <p className="text-blue-100 text-sm">Orders received from MediCareX pharmacy</p>
        {supplierName && (
          <span className="inline-block mt-3 bg-white/10 text-amber-100 text-[13px] font-medium px-3 py-1 rounded-full">
            Logged in as: {supplierName}
          </span>
        )}
      </div>

      {/* Filters + Stats */}
      <div className="bg-white p-5 rounded-xl shadow-sm mb-6 flex justify-between items-center flex-wrap gap-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border-2 border-slate-200 rounded-lg text-sm cursor-pointer bg-white min-w-[200px] transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        >
          <option>All Orders</option>
          <option>PENDING</option>
          <option>APPROVED</option>
          <option>REJECTED</option>
          <option>COMPLETED</option>
        </select>

        <div className="flex gap-6 text-sm text-slate-500 flex-wrap">
          {[
            { label: "Total",    value: orders.length },
            { label: "Pending",  value: orders.filter((o) => o.status === "PENDING").length },
            { label: "Approved", value: orders.filter((o) => o.status === "APPROVED").length },
          ].map((s) => (
            <span key={s.label}>
              {s.label}: <strong className="text-slate-800 font-semibold">{s.value}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-lg">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg text-slate-500 mb-2">No orders found</p>
            <small className="text-sm text-slate-400">Orders from MediCareX will appear here</small>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead className="bg-slate-50">
                <tr>
                  {["PO ID", "Product", "Qty", "Unit Price", "Total Amount", "Order Date", "Status", "Payment", "Action"].map((h) => (
                    <th key={h} className="px-4 py-4 text-left text-[13px] font-semibold text-slate-500 uppercase tracking-wide border-b-2 border-slate-200">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-4 py-4 font-mono font-semibold text-blue-600 text-sm">{o.poId}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-800 text-sm m-0">{o.product || o.productName}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 m-0">{o.productCode}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{o.quantity} units</td>
                    <td className="px-4 py-4 text-sm text-slate-700">Rs. {Number(o.unitPrice).toFixed(2)}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-emerald-600">
                      Rs. {Number(o.amount || o.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{formatDate(o.orderDate || o.createdAt)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-semibold uppercase ${getStatusStyle(o.status)}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {getInitialPaymentBadge(o)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="px-3 py-1.5 bg-slate-500 hover:bg-slate-600 text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px"
                        >
                          View
                        </button>
                        {o.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => approveOrder(o.id, o)}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(o)}
                              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[13px] font-medium rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <ModalWrap onClose={() => setSelectedOrder(null)}>
          <div className="flex justify-between items-center px-7 py-6 border-b-2 border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 m-0">Order Details</h2>
            <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 flex items-center justify-center text-3xl text-slate-400 bg-transparent border-none cursor-pointer rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-colors">×</button>
          </div>

          <div className="p-7">
            <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-slate-100">
              <span className="text-xl font-bold text-blue-600 font-mono">{selectedOrder.poId}</span>
              <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-semibold uppercase ${getStatusStyle(selectedOrder.status)}`}>
                {selectedOrder.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-5 mb-6">
              {[
                { label: "Product Name",  value: selectedOrder.product || selectedOrder.productName },
                { label: "Product Code",  value: selectedOrder.productCode, mono: true },
                { label: "Category",      value: selectedOrder.category },
                { label: "Quantity",      value: `${selectedOrder.quantity} units` },
                { label: "Unit Price",    value: `Rs. ${Number(selectedOrder.unitPrice).toFixed(2)}` },
                { label: "Total Amount",  value: `Rs. ${Number(selectedOrder.amount || selectedOrder.totalAmount).toFixed(2)}`, highlight: "text-emerald-600 text-lg font-bold" },
                { label: "Order Date",    value: formatDate(selectedOrder.orderDate || selectedOrder.createdAt) },
                ...(selectedOrder.approvalDate  ? [{ label: "Approval Date",  value: formatDate(selectedOrder.approvalDate) }]  : []),
                ...(selectedOrder.rejectionDate ? [{ label: "Rejection Date", value: formatDate(selectedOrder.rejectionDate) }] : []),
                ...(selectedOrder.completionDate ? [{ label: "Completion Date", value: formatDate(selectedOrder.completionDate) }] : []),
              ].map((item) => (
                <div key={item.label} className="flex flex-col">
                  <label className="text-[13px] text-slate-500 font-medium mb-1.5">{item.label}</label>
                  <p className={`m-0 text-[15px] text-slate-800 font-medium ${item.highlight || ""} ${item.mono ? "font-mono text-sm" : ""}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {(selectedOrder.status === "APPROVED" || selectedOrder.status === "COMPLETED") && (
              <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-200">
                <p className="text-[13px] font-semibold text-slate-600 mb-3 uppercase tracking-wide">Payment Status</p>
                <div className="flex gap-3">
                  <div className="flex-1 bg-white rounded-lg p-3 border border-slate-200 text-center">
                    <p className="text-[11px] text-slate-500 font-medium mb-1">Initial (50%)</p>
                    <p className="text-sm font-bold text-slate-800">
                      Rs. {(Number(selectedOrder.amount || selectedOrder.totalAmount) * 0.5).toFixed(2)}
                    </p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase
                      ${selectedOrder.initialPaymentStatus === "PAID"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"}`}>
                      {selectedOrder.initialPaymentStatus === "PAID" ? "Received" : "Awaiting"}
                    </span>
                  </div>
                  <div className="flex-1 bg-white rounded-lg p-3 border border-slate-200 text-center">
                    <p className="text-[11px] text-slate-500 font-medium mb-1">Final (50%)</p>
                    <p className="text-sm font-bold text-slate-800">
                      Rs. {(Number(selectedOrder.amount || selectedOrder.totalAmount) * 0.5).toFixed(2)}
                    </p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase
                      ${selectedOrder.status === "COMPLETED"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-500"}`}>
                      {selectedOrder.status === "COMPLETED" ? "Due" : "After Delivery"}
                    </span>
                  </div>
                </div>

                {selectedOrder.status === "APPROVED" && selectedOrder.initialPaymentStatus !== "PAID" && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                    <p className="text-[12px] text-amber-800 font-medium m-0">
                      ⏳ Waiting for admin to pay the initial 50%. You can begin delivery once payment is received.
                    </p>
                  </div>
                )}
                {selectedOrder.status === "APPROVED" && selectedOrder.initialPaymentStatus === "PAID" && (
                  <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                    <p className="text-[12px] text-emerald-800 font-medium m-0">
                      ✓ Initial payment received. Please proceed with delivery via the Delivery Status page.
                    </p>
                  </div>
                )}
              </div>
            )}

            {selectedOrder.notes && (
              <div className="bg-slate-50 px-4 py-4 rounded-lg mb-5">
                <label className="block text-[13px] text-slate-500 font-semibold mb-2">Notes from Admin</label>
                <p className="m-0 text-sm text-slate-800 leading-relaxed">{selectedOrder.notes}</p>
              </div>
            )}

            {selectedOrder.rejectionReason && (
              <div className="bg-red-50 border-l-4 border-red-500 px-4 py-4 rounded-lg mb-5">
                <label className="block text-[13px] text-red-700 font-semibold mb-2">Rejection Reason</label>
                <p className="m-0 text-sm text-red-900 leading-relaxed">{selectedOrder.rejectionReason}</p>
              </div>
            )}

            {selectedOrder.status === "PENDING" && (
              <div className="flex gap-3 mt-6 pt-5 border-t-2 border-slate-100">
                <button
                  onClick={() => approveOrder(selectedOrder.id, selectedOrder)}
                  className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  ✓ Approve Order
                </button>
                <button
                  onClick={() => { setSelectedOrder(null); openRejectModal(selectedOrder); }}
                  className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  ✕ Reject Order
                </button>
              </div>
            )}
          </div>

          <div className="px-7 pb-6">
            <button
              onClick={() => setSelectedOrder(null)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-lg border-none cursor-pointer transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </ModalWrap>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && orderToReject && (
        <ModalWrap onClose={() => setShowRejectModal(false)} maxW="max-w-[500px]">
          <div className="flex justify-between items-center px-7 py-6 border-b-2 border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 m-0">Reject Order</h2>
            <button onClick={() => setShowRejectModal(false)} className="w-8 h-8 flex items-center justify-center text-3xl text-slate-400 bg-transparent border-none cursor-pointer rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-colors">×</button>
          </div>

          <div className="p-7">
            <p className="text-[15px] text-slate-800 mb-2">
              You are about to reject order <strong>{orderToReject.poId}</strong>
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Product: {orderToReject.product || orderToReject.productName}
            </p>

            <div className="flex flex-col mb-6">
              <label className="text-[15px] font-semibold text-slate-800 mb-2">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Out of stock, Product discontinued, Pricing issue..."
                rows={4}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-sm font-[inherit] resize-y transition-all duration-200 focus:outline-none focus:border-red-400 focus:ring-4 focus:ring-red-400/10 box-border"
              />
            </div>

            <div className="flex gap-3 pt-5 border-t-2 border-slate-100">
              <button
                onClick={rejectOrder}
                disabled={!rejectReason.trim()}
                className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg border-none cursor-pointer transition-all duration-200"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg border-none cursor-pointer transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalWrap>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>
    </div>
  );
}
