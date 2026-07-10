import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  MdWarning,
  MdInventory,
  MdCheckCircle,
  MdFilterList,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";

const PAGE_SIZE = 10;

/**
 * RestockAlert — shows LOW_STOCK notifications for the logged-in supplier.
 * Supports All / Unread / Read filtering, numbered pagination (10 per page),
 * and mark-as-read with optimistic UI.
 */
export default function RestockAlert() {
  const { user } = useAuth();
  const supplierId = user?.uid;

  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("All"); // "All" | "Unread" | "Read"
  const [page, setPage]       = useState(1);

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

  // Reset to page 1 whenever the filter changes or the underlying data changes size
  useEffect(() => { setPage(1); }, [filter]);

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / PAGE_SIZE));

  // Clamp page if the filtered list shrinks (e.g. after marking everything as read)
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const pagedAlerts = filteredAlerts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  // Format Firestore Timestamp or any date value to a readable string
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  // Stat card definitions — avoids repetitive inline JSX.
  // Palette maps to meaning: neutral = total, amber = needs attention, emerald = resolved.
  const statCards = [
    {
      label: "Total Alerts",
      value: alerts.length,
      icon: <MdInventory size={22} className="text-slate-500" />,
      bg: "bg-white",
      iconBg: "bg-slate-100",
      valueCls: "text-slate-900",
      labelCls: "text-slate-400",
      ring: "border-slate-100",
    },
    {
      label: "Needs Attention",
      value: unreadCount,
      icon: <MdWarning size={22} className="text-amber-500" />,
      bg: "bg-white",
      iconBg: "bg-amber-50",
      valueCls: "text-slate-900",
      labelCls: "text-amber-600",
      ring: "border-amber-100",
    },
    {
      label: "Resolved",
      value: alerts.length - unreadCount,
      icon: <MdCheckCircle size={22} className="text-emerald-500" />,
      bg: "bg-white",
      iconBg: "bg-emerald-50",
      valueCls: "text-slate-900",
      labelCls: "text-emerald-600",
      ring: "border-emerald-100",
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen max-w-[1200px] mx-auto">

      {/* Page header */}
      <div className="flex justify-between items-start mb-7 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">Low Stock Alerts</h2>
          <p className="text-[13.5px] text-slate-500">Monitor inventory levels and restock notifications</p>
        </div>
        {unreadCount > 0 && (
          <span className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            {unreadCount} Needs Attention
          </span>
        )}
      </div>

      {/* Summary stat cards — Total / Needs Attention / Resolved */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`${card.bg} p-5 rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.06)] border ${card.ring} flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${card.iconBg}`}>
              {card.icon}
            </div>
            <div>
              <p className={`text-2xl font-bold leading-tight tabular-nums ${card.valueCls}`}>
                {card.value}
              </p>
              <p className={`text-[11px] font-bold uppercase tracking-widest mt-0.5 ${card.labelCls}`}>
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <MdFilterList size={16} className="text-slate-400 mr-1" />
          {["All", "Unread", "Read"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-widest cursor-pointer transition-all duration-200
                ${filter === f
                  ? "bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.25)]"
                  : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700"
                }`}
            >
              {f}
            </button>
          ))}
        </div>

        {!loading && filteredAlerts.length > 0 && (
          <p className="text-xs font-medium text-slate-400">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredAlerts.length)} of{" "}
            <span className="font-bold text-slate-600">{filteredAlerts.length}</span>
          </p>
        )}
      </div>

      {/* Alert list — three states: loading, empty, populated */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-gradient-to-r from-slate-100 via-white to-slate-100 bg-[length:200%_100%] animate-pulse border border-slate-100"
            />
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        // Empty state
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.06)] border border-slate-100 py-16 text-center px-8">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <MdCheckCircle size={28} className="text-emerald-400" />
          </div>
          <p className="text-base font-semibold text-slate-900 mb-1">No low stock alerts</p>
          <p className="text-sm text-slate-400">All inventory levels are healthy</p>
        </div>
      ) : (
        <>
          {/* Alert cards */}
          <div className="flex flex-col gap-3">
            {pagedAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`relative bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] border border-slate-100 flex gap-4 border-l-4 transition-all duration-300 hover:shadow-[0_10px_24px_rgba(15,23,42,0.10)] hover:translate-x-0.5
                  ${!alert.read ? "border-l-amber-400" : "border-l-slate-200"}`}
              >
                {/* Warning icon */}
                <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MdWarning size={22} className="text-amber-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                      Low Stock Alert
                    </span>
                    <span className="text-[12px] text-slate-400 font-medium">{formatDate(alert.createdAt)}</span>
                  </div>

                  <p className="text-sm text-slate-800 leading-relaxed mb-4 font-medium">{alert.message}</p>

                  {/* Detail pills */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-4 border-t border-slate-100">
                    {alert.productName && (
                      <span className="text-xs text-slate-500 font-medium">
                        <span className="text-slate-700 font-semibold mr-1">Product:</span>{alert.productName}
                      </span>
                    )}
                    {alert.currentStock !== undefined && (
                      <span className="text-xs text-slate-500 font-medium">
                        <span className="text-slate-700 font-semibold mr-1">Current Stock:</span>{alert.currentStock} units
                      </span>
                    )}
                    {alert.supplierId && (
                      <span className="text-xs text-slate-500 font-medium">
                        <span className="text-slate-700 font-semibold mr-1">Supplier ID:</span>{alert.supplierId}
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
                  <span className="absolute top-6 right-6 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
                )}
              </div>
            ))}
          </div>

          {/* Numbered pagination — prev / page numbers / next */}
          {totalPages > 1 && (
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
        </>
      )}
    </div>
  );
}