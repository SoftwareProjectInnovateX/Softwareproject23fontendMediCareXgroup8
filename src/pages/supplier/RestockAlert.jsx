import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { MdWarning, MdInventory, MdCheckCircle } from "react-icons/md";

/**
 * RestockAlert — shows LOW_STOCK notifications for the logged-in supplier.
 * Supports All / Unread / Read filtering and mark-as-read with optimistic UI.
 */
export default function RestockAlert() {
  const { user } = useAuth();
  const supplierId = user?.uid;

  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("All"); // "All" | "Unread" | "Read"

  // Fetch LOW_STOCK notifications for this supplier, newest first
  const fetchAlerts = useCallback(async () => {
    if (!supplierId) { setAlerts([]); setLoading(false); return; }
    try {
      setLoading(true);
      const q = query(
        collection(db, "notifications"),
        where("supplierId", "==", supplierId),
        where("type", "==", "LOW_STOCK"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      setAlerts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Failed to load alerts:", error);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  // Run fetch on mount and when supplier changes
  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // Broadcast unread count to the Header via a custom DOM event (avoids prop drilling)
  useEffect(() => {
    const unread = alerts.filter((a) => !a.read).length;
    window.dispatchEvent(new CustomEvent("restock-unread-count", { detail: { count: unread } }));
  }, [alerts]);

  // Mark a single alert as read in Firestore and update local state optimistically
  const markAsRead = async (alertId) => {
    try {
      await updateDoc(doc(db, "notifications", alertId), { read: true });
      // Update locally without re-fetching from Firestore
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, read: true } : a))
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  // Filter alert list based on active tab
  const filteredAlerts =
    filter === "Unread" ? alerts.filter((a) => !a.read)
    : filter === "Read"   ? alerts.filter((a) => a.read)
    : alerts;

  // Format Firestore Timestamp or any date value to a readable string
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  // Stat card definitions — avoids repetitive inline JSX
  const statCards = [
    { label: "Total Alerts", value: alerts.length,              icon: <MdInventory   size={28} className="text-slate-600" />, bg: "bg-white" },
    { label: "Unread",       value: unreadCount,                icon: <MdWarning     size={28} className="text-white" />,     bg: "bg-gradient-to-br from-indigo-500 to-purple-600", white: true },
    { label: "Read",         value: alerts.length - unreadCount, icon: <MdCheckCircle size={28} className="text-slate-600" />, bg: "bg-white" },
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen max-w-[1200px] mx-auto">

      {/* Page header — badge only visible when there are unread alerts */}
      <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-1">Low Stock Alerts</h2>
          <p className="text-slate-500 text-[15px]">Monitor inventory levels and restock notifications</p>
        </div>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold text-sm">
            {unreadCount} Unread
          </span>
        )}
      </div>

      {/* Summary stat cards — Total / Unread / Read */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`${card.bg} p-6 rounded-2xl shadow-sm flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
          >
            {/* Icon uses semi-transparent bg on the gradient card */}
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${card.white ? "bg-white/20" : "bg-slate-100"}`}>
              {card.icon}
            </div>
            <div>
              <p className={`text-[1.8rem] font-bold m-0 leading-tight ${card.white ? "text-white" : "text-slate-800"}`}>
                {card.value}
              </p>
              <p className={`text-sm m-0 mt-0.5 ${card.white ? "text-white/90" : "text-slate-500"}`}>
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs — active tab is filled indigo */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {["All", "Unread", "Read"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-3 border-2 rounded-full font-medium text-[15px] cursor-pointer transition-all duration-300
              ${filter === f
                ? "bg-indigo-500 text-white border-indigo-500"
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50"
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Alert list — three states: loading, empty, populated */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-lg">Loading alerts...</div>
      ) : filteredAlerts.length === 0 ? (
        // Empty state
        <div className="bg-white rounded-2xl shadow-sm py-16 text-center px-8">
          <MdCheckCircle size={64} className="text-slate-200 mx-auto mb-4" />
          <p className="text-lg text-slate-500 mb-1">No low stock alerts</p>
          <small className="text-sm text-slate-400">All inventory levels are healthy</small>
        </div>
      ) : (
        // Alert cards — indigo left border for unread, amber for read
        <div className="flex flex-col gap-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`relative bg-white rounded-2xl p-6 shadow-sm flex gap-4 border-l-4 transition-all duration-300
                hover:shadow-md hover:translate-x-1
                ${!alert.read ? "bg-indigo-50 border-indigo-500" : "border-amber-400"}`}
            >
              {/* Warning icon */}
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MdWarning size={26} className="text-amber-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                  <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">
                    LOW STOCK ALERT
                  </span>
                  <span className="text-[13px] text-slate-400">{formatDate(alert.createdAt)}</span>
                </div>

                <p className="text-base text-slate-800 leading-relaxed m-0 mb-4">{alert.message}</p>

                {/* Detail pills — only rendered when fields are present */}
                <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
                  {alert.productName && (
                    <span className="text-sm text-slate-500">
                      <strong className="text-slate-700 mr-1">Product:</strong>{alert.productName}
                    </span>
                  )}
                  {alert.currentStock !== undefined && (
                    <span className="text-sm text-slate-500">
                      <strong className="text-slate-700 mr-1">Current Stock:</strong>{alert.currentStock} units
                    </span>
                  )}
                  {alert.supplierId && (
                    <span className="text-sm text-slate-500">
                      <strong className="text-slate-700 mr-1">Supplier ID:</strong>{alert.supplierId}
                    </span>
                  )}
                </div>

                {/* Mark as Read — only shown for unread alerts */}
                {!alert.read && (
                  <button
                    onClick={() => markAsRead(alert.id)}
                    className="mt-4 px-4 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-300 rounded-full bg-white hover:bg-indigo-50 hover:border-indigo-500 transition-all duration-200 cursor-pointer"
                  >
                    Mark as Read
                  </button>
                )}
              </div>

              {/* Animated pulse dot — quick visual cue for unread alerts */}
              {!alert.read && (
                <span className="absolute top-6 right-6 w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}