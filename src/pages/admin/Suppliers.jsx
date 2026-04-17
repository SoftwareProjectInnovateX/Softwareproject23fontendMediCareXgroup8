import { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import { MdArrowBack, MdEmail, MdPhone, MdBadge } from "react-icons/md";
import { FaStar } from "react-icons/fa";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [adminRating, setAdminRating] = useState(0);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, "suppliers"));
        setSuppliers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error loading suppliers:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!selectedSupplier) return;
      try {
        const q = query(
          collection(db, "purchaseOrders"),
          where("supplierId", "==", selectedSupplier.userId || selectedSupplier.id),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        setOrders(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            date: d.data().orderDate?.toDate
              ? d.data().orderDate.toDate().toLocaleDateString()
              : d.data().createdAt?.toDate
              ? d.data().createdAt.toDate().toLocaleDateString()
              : "N/A",
          }))
        );
        setAdminRating(selectedSupplier.rating || 0);
      } catch (err) {
        console.error("Error loading orders:", err);
        alert("Failed to load orders: " + err.message);
      }
    };
    fetchOrders();
  }, [selectedSupplier]);

  const handleRating = async (value) => {
    try {
      setAdminRating(value);
      await updateDoc(doc(db, "suppliers", selectedSupplier.id), { rating: value });
      setSuppliers((prev) =>
        prev.map((s) => (s.id === selectedSupplier.id ? { ...s, rating: value } : s))
      );
      setSelectedSupplier((prev) => ({ ...prev, rating: value }));
    } catch (err) {
      console.error("Error updating rating:", err);
    }
  };

  const getOrderStatusStyle = (status) => {
    switch ((status || "").toLowerCase()) {
      case "pending":   return "bg-amber-100 text-amber-800";
      case "approved":  return "bg-emerald-100 text-emerald-800";
      case "rejected":  return "bg-red-100 text-red-800";
      case "completed": return "bg-cyan-100 text-cyan-800";
      default:          return "bg-gray-100 text-gray-600";
    }
  };

  const filteredSuppliers = suppliers.filter((s) =>
    (s.name || s.email || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading)
    return (
      <div className="p-8 text-slate-500 text-lg">Loading suppliers...</div>
    );

  /* SUPPLIER DETAIL VIEW */
  if (selectedSupplier) {
    const summaryCards = [
      { label: "Total Orders",  value: orders.length,                                        color: "text-slate-800" },
      { label: "Pending",       value: orders.filter((o) => o.status === "PENDING").length,   color: "text-amber-500" },
      { label: "Approved",      value: orders.filter((o) => o.status === "APPROVED").length,  color: "text-emerald-500" },
      { label: "Rejected",      value: orders.filter((o) => o.status === "REJECTED").length,  color: "text-red-500" },
      { label: "Completed",     value: orders.filter((o) => o.status === "COMPLETED").length, color: "text-cyan-500" },
      {
        label: "Total Value",
        value: `Rs. ${orders.reduce((s, o) => s + (Number(o.amount || o.totalAmount) || 0), 0).toFixed(2)}`,
        color: "text-indigo-500",
      },
    ];

    const rejectedOrders = orders.filter((o) => o.status === "REJECTED");

    return (
      <div className="p-8 bg-slate-50 min-h-screen max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-slate-800">Supplier Management</h1>
          <button
            onClick={() => setSelectedSupplier(null)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg border-none cursor-pointer transition-all duration-200"
          >
            <MdArrowBack size={18} /> Back to Suppliers
          </button>
        </div>

        {/* Supplier Details Card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm mb-8">
          <div className="flex gap-8 items-center flex-wrap">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-5xl font-bold flex-shrink-0">
              {(selectedSupplier.name || selectedSupplier.email || "S").charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-slate-800 mb-1">
                {selectedSupplier.name || "Unknown Supplier"}
              </h2>
              <p className="text-slate-500 mb-3">
                {selectedSupplier.contactPerson || "No contact person"}
              </p>

              <div className="flex gap-5 flex-wrap mb-3">
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <MdEmail size={16} className="text-indigo-400" />
                  {selectedSupplier.email || "N/A"}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <MdPhone size={16} className="text-indigo-400" />
                  {selectedSupplier.phone || "N/A"}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <MdBadge size={16} className="text-indigo-400" />
                  {selectedSupplier.supplierId || "N/A"}
                </span>
              </div>

              <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold uppercase mb-3
                ${(selectedSupplier.status || "active") === "active"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"}`}>
                {selectedSupplier.status || "Active"}
              </span>

              {/* Star Rating */}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm font-semibold text-slate-700">Admin Rating:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      size={22}
                      className={`cursor-pointer transition-colors duration-150 ${
                        star <= adminRating ? "text-amber-400" : "text-slate-300"
                      }`}
                      onClick={() => handleRating(star)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <h3 className="text-xl font-bold text-slate-800 mb-4">Purchase Orders from Admin</h3>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm mb-8">
            <p className="text-lg text-slate-500 mb-1">No orders placed for this supplier yet</p>
            <small className="text-slate-400">Orders placed by admin will appear here</small>
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-8">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[900px]">
                <thead className="bg-indigo-500">
                  <tr>
                    {["PO ID", "Product", "Product Code", "Category", "Quantity", "Unit Price", "Total Amount", "Status", "Order Date", "Response Date"].map((h) => (
                      <th key={h} className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 font-mono font-semibold text-indigo-600 text-sm">{order.poId}</td>
                      <td className="px-4 py-4 font-semibold text-slate-800 text-sm">{order.product || order.productName || "N/A"}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{order.productCode || "N/A"}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{order.category || "N/A"}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-800">{order.quantity || 0} units</td>
                      <td className="px-4 py-4 text-sm font-semibold text-emerald-600">Rs. {Number(order.unitPrice || 0).toFixed(2)}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-emerald-600">Rs. {Number(order.amount || order.totalAmount || 0).toFixed(2)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase ${getOrderStatusStyle(order.status)}`}>
                          {order.status || "PENDING"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{order.date}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {order.approvalDate?.toDate
                          ? order.approvalDate.toDate().toLocaleDateString()
                          : order.approvedAt?.toDate
                          ? order.approvedAt.toDate().toLocaleDateString()
                          : order.rejectionDate?.toDate
                          ? order.rejectionDate.toDate().toLocaleDateString()
                          : order.rejectedAt?.toDate
                          ? order.rejectedAt.toDate().toLocaleDateString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl p-5 shadow-sm text-center">
              <h4 className="text-xs text-slate-500 uppercase font-semibold mb-2">{card.label}</h4>
              <p className={`text-3xl font-bold m-0 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Rejected Orders */}
        {rejectedOrders.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xl font-bold text-red-500 mb-4">Rejected Orders</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rejectedOrders.map((order) => (
                <div key={order.id} className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono font-semibold text-indigo-600 text-sm">{order.poId}</span>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase bg-red-100 text-red-800">
                      REJECTED
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mb-1"><strong>Product:</strong> {order.product || order.productName}</p>
                  <p className="text-sm text-slate-700 mb-1"><strong>Quantity:</strong> {order.quantity} units</p>
                  <p className="text-sm text-slate-700 mb-1">
                    <strong>Rejection Date:</strong>{" "}
                    {order.rejectionDate?.toDate ? order.rejectionDate.toDate().toLocaleDateString() : "N/A"}
                  </p>
                  {order.rejectionReason && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="text-xs font-semibold text-red-600 mb-1">Reason:</p>
                      <p className="text-sm text-red-900 italic">{order.rejectionReason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* SUPPLIER CARDS VIEW  */
  return (
    <div className="p-8 bg-slate-50 min-h-screen max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-1">Supplier Management</h1>
        <p className="text-slate-500 text-[15px]">Manage and view all registered suppliers</p>
      </div>

      {/* Search + Count */}
      <div className="flex justify-between items-center mb-8 gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search suppliers by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[300px] px-4 py-3 border-2 border-slate-200 rounded-xl text-[15px] transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        />
        <div className="bg-indigo-500 text-white px-5 py-3 rounded-xl font-semibold text-sm">
          {filteredSuppliers.length} Suppliers
        </div>
      </div>

      {/* Grid or Empty */}
      {filteredSuppliers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <p className="text-lg text-slate-500">No suppliers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onView={() => setSelectedSupplier(supplier)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/*  SUPPLIER CARD  */
function SupplierCard({ supplier, onView }) {
  const [stats, setStats] = useState({
    products: 0, totalOrders: 0, pendingOrders: 0, approvedOrders: 0, completedOrders: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const sid = supplier.userId || supplier.id;
        const productsSnap = await getDocs(query(collection(db, "products"), where("supplierId", "==", sid)));
        const ordersSnap   = await getDocs(query(collection(db, "purchaseOrders"), where("supplierId", "==", sid)));
        const allOrders = ordersSnap.docs.map((d) => d.data());
        setStats({
          products:       productsSnap.size,
          totalOrders:    allOrders.length,
          pendingOrders:  allOrders.filter((o) => o.status === "PENDING").length,
          approvedOrders: allOrders.filter((o) => o.status === "APPROVED").length,
          completedOrders:allOrders.filter((o) => o.status === "COMPLETED").length,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };
    fetchStats();
  }, [supplier.id, supplier.userId]);

  const isActive = (supplier.status || "active") === "active";

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-md">

      {/* Top row */}
      <div className="flex justify-between items-center mb-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-2xl font-bold">
          {(supplier.name || supplier.email || "S").charAt(0).toUpperCase()}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase
          ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
          {supplier.status || "Active"}
        </span>
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-0.5">{supplier.name || "Unknown Supplier"}</h3>
      <p className="text-sm text-slate-500 mb-4">{supplier.contactPerson || supplier.email || "No contact"}</p>

      {/* Contact info */}
      <div className="flex flex-col gap-2 bg-slate-50 rounded-lg p-3 mb-4">
        <span className="flex items-center gap-2 text-sm text-slate-600">
          <MdEmail size={15} className="text-indigo-400" /> {supplier.email || "N/A"}
        </span>
        <span className="flex items-center gap-2 text-sm text-slate-600">
          <MdPhone size={15} className="text-indigo-400" /> {supplier.phone || "N/A"}
        </span>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-1.5 mb-3">
        <FaStar size={15} className="text-amber-400" />
        <span className="text-sm font-semibold text-amber-500">
          {supplier.rating || "N/A"} rating
        </span>
      </div>

      {/* Categories */}
      {supplier.categories?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {supplier.categories.map((cat, i) => (
            <span key={i} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-auto pt-4 border-t border-slate-100">
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: "Products",     value: stats.products,      color: "text-slate-800" },
            { label: "Total Orders", value: stats.totalOrders,   color: "text-indigo-500" },
            { label: "Pending",      value: stats.pendingOrders, color: "text-amber-500" },
            { label: "Approved",     value: stats.approvedOrders,color: "text-emerald-500" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center bg-slate-50 rounded-lg py-3 px-2 text-center">
              <span className="text-[11px] text-slate-500 uppercase font-medium mb-1">{s.label}</span>
              <strong className={`text-2xl font-bold ${s.color}`}>{s.value}</strong>
            </div>
          ))}
        </div>
        <button
          onClick={onView}
          className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 text-sm"
        >
          View All Orders ({stats.totalOrders})
        </button>
      </div>
    </div>
  );
}
