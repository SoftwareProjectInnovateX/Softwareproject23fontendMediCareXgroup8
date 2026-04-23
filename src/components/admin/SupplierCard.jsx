import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { MdEmail, MdPhone } from "react-icons/md";
import { FaStar } from "react-icons/fa";

export const SupplierCard = ({ supplier, onView }) => {
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
          products:        productsSnap.size,
          totalOrders:     allOrders.length,
          pendingOrders:   allOrders.filter((o) => o.status === "PENDING").length,
          approvedOrders:  allOrders.filter((o) => o.status === "APPROVED").length,
          completedOrders: allOrders.filter((o) => o.status === "COMPLETED").length,
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

      <div className="flex flex-col gap-2 bg-slate-50 rounded-lg p-3 mb-4">
        <span className="flex items-center gap-2 text-sm text-slate-600">
          <MdEmail size={15} className="text-indigo-400" /> {supplier.email || "N/A"}
        </span>
        <span className="flex items-center gap-2 text-sm text-slate-600">
          <MdPhone size={15} className="text-indigo-400" /> {supplier.phone || "N/A"}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <FaStar size={15} className="text-amber-400" />
        <span className="text-sm font-semibold text-amber-500">{supplier.rating || "N/A"} rating</span>
      </div>

      {supplier.categories?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {supplier.categories.map((cat, i) => (
            <span key={i} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">{cat}</span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-slate-100">
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: "Products",     value: stats.products,       color: "text-slate-800" },
            { label: "Total Orders", value: stats.totalOrders,    color: "text-indigo-500" },
            { label: "Pending",      value: stats.pendingOrders,  color: "text-amber-500" },
            { label: "Approved",     value: stats.approvedOrders, color: "text-emerald-500" },
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
};