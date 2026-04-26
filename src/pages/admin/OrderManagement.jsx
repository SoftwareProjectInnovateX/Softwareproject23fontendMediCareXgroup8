import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, updateDoc, doc, Timestamp, getDoc, addDoc, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Card from '../../components/Card';
import { OrderFilters } from '../../components/admin/OrderFilters';
import { OrderTable } from '../../components/admin/OrderTable';
import { OrderModal } from '../../components/admin/OrderModal';

/**
 * OrderManagement page — allows admins to view, search, filter, and complete
 * all supplier purchase orders across the platform.
 *
 * Data flow:
 *   - All purchase orders are fetched from `purchaseOrders` on mount, ordered
 *     by creation date descending.
 *   - A derived `filteredOrders` list is recomputed whenever the status filter
 *     or search term changes, without re-querying Firestore.
 *   - Marking an order as COMPLETED triggers a multi-step write:
 *       1. Updates the order status in `purchaseOrders`.
 *       2. Increments stock in the `adminProducts` collection.
 *       3. Upserts a FINAL payment record in `payments` (creates if absent,
 *          unlocks if already exists).
 *       4. Creates a FINAL invoice in `invoices` so the supplier can see it
 *          in their InvoicePayments view (queried by supplierId).
 */
const OrderManagement = () => {
  const [orders, setOrders]                   = useState([]);
  const [filteredOrders, setFilteredOrders]   = useState([]);  // derived view — updated by the filter effect
  const [loading, setLoading]                 = useState(true);
  const [statusFilter, setStatusFilter]       = useState('All');
  const [searchTerm, setSearchTerm]           = useState('');
  const [selectedOrder, setSelectedOrder]     = useState(null);    // order open in the details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  /**
   * Fetches all purchase orders from Firestore, ordered by creation date descending.
   * Both `orders` (full list) and `filteredOrders` (displayed list) are set to the
   * same data on load; the filter effect then narrows `filteredOrders` as needed.
   * Called on mount and again after any status mutation to keep the table current.
   */
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(
        query(collection(db, 'purchaseOrders'), orderBy('createdAt', 'desc'))
      );
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOrders(data);
      setFilteredOrders(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Failed to load orders: ' + error.message);
      setLoading(false);
    }
  };

  // Fetch all orders once on mount
  useEffect(() => { fetchOrders(); }, []);

  /**
   * Recomputes the filtered order list whenever the status filter, search term,
   * or underlying orders array changes. Filtering is done client-side against the
   * already-fetched `orders` array to avoid additional Firestore round-trips.
   * Search matches against PO ID, product ID, product name, and supplier name.
   */
  useEffect(() => {
    let filtered = orders;
    if (statusFilter !== 'All') filtered = filtered.filter((o) => o.status === statusFilter);
    if (searchTerm)
      filtered = filtered.filter(
        (o) =>
          o.poId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.productId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.product?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    setFilteredOrders(filtered);
  }, [statusFilter, searchTerm, orders]);

  /**
   * Selects an order and opens the details modal.
   *
   * @param {Object} order - The purchase order document to display.
   */
  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  /**
   * Marks a DELIVERED order as COMPLETED and executes all downstream side-effects.
   * The admin is prompted to confirm before any writes are made.
   *
   * Steps:
   *   1. Updates the order status to COMPLETED in `purchaseOrders`.
   *   2. Increments the admin product's stock in `adminProducts`.
   *   3. Upserts the FINAL payment in `payments`:
   *        - If a FINAL payment record already exists, it is unlocked (set to PENDING).
   *        - If none exists, a new record is created with a 14-day due date.
   *   4. Creates a FINAL invoice in `invoices` if one does not already exist,
   *      so the supplier can view it through their InvoicePayments page.
   *
   * @param {string} orderId - Firestore document ID of the order to complete.
   * @param {Object} order   - The purchase order data object.
   */
  const markAsReceived = async (orderId, order) => {
    if (!window.confirm('Mark this order as COMPLETED?\n\nThis will update the inventory stock and unlock the final payment.')) return;
    try {
      // Step 1 — mark the order as completed and record the completion timestamp
      await updateDoc(doc(db, 'purchaseOrders', orderId), {
        status: 'COMPLETED',
        completionDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Step 2 — increment the admin product stock now that the delivery is confirmed
      const adminProductRef  = doc(db, 'adminProducts', order.adminProductId);
      const adminProductSnap = await getDoc(adminProductRef);
      if (adminProductSnap.exists()) {
        await updateDoc(adminProductRef, {
          stock:         adminProductSnap.data().stock + order.quantity,
          availability:  'in stock',
          lastRestocked: Timestamp.now(),
          updatedAt:     Timestamp.now(),
        });
      }

      // Resolve display values with fallbacks to handle incomplete order documents
      const resolvedProductName = order.productName || order.product || 'N/A';
      const resolvedPoId        = order.poId || order.productId || orderId;
      const resolvedTotal       = order.totalAmount ?? (order.quantity * order.unitPrice) ?? 0;

      // ─── Step 3: Upsert FINAL payment record ─────────────────────────────
      // If a FINAL payment already exists, unlock it; otherwise create a new one
      const paymentsSnap = await getDocs(
        query(
          collection(db, 'payments'),
          where('purchaseOrderId', '==', orderId),
          where('paymentType', '==', 'FINAL')
        )
      );

      if (!paymentsSnap.empty) {
        // Unlock an existing FINAL payment record that was created earlier
        await updateDoc(doc(db, 'payments', paymentsSnap.docs[0].id), {
          status:     'PENDING',
          unlockedAt: Timestamp.now(),
          updatedAt:  Timestamp.now(),
        });
      } else {
        // No FINAL payment exists yet — create one with a 14-day due date
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        await addDoc(collection(db, 'payments'), {
          purchaseOrderId:  orderId,
          orderId:          resolvedPoId,
          supplierId:       order.supplierId   || null,
          supplierName:     order.supplierName || 'N/A',
          productName:      resolvedProductName,
          quantity:         order.quantity     || 0,
          amount:           resolvedTotal / 2,       // final payment is 50% of the total
          totalOrderAmount: resolvedTotal,
          paymentType:      'FINAL',
          paymentLabel:     'Final Payment (50%)',
          status:           'PENDING',
          dueDate:          Timestamp.fromDate(dueDate),
          createdAt:        Timestamp.now(),
          updatedAt:        Timestamp.now(),
        });
      }

      // ─── Step 4: Create FINAL invoice if one does not already exist ───────
      // The invoice must include supplierId so the supplier's InvoicePayments
      // page (which queries by supplierId) can find and display it.
      const finalInvoiceSnap = await getDocs(
        query(
          collection(db, 'invoices'),
          where('purchaseOrderId', '==', orderId),
          where('invoiceType', '==', 'FINAL')
        )
      );

      if (finalInvoiceSnap.empty) {
        const invoiceDueDate = new Date();
        invoiceDueDate.setDate(invoiceDueDate.getDate() + 14);

        await addDoc(collection(db, 'invoices'), {
          purchaseOrderId:  orderId,
          invoiceNumber:    `INV-FINAL-${resolvedPoId}`,
          orderId:          resolvedPoId,
          supplierId:       order.supplierId        || null,   // required for supplier query
          supplierName:     order.supplierName      || 'N/A',
          pharmacy:         order.pharmacy          || order.pharmacyName || order.orderedBy || 'N/A',
          invoiceType:      'FINAL',
          invoiceLabel:     'Final Payment (50%)',
          paymentStatus:    'Pending',
          invoiceDate:      Timestamp.now(),
          dueDate:          Timestamp.fromDate(invoiceDueDate),
          items: order.items || [
            {
              productName: resolvedProductName,
              quantity:    order.quantity  || 0,
              unitPrice:   order.unitPrice || 0,
            },
          ],
          subtotal:         resolvedTotal / 2,
          taxRate:          order.taxRate   || 0,
          taxAmount:        order.taxAmount || 0,
          totalAmount:      resolvedTotal / 2,
          totalOrderAmount: resolvedTotal,
          createdAt:        Timestamp.now(),
          updatedAt:        Timestamp.now(),
        });
      }

      alert('Order marked as COMPLETED and stock updated!\n\nFinal payment is now available in Payments.');
      fetchOrders();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error marking order as received:', error);
      alert('Failed to update order: ' + error.message);
    }
  };

  /**
   * Configuration array for the six summary stat cards.
   * Counts are derived from the full (unfiltered) orders array so they remain
   * accurate regardless of the active search or status filter.
   * Total Amount is computed as quantity × unitPrice across all orders.
   */
  const stats = [
    { title: 'Total Orders', value: orders.length,                                         color: 'bg-slate-500' },
    { title: 'Pending',      value: orders.filter((o) => o.status === 'PENDING').length,   color: 'bg-amber-500' },
    { title: 'Approved',     value: orders.filter((o) => o.status === 'APPROVED').length,  color: 'bg-blue-500' },
    { title: 'Delivered',    value: orders.filter((o) => o.status === 'DELIVERED').length, color: 'bg-orange-500' },
    { title: 'Completed',    value: orders.filter((o) => o.status === 'COMPLETED').length, color: 'bg-emerald-500' },
    {
      title: 'Total Amount',
      // Summed from all orders regardless of status to reflect overall platform volume
      value: `Rs. ${orders.reduce((s, o) => s + ((o.quantity || 0) * (o.unitPrice || 0)), 0).toFixed(2)}`,
      color: 'bg-violet-500',
    },
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen">

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Purchase Orders</h1>
        <p className="text-slate-500 text-[15px]">Manage and track all purchase orders</p>
      </div>

      {/* Summary Stat Cards — counts derived from full order list, unaffected by active filters */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {stats.map((card) => (
          <Card key={card.title} title={card.title} value={card.value} color={card.color} />
        ))}
      </div>

      {/* Delivered Alert — shown only when at least one order is awaiting admin receipt confirmation */}
      {orders.some((o) => o.status === 'DELIVERED') && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-orange-50 border border-orange-300 p-4">
          <svg className="h-5 w-5 flex-shrink-0 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-orange-800 font-medium m-0">
            {orders.filter((o) => o.status === 'DELIVERED').length} order(s) delivered by supplier — please verify receipt and mark as Completed to unlock final payment.
          </p>
        </div>
      )}

      {/* Search and Status Filter Bar */}
      <OrderFilters
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
      />

      {/* Orders Table — displays the filtered order list */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        <OrderTable loading={loading} orders={filteredOrders} onView={viewOrderDetails} />
      </div>

      {/* Order Details Modal — rendered only when an order is selected */}
      {showDetailsModal && selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setShowDetailsModal(false)}
          onMarkReceived={markAsReceived}
        />
      )}

      {/* Keyframe animations used by modal entrance transitions */}
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 }               to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
};

export default OrderManagement;