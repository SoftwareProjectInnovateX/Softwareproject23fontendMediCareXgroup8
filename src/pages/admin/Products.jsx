import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  addDoc,
  doc,
  Timestamp,
  query,
  where,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase";

const CATEGORIES = ["All", "Medicine", "Baby Items", "Skin Care", "Medical Equipment"];

// Normalize strings for case/space-insensitive category matching
const normalize = (v = "") => v.toLowerCase().replace(/\s+/g, "");

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [pendingOrders, setPendingOrders] = useState({});  // keyed by adminProductId
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQty, setOrderQty] = useState("");
  const [loading, setLoading] = useState(false);

  // On mount: load products and subscribe to live order updates
  useEffect(() => {
    loadProducts();
    const unsub = subscribeToOrders();
    return () => unsub && unsub();
  }, []);

  // Fetch all admin products and run low stock check
  const loadProducts = async () => {
    const snap = await getDocs(collection(db, "adminProducts"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setProducts(list);
    autoLowStockCheck(list);
  };

  // Real-time listener for PENDING/APPROVED/REJECTED orders
  // Keeps only the latest order per product to show the most current status
  const subscribeToOrders = () => {
    const ordersQuery = query(
      collection(db, "purchaseOrders"),
      where("status", "in", ["PENDING", "APPROVED", "REJECTED"])
    );
    return onSnapshot(ordersQuery, (snapshot) => {
      const ordersByProduct = {};
      snapshot.docs.forEach((docSnap) => {
        const order = { id: docSnap.id, ...docSnap.data() };
        const pid = order.adminProductId;
        // Keep only the most recently created order per product
        if (
          !ordersByProduct[pid] ||
          order.createdAt?.toMillis() > ordersByProduct[pid].createdAt?.toMillis()
        ) {
          ordersByProduct[pid] = order;
        }
      });
      setPendingOrders(ordersByProduct);
    });
  };

  // Checks each product's stock and flags it as LOW STOCK if at or below 100
  // Also sends a notification to the supplier if one is assigned
  const autoLowStockCheck = async (items) => {
    for (const p of items) {
      if (p.stock <= 100 && p.availability !== "LOW STOCK") {
        await updateDoc(doc(db, "adminProducts", p.id), {
          availability: "LOW STOCK",
          updatedAt: Timestamp.now(),
        });
        if (p.supplierId) {
          await addDoc(collection(db, "notifications"), {
            type: "LOW_STOCK",
            recipientId: p.supplierId,
            recipientType: "supplier",
            supplierId: p.supplierId,
            productId: p.productId,
            adminProductId: p.id,
            productName: p.productName,
            currentStock: p.stock,
            message: `LOW STOCK ALERT: ${p.productName} is below 100 units (Current: ${p.stock})`,
            read: false,
            createdAt: Timestamp.now(),
          });
        }
      }
    }
  };

  // Opens the order form for a product — blocks if no supplier is assigned
  const openOrderForm = (product) => {
    if (!product.supplierId) {
      alert("This product has no supplier assigned");
      return;
    }
    setSelectedProduct(product);
    setOrderQty("");
    setShowOrderForm(true);
  };

  const placeOrder = async () => {
    const qty = Number(orderQty);
    if (!qty || qty <= 0) {
      alert("Enter valid quantity");
      return;
    }

    try {
      setLoading(true);

      // Read the latest minStock from Firestore to avoid stale state
      const adminRef = doc(db, "adminProducts", selectedProduct.id);
      const adminSnap = await getDoc(adminRef);
      const latestMinStock = Number(adminSnap.data()?.minStock) || 0;

      // Prevent ordering more than the supplier has available
      if (qty > latestMinStock) {
        alert(`Supplier only has ${latestMinStock} units remaining. Please order ${latestMinStock} or fewer.`);
        return;
      }

      const poId = `PO-${Date.now()}`;
      const totalAmount = qty * Number(selectedProduct.wholesalePrice);

      // Place the purchase order
      const orderRef = await addDoc(collection(db, "purchaseOrders"), {
        poId,
        product: selectedProduct.productName,
        productId: selectedProduct.productId,
        adminProductId: selectedProduct.id,
        category: selectedProduct.category,
        quantity: qty,
        reorderLevel: 100,
        supplierId: selectedProduct.supplierId,
        supplierName: selectedProduct.supplierName || "Unknown Supplier",
        unitPrice: Number(selectedProduct.wholesalePrice),
        amount: totalAmount,
        totalAmount,
        pharmacy: "MediCareX",
        status: "PENDING",
        orderDate: Timestamp.now(),
        date: new Date().toISOString().split("T")[0],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        pharmacistAcknowledged: false,
      });

      await updateDoc(adminRef, {
        minStock: newMinStock,
        updatedAt: Timestamp.now(),
      });

      // Mirror minStock on supplier's products collection
      if (selectedProduct.productId) {
        await updateDoc(doc(db, "products", selectedProduct.productId), {
          minStock: newMinStock,
          updatedAt: Timestamp.now(),
        });
      }

      // Notify the supplier about the new order
      await addDoc(collection(db, "notifications"), {
        type: "ORDER_PLACED",
        recipientId: selectedProduct.supplierId,
        recipientType: "supplier",
        supplierId: selectedProduct.supplierId,
        orderId: orderRef.id,
        poId,
        adminProductId: selectedProduct.id,
        productId: selectedProduct.productId,
        productName: selectedProduct.productName,
        quantity: qty,
        totalAmount,
        message: `New Order Received: ${qty} units of ${selectedProduct.productName} (Total: Rs. ${totalAmount.toFixed(2)})`,
        read: false,
        createdAt: Timestamp.now(),
      });

      alert("Order successfully placed and supplier has been notified");
      setShowOrderForm(false);
      setSelectedProduct(null);
      loadProducts();
    } catch (err) {
      console.error(err);
      alert("Failed to place order. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // Returns a styled status badge for the latest order of a product, or null if none
  const getOrderStatus = (productId) => {
    const order = pendingOrders[productId];
    if (!order) return null;

    const statusStyle = {
      PENDING:  "bg-amber-100 text-amber-800 border border-amber-400",
      APPROVED: "bg-emerald-100 text-emerald-800 border border-emerald-500",
      REJECTED: "bg-red-100 text-red-800 border border-red-400",
    };

    const style = statusStyle[order.status] || "bg-gray-100 text-gray-600";
    const label = order.status.charAt(0) + order.status.slice(1).toLowerCase();

    return (
      <div className="flex flex-col items-center gap-1">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${style}`}>
          {label}
        </span>
        <span className="text-[11px] text-slate-400">Qty: {order.quantity}</span>
      </div>
    );
  };

  // Filter products by search term (name, manufacturer, supplier) and active category
  const filtered = products.filter((p) => {
    const matchSearch =
      p.productName?.toLowerCase().includes(search.toLowerCase()) ||
      p.manufacturer?.toLowerCase().includes(search.toLowerCase()) ||
      p.supplierName?.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      category === "All" || normalize(p.category) === normalize(category);
    return matchSearch && matchCategory;
  });

  return (
    <div className="p-8 bg-[#f5f9ff] min-h-screen">

      {/* Page Header */}
      <h1 className="text-3xl font-bold text-slate-800 mb-2">Inventory Management</h1>
      <p className="text-slate-500 text-[15px] font-medium mb-7">
        Admin Dashboard - Consolidated Inventory
      </p>

      {/* Category filter buttons */}
      <div className="flex gap-2.5 flex-wrap my-5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2.5 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 border-none
              ${category === cat
                ? "bg-blue-600 text-white shadow-md shadow-blue-300"
                : "bg-[#e6efff] text-slate-500 hover:bg-blue-100 hover:-translate-y-px"
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Keyword search input */}
      <input
        className="w-full max-w-md px-4 py-3 border-2 border-[#cbd6ee] rounded-lg text-[15px] mb-5 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Products table */}
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead className="bg-slate-50">
              <tr>
                {["ID", "Product", "Category", "Supplier", "Stock", "Reorder", "Wholesale", "Retail", "Order Status", "Action"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-4 text-left text-[13px] font-semibold text-slate-500 uppercase tracking-wide border-b-2 border-slate-200"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150"
                >
                  <td className="px-4 py-4 text-sm font-mono text-slate-600">{p.productCode}</td>

                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-800 text-sm m-0">{p.productName}</p>
                    {p.manufacturer && (
                      <p className="text-xs text-slate-400 mt-0.5 m-0">{p.manufacturer}</p>
                    )}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-700">{p.category}</td>

                  <td className="px-4 py-4">
                    <span className="inline-block bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-xs font-medium">
                      {p.supplierName || "—"}
                    </span>
                  </td>

                  {/* Stock cell turns red and shows LOW badge when at or below 100 */}
                  <td className={`px-4 py-4 text-sm font-semibold ${p.stock <= 100 ? "text-red-600" : "text-slate-800"}`}>
                    {p.stock}
                    {p.stock <= 100 && (
                      <span className="ml-1.5 inline-block bg-red-100 text-red-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                        LOW
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-700">100</td>

                  <td className="px-4 py-4 text-sm text-slate-700">
                    Rs. {p.wholesalePrice ? Number(p.wholesalePrice).toFixed(2) : "0.00"}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-700">
                    Rs. {p.retailPrice ? Number(p.retailPrice).toFixed(2) : "0.00"}
                  </td>

                  <td className="px-4 py-4">
                    {getOrderStatus(p.id) || (
                      <span className="text-slate-300 italic text-sm">—</span>
                    )}
                  </td>

                  {/* Order button only shown for low stock products; disabled if order already pending */}
                  <td className="px-4 py-4">
                    {p.stock <= 100 && (
                      <button
                        onClick={() => openOrderForm(p)}
                        disabled={pendingOrders[p.id]?.status === "PENDING"}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-md disabled:translate-y-0 disabled:shadow-none"
                      >
                        {pendingOrders[p.id]?.status === "PENDING" ? "Order Sent" : "Order Now"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty state — shown when no products match the current search/filter */}
      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl mt-5">
          <p className="text-lg text-slate-500">No products found</p>
        </div>
      )}

      {/* Order modal — clicking backdrop closes it; stopPropagation prevents inner click from closing */}
      {showOrderForm && selectedProduct && (
        <div
          className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000] p-5"
          style={{ animation: "fadeIn 0.2s ease-out" }}
          onClick={() => setShowOrderForm(false)}
        >
          <div
            className="bg-white p-8 rounded-2xl max-w-[500px] w-full shadow-2xl"
            style={{ animation: "slideUp 0.3s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-slate-800 mb-6 pb-3 border-b-[3px] border-blue-600">
              Restock Order
            </h3>

            {/* Product summary info rows */}
            <div className="bg-slate-50 p-4 rounded-lg mb-5">
              {[
                { label: "Product",            value: selectedProduct.productName },
                { label: "Supplier",           value: selectedProduct.supplierName },
                { label: "Admin Stock",        value: `${selectedProduct.stock} units` },
                { label: "Supplier Remaining", value: `${selectedProduct.minStock ?? 0} units` },
                { label: "Unit Price",         value: `Rs. ${Number(selectedProduct.wholesalePrice).toFixed(2)}` },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 text-sm">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="font-semibold text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="mb-5">
              <label className="block mb-2 font-semibold text-slate-800 text-[15px]">
                Order Quantity *
              </label>
              <input
                type="number"
                placeholder="Enter quantity"
                value={orderQty}
                onChange={(e) => setOrderQty(e.target.value)}
                min="1"
                max={selectedProduct.minStock ?? undefined}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg text-[15px] transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 box-border"
              />
              {selectedProduct.minStock > 0 && (
                <p className="text-[12px] text-slate-400 mt-1">
                  Max available from supplier: {selectedProduct.minStock} units
                </p>
              )}
            </div>

            {/* Live total amount preview based on entered quantity */}
            <div className="bg-blue-50 border-2 border-blue-200 px-4 py-4 rounded-lg mb-6">
              <p className="text-sm text-slate-500 mb-1">Total Amount:</p>
              <p className="text-2xl font-bold text-blue-600 m-0">
                Rs. {(orderQty * selectedProduct.wholesalePrice || 0).toFixed(2)}
              </p>
            </div>

            <div className="flex gap-3 pt-5 border-t-2 border-slate-100">
              <button
                onClick={placeOrder}
                disabled={loading}
                className="flex-1 py-3.5 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white text-[15px] font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                {loading ? "Placing Order..." : "Place Order"}
              </button>
              <button
                onClick={() => setShowOrderForm(false)}
                className="flex-1 py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[15px] font-semibold rounded-lg border-none cursor-pointer transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyframe animations for modal entrance */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}