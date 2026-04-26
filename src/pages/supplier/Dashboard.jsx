import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  MdShoppingCart,
  MdHourglassEmpty,
  MdCheckCircle,
  MdWarning,
  MdAddBox,
  MdLocalShipping,
} from "react-icons/md";

/* ================= Stats Card ================= */
/**
 * Displays a single summary metric with a title, numeric value, and a colored icon.
 * Used in the dashboard stats grid to give suppliers a quick overview of their activity.
 *
 * @param {string}  title    - Label describing the metric (e.g. "Total Purchase Orders").
 * @param {number}  value    - The numeric value to display.
 * @param {JSX}     icon     - React icon element rendered inside the colored badge.
 * @param {string}  bgColor  - Tailwind background class applied to the icon badge.
 */
function StatsCard({ title, value, icon, bgColor }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm transition-all duration-250 hover:-translate-y-1 hover:shadow-md">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <h2 className="text-[28px] font-bold text-slate-800 mt-1">{value}</h2>
        </div>
        <div className={`${bgColor} p-3 rounded-full transition-transform duration-250 hover:scale-110`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ================= Quick Actions ================= */
/**
 * Renders a row of shortcut buttons that navigate the supplier to key pages.
 * Each action is defined in the local `actions` array to keep the JSX clean
 * and make it easy to add or remove shortcuts in the future.
 */
function QuickActions() {
  const navigate = useNavigate();

  // Each entry defines the icon, label, background style, and destination route
  const actions = [
    {
      id: 1,
      icon: <MdShoppingCart size={20} className="text-blue-600" />,
      text: "View product orders",
      bg: "bg-blue-50 hover:bg-blue-100",
      path: "/supplier/purchase-orders",
    },
    {
      id: 2,
      icon: <MdAddBox size={20} className="text-slate-600" />,
      text: "Add products",
      bg: "bg-slate-100 hover:bg-slate-200",
      path: "/supplier/product-catalog",
    },
    {
      id: 3,
      icon: <MdLocalShipping size={20} className="text-slate-600" />,
      text: "Update Delivery",
      bg: "bg-slate-100 hover:bg-slate-200",
      path: "/supplier/update-delivery",
    },
  ];

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm mb-8">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
      <div className="flex gap-4 flex-wrap">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => navigate(action.path)}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border-none cursor-pointer font-medium text-sm text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] ${action.bg}`}
          >
            <span className="transition-transform duration-200 hover:scale-110">
              {action.icon}
            </span>
            {action.text}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================= Recent Orders ================= */
/**
 * Fetches and displays the five most recent purchase orders for the logged-in supplier.
 * Orders are queried from Firestore, sorted by creation date descending, and rendered
 * in a scrollable table with color-coded status badges.
 */
function RecentOrders() {
  const { user } = useAuth();
  const supplierId = user?.uid;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * Returns a Tailwind class string for the status badge based on the order status.
   * Covers all known statuses; defaults to purple for any unrecognized value.
   *
   * @param {string} status - The order status string (e.g. "PENDING", "DELIVERED").
   * @returns {string} Tailwind background and text color classes.
   */
  const getStatusStyle = (status) => {
    switch (status) {
      case "PENDING":     return "bg-amber-100 text-amber-800";
      case "APPROVED":    return "bg-indigo-100 text-indigo-800";
      case "IN DELIVERY": return "bg-orange-100 text-orange-700";
      case "DELIVERED":   return "bg-emerald-400 text-white";
      case "REJECTED":    return "bg-red-100 text-red-700";
      default:            return "bg-purple-100 text-purple-800";
    }
  };

  // Fetch the latest 5 purchase orders for this supplier on mount or when supplierId changes
  useEffect(() => {
    if (!supplierId) return;
    const fetchOrders = async () => {
      try {
        const q = query(
          collection(db, "purchaseOrders"),
          where("supplierId", "==", supplierId),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const snap = await getDocs(q);
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Failed to load recent orders", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [supplierId]);

  // Show a placeholder while the Firestore query is in progress
  if (loading)
    return (
      <div className="bg-white p-5 rounded-xl shadow-sm text-slate-400 text-base">
        Loading recent orders...
      </div>
    );

  // Inform the supplier if no orders exist yet
  if (orders.length === 0)
    return (
      <div className="bg-white p-5 rounded-xl shadow-sm text-slate-400 text-base">
        No recent orders
      </div>
    );

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm transition-all duration-250 hover:shadow-md">
      {/* Header with navigation shortcut to the full orders list */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-slate-800">Recent Orders</h2>
        <button
          onClick={() => navigate("/supplier/purchase-orders")}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-md active:scale-[0.96]"
        >
          View All
        </button>
      </div>

      {/* Scrollable table — min-width prevents column collapse on small screens */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr>
              {["PO ID", "Product", "Qty", "Pharmacy", "Status", "Amount"].map((h) => (
                <th
                  key={h}
                  className="px-3 py-3 text-left text-[13px] font-semibold text-slate-500 uppercase tracking-wide border-b-2 border-slate-100"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150"
              >
                {/* PO ID displayed in monospace to preserve fixed-width formatting */}
                <td className="px-3 py-3 font-mono font-semibold text-blue-600 text-sm">
                  {o.poId}
                </td>
                <td className="px-3 py-3 text-sm text-slate-800">{o.product}</td>
                <td className="px-3 py-3 text-sm text-slate-700">{o.quantity}</td>
                <td className="px-3 py-3 text-sm text-slate-700">{o.pharmacy}</td>
                <td className="px-3 py-3">
                  {/* Color-coded badge derived from getStatusStyle */}
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold uppercase transition-transform duration-200 hover:scale-105 ${getStatusStyle(o.status)}`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm font-semibold text-emerald-600">
                  Rs. {o.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= Dashboard ================= */
/**
 * Main supplier dashboard page.
 *
 * On mount it runs two parallel Firestore queries:
 *   1. All purchase orders for the supplier — used to derive total, pending, and delivered counts.
 *   2. LOW_STOCK notifications — used for the alerts count.
 *
 * The aggregated stats are passed to StatsCard components, followed by
 * the QuickActions shortcuts and the RecentOrders table.
 */
export default function Dashboard() {
  const { user } = useAuth();
  const supplierId = user?.uid;

  // Aggregated counts shown in the stats grid
  const [stats, setStats] = useState({
    total: 0, pending: 0, delivered: 0, alerts: 0,
  });

  // Load dashboard stats whenever the authenticated supplier changes
  useEffect(() => {
    if (!supplierId) return;
    const loadStats = async () => {
      try {
        // Fetch all orders for this supplier to compute status-based counts
        const ordersSnap = await getDocs(
          query(collection(db, "purchaseOrders"), where("supplierId", "==", supplierId))
        );
        let pending = 0;
        let delivered = 0;
        ordersSnap.forEach((d) => {
          const s = d.data().status;
          if (s === "PENDING") pending++;
          if (s === "DELIVERED") delivered++;
        });

        // Fetch low-stock notifications to populate the alerts counter
        const alertSnap = await getDocs(
          query(
            collection(db, "notifications"),
            where("supplierId", "==", supplierId),
            where("type", "==", "LOW_STOCK")
          )
        );
        setStats({ total: ordersSnap.size, pending, delivered, alerts: alertSnap.size });
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
      }
    };
    loadStats();
  }, [supplierId]);

  // Configuration array for the four summary cards rendered in the stats grid
  const statCards = [
    {
      title: "Total Purchase Orders",
      value: stats.total,
      icon: <MdShoppingCart size={26} className="text-blue-600" />,
      bgColor: "bg-blue-100",
    },
    {
      title: "Orders Pending Approval",
      value: stats.pending,
      icon: <MdHourglassEmpty size={26} className="text-amber-500" />,
      bgColor: "bg-amber-100",
    },
    {
      title: "Delivered Orders",
      value: stats.delivered,
      icon: <MdCheckCircle size={26} className="text-emerald-500" />,
      bgColor: "bg-emerald-100",
    },
    {
      title: "Low Stock Alerts",
      value: stats.alerts,
      icon: <MdWarning size={26} className="text-red-500" />,
      bgColor: "bg-red-100",
    },
  ];

  return (
    <div className="p-5 bg-[#f5f6fa] min-h-screen">

      {/* Stats Grid — 2 columns on mobile, 4 on large screens */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((card) => (
          <StatsCard key={card.title} {...card} />
        ))}
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Recent Orders */}
      <div>
        <RecentOrders />
      </div>
    </div>
  );
}