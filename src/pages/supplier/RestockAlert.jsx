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
    {
      label: "Total Alerts",
      value: alerts.length,
      icon: <MdInventory size={24} className="text-blue-600" />,
      bg: "bg-white",
      iconBg: "bg-blue-100",
      valueCls: "text-blue-950",
      labelCls: "text-blue-400",
    },
    {
      label: "Unread",
      value: unreadCount,
      icon: <MdWarning size={24} className="text-white" />,
      bg: "bg-blue-600",
      iconBg: "bg-white/20",
      valueCls: "text-white",
      labelCls: "text-blue-200",
    },
    {
      label: "Read",
      value: alerts.length - unreadCount,
      icon: <MdCheckCircle size={24} className="text-blue-600" />,
      bg: "bg-white",
      iconBg: "bg-blue-100",
      valueCls: "text-blue-950",
      labelCls: "text-blue-400",
    },
  ];

  return (
    <div className="p-6 bg-[#f0f4fb] min-h-screen max-w-[1200px] mx-auto">

      {/* Page header */}
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-blue-950 mb-1 tracking-tight">Low Stock Alerts</h2>
          <p className="text-blue-400 text-sm font-medium">Monitor inventory levels and restock notifications</p>
        </div>
        {unreadCount > 0 && (
          <span className="bg-red-50 text-red-600 border border-red-200 px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-widest">
            {unreadCount} Unread
          </span>
        )}
      </div>

      {/* Summary stat cards — Total / Unread / Read */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`${card.bg} p-6 rounded-2xl shadow-[0_1px_4px_rgba(15,36,99,0.08)] border border-blue-50 flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,36,99,0.12)]`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${card.iconBg}`}>
              {card.icon}
            </div>
            <div>
              <p className={`text-3xl font-bold leading-tight tabular-nums ${card.valueCls}`}>
                {card.value}
              </p>
              <p className={`text-xs font-semibold uppercase tracking-widest mt-0.5 ${card.labelCls}`}>
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["All", "Unread", "Read"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-widest cursor-pointer transition-all duration-200
              ${filter === f
                ? "bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.30)]"
                : "bg-white text-blue-500 border border-blue-200 hover:border-blue-400 hover:bg-blue-50"
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Alert list — three states: loading, empty, populated */}
      {loading ? (
        <div className="text-center py-12 text-blue-300 text-sm font-semibold">Loading alerts...</div>
      ) : filteredAlerts.length === 0 ? (
        // Empty state
        <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(15,36,99,0.08)] border border-blue-50 py-16 text-center px-8">
          <MdCheckCircle size={56} className="text-blue-100 mx-auto mb-4" />
          <p className="text-base font-semibold text-blue-950 mb-1">No low stock alerts</p>
          <p className="text-sm text-blue-300">All inventory levels are healthy</p>
        </div>
      ) : (
        // Alert cards
        <div className="flex flex-col gap-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`relative bg-white rounded-2xl p-6 shadow-[0_1px_4px_rgba(15,36,99,0.08)] border border-blue-50 flex gap-4 border-l-4 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(15,36,99,0.12)] hover:translate-x-0.5
                ${!alert.read ? "border-l-blue-600" : "border-l-blue-200"}`}
            >
              {/* Warning icon */}
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MdWarning size={22} className="text-amber-500" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                    Low Stock Alert
                  </span>
                  <span className="text-[12px] text-blue-300 font-medium">{formatDate(alert.createdAt)}</span>
                </div>

                <p className="text-sm text-blue-950 leading-relaxed mb-4 font-medium">{alert.message}</p>

                {/* Detail pills */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-blue-50">
                  {alert.productName && (
                    <span className="text-xs text-blue-400 font-medium">
                      <span className="text-blue-700 font-semibold mr-1">Product:</span>{alert.productName}
                    </span>
                  )}
                  {alert.currentStock !== undefined && (
                    <span className="text-xs text-blue-400 font-medium">
                      <span className="text-blue-700 font-semibold mr-1">Current Stock:</span>{alert.currentStock} units
                    </span>
                  )}
                  {alert.supplierId && (
                    <span className="text-xs text-blue-400 font-medium">
                      <span className="text-blue-700 font-semibold mr-1">Supplier ID:</span>{alert.supplierId}
                    </span>
                  )}
                </div>

                {/* Mark as Read — only shown for unread alerts */}
                {!alert.read && (
                  <button
                    onClick={() => markAsRead(alert.id)}
                    className="mt-4 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600 border border-blue-200 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 cursor-pointer"
                  >
                    Mark as Read
                  </button>
                )}
              </div>

              {/* Pulse dot for unread alerts */}
              {!alert.read && (
                <span className="absolute top-6 right-6 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}