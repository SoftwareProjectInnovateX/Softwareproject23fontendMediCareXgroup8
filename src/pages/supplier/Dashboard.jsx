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
function StatsCard({ title, value, icon, bgColor }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_1px_4px_rgba(15,36,99,0.08)] border border-blue-50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(15,36,99,0.12)]">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{title}</p>
          <h2 className="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{value}</h2>
        </div>
        <div className={`${bgColor} p-3 rounded-xl`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 h-[2px] w-10 rounded-full bg-blue-200" />
    </div>
  );
}

/* ================= Quick Actions ================= */
function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      id: 1,
      icon: <MdShoppingCart size={18} className="text-white" />,
      text: "View Product Orders",
      bg: "bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.45)]",
      path: "/supplier/purchase-orders",
    },
    {
      id: 2,
      icon: <MdAddBox size={18} className="text-blue-600" />,
      text: "Add Products",
      bg: "bg-blue-50 hover:bg-blue-100 text-gray-800 border border-blue-200 hover:border-blue-300",
      path: "/supplier/product-catalog",
    },
    {
      id: 3,
      icon: <MdLocalShipping size={18} className="text-blue-600" />,
      text: "Update Delivery",
      bg: "bg-blue-50 hover:bg-blue-100 text-gray-800 border border-blue-200 hover:border-blue-300",
      path: "/supplier/update-delivery",
    },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-[0_1px_4px_rgba(15,36,99,0.08)] border border-blue-50 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-5 w-1 rounded-full bg-blue-600" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">Quick Actions</h2>
      </div>
      <div className="flex gap-3 flex-wrap">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => navigate(action.path)}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl cursor-pointer font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] ${action.bg}`}
          >
            {action.icon}
            {action.text}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================= Recent Orders ================= */
function RecentOrders() {
  const { user } = useAuth();
  const supplierId = user?.uid;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getStatusStyle = (status) => {
    switch (status) {
      case "PENDING":     return "bg-amber-50 text-amber-700 border border-amber-200";
      case "APPROVED":    return "bg-blue-50 text-blue-700 border border-blue-200";
      case "IN DELIVERY": return "bg-sky-50 text-sky-700 border border-sky-200";
      case "DELIVERED":   return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "REJECTED":    return "bg-red-50 text-red-700 border border-red-200";
      default:            return "bg-blue-50 text-blue-700 border border-blue-100";
    }
  };

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

  if (loading)
    return (
      <div className="bg-white p-6 rounded-2xl shadow-[0_1px_4px_rgba(15,36,99,0.08)] border border-blue-50 text-gray-400 text-sm font-medium">
        Loading recent orders...
      </div>
    );

  if (orders.length === 0)
    return (
      <div className="bg-white p-6 rounded-2xl shadow-[0_1px_4px_rgba(15,36,99,0.08)] border border-blue-50 text-gray-400 text-sm font-medium">
        No recent orders found.
      </div>
    );

  return (
    <div className="bg-white p-6 rounded-2xl shadow-[0_1px_4px_rgba(15,36,99,0.08)] border border-blue-50 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(15,36,99,0.10)]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 rounded-full bg-blue-600" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">Recent Orders</h2>
        </div>
        <button
          onClick={() => navigate("/supplier/purchase-orders")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] active:scale-[0.96]"
        >
          View All
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 rounded-lg">
              {["PO ID", "Product", "Qty", "Pharmacy", "Status", "Amount"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest first:rounded-l-lg last:rounded-r-lg"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o, index) => (
              <tr
                key={o.id}
                className={`border-b border-gray-100 hover:bg-gray-50/60 transition-colors duration-150 ${index === orders.length - 1 ? "border-none" : ""}`}
              >
                <td className="px-4 py-3.5 font-mono font-bold text-blue-600 text-sm">
                  {o.poId}
                </td>
                <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{o.product}</td>
                <td className="px-4 py-3.5 text-sm text-gray-700 tabular-nums">{o.quantity}</td>
                <td className="px-4 py-3.5 text-sm text-gray-700">{o.pharmacy}</td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${getStatusStyle(o.status)}`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-sm font-bold text-gray-900 tabular-nums">
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
export default function Dashboard() {
  const { user } = useAuth();
  const supplierId = user?.uid;

  const [stats, setStats] = useState({
    total: 0, pending: 0, delivered: 0, alerts: 0,
  });

  useEffect(() => {
    if (!supplierId) return;
    const loadStats = async () => {
      try {
        const ordersSnap = await getDocs(
          query(collection(db, "purchaseOrders"), where("supplierId", "==", supplierId))
        );
        let pending = 0;
        let delivered = 0;
        ordersSnap.forEach((d) => {
          const s = d.data().status;
          if (s === "PENDING") pending++;
          if (s === "DELIVERED" || s === "COMPLETED") delivered++;
        });

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

  const statCards = [
    {
      title: "Total Purchase Orders",
      value: stats.total,
      icon: <MdShoppingCart size={24} className="text-blue-600" />,
      bgColor: "bg-blue-100",
    },
    {
      title: "Orders Pending Approval",
      value: stats.pending,
      icon: <MdHourglassEmpty size={24} className="text-amber-500" />,
      bgColor: "bg-amber-100",
    },
    {
      title: "Delivered Orders",
      value: stats.delivered,
      icon: <MdCheckCircle size={24} className="text-emerald-500" />,
      bgColor: "bg-emerald-100",
    },
    {
      title: "Low Stock Alerts",
      value: stats.alerts,
      icon: <MdWarning size={24} className="text-red-500" />,
      bgColor: "bg-red-100",
    },
  ];

  return (
    <div className="w-full pt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {statCards.map((card) => (
          <StatsCard key={card.title} {...card} />
        ))}
      </div>
      <QuickActions />
      <div>
        <RecentOrders />
      </div>
    </div>
  );
}