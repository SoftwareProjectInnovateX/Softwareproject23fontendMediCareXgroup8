import { MdArrowBack, MdEmail, MdPhone, MdBadge } from "react-icons/md";
import { FaStar } from "react-icons/fa";
import { OrdersTable } from "./SupplierDetail/OrdersTable";
import { SummaryCards } from "./SupplierDetail/SummaryCards";
import { RejectedOrders } from "./SupplierDetail/RejectedOrders";

export const SupplierDetail = ({ supplier, orders, adminRating, onRating, onBack }) => (
  <div className="p-8 bg-slate-50 min-h-screen max-w-[1400px] mx-auto">

    {/* Header */}
    <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
      <h1 className="text-3xl font-bold text-slate-800">Supplier Management</h1>
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg border-none cursor-pointer transition-all duration-200"
      >
        <MdArrowBack size={18} /> Back to Suppliers
      </button>
    </div>

    {/* Supplier Details Card */}
    <div className="bg-white rounded-2xl p-8 shadow-sm mb-8">
      <div className="flex gap-8 items-center flex-wrap">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-5xl font-bold flex-shrink-0">
          {(supplier.name || supplier.email || "S").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">{supplier.name || "Unknown Supplier"}</h2>
          <p className="text-slate-500 mb-3">{supplier.contactPerson || "No contact person"}</p>
          <div className="flex gap-5 flex-wrap mb-3">
            <span className="flex items-center gap-1.5 text-sm text-slate-600">
              <MdEmail size={16} className="text-indigo-400" /> {supplier.email || "N/A"}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-slate-600">
              <MdPhone size={16} className="text-indigo-400" /> {supplier.phone || "N/A"}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-slate-600">
              <MdBadge size={16} className="text-indigo-400" /> {supplier.supplierId || "N/A"}
            </span>
          </div>
          <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold uppercase mb-3
            ${(supplier.status || "active") === "active"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"}`}>
            {supplier.status || "Active"}
          </span>
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
                  onClick={() => onRating(star)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    <h3 className="text-xl font-bold text-slate-800 mb-4">Purchase Orders from Admin</h3>
    <OrdersTable orders={orders} />
    <SummaryCards orders={orders} />
    <RejectedOrders orders={orders} />
  </div>
);