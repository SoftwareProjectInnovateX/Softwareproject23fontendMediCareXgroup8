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
  MdArrowForward,
  MdInbox,
} from "react-icons/md";
import Card from "../../components/Card";

/* ================= Quick Actions ================= */
function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      id: 1,
      icon: <MdShoppingCart size={20} className="text-white" />,
      text: "View Product Orders",
      subtext: "Track & manage POs",
      bg: "bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:shadow-[0_8px_22px_rgba(37,99,235,0.45)]",
      iconWrap: "bg-white/15",
      path: "/supplier/purchase-orders",
    },
    {
      id: 2,
      icon: <MdAddBox size={20} className="text-blue-600" />,
      text: "Add Products",
      subtext: "Grow your catalog",
      bg: "bg-blue-50 hover:bg-blue-100 text-gray-800 border border-blue-200 hover:border-blue-300",
      iconWrap: "bg-white",
      path: "/supplier/product-catalog",
    },
    {
      id: 3,
      icon: <MdLocalShipping size={20} className="text-blue-600" />,
      text: "Update Delivery",
      subtext: "Keep pharmacies posted",
      bg: "bg-blue-50 hover:bg-blue-100 text-gray-800 border border-blue-200 hover:border-blue-300",
      iconWrap: "bg-white",
      path: "/supplier/update-delivery",
    },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-[0_1px_4px_rgba(15,36,99,0.08)] border border-blue-50 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-5 w-1 rounded-full bg-blue-600" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">
          Quick Actions
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => navigate(action.path)}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl cursor-pointer font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] text-left ${action.bg}`}
          >
            <span className={`flex items-center justify-center h-9 w-9 rounded-lg ${action.iconWrap} shrink-0`}>
              {action.icon}
            </span>
            <span className="flex flex-col leading-tight">
              <span>{action.text}</span>
              <span className="text-xs font-normal opacity-70 mt-0.5">
                {action.subtext}
              </span>
            </span>
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

  const getStatusDot = (status) => {
    switch (status) {
      case "PENDING":     return "bg-amber-500";
      case "APPROVED":    return "bg-blue-500";
      case "IN DELIVERY": return "bg-sky-500";
      case "DELIVERED":   return "bg-emerald-500";
      case "REJECTED":    return "bg-red-500";
      default:            return "bg-blue-400";
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

  const Header = () => (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-3">
        <div className="h-5 w-1 rounded-full bg-blue-600" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">
          Recent Orders
        </h2>
      </div>
      <button
        onClick={() => navigate("/supplier/purchase-orders")}
        className="group flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] active:scale-[0.96]"
      >
        View All
        <MdArrowForward
          size={14}
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </button>
    </div>
  );

  if (loading)
    return (
      <div className="bg-white p-6 rounded-2xl shadow-[0_1px_4px_rgba(15,36,99,0.08)] border border-blue-50">
        <Header />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-11 rounded-lg bg-gradient-to-r from-blue-50 via-gray-50 to-blue-50 bg-[length:200%_100%] animate-pulse"
            />
          ))}
        </div>
      </div>
    );

  if (orders.length === 0)
    return (
      <div className="bg-white p-6 rounded-2xl shadow-[0_1px_4px_rgba(15,36,99,0.08)] border border-blue-50">
        <Header />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <MdInbox size={26} className="text-blue-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500">
            No recent orders found
          </p>
          <p className="text-xs text-gray-400 mt-1">
            New purchase orders will show up here.
          </p>
        </div>
      </div>
    );

  return (
    <div className="bg-white p-6 rounded-2xl shadow-[0_1px_4px_rgba(15,36,99,0.08)] border border-blue-50 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(15,36,99,0.10)]">
      <Header />

      <div className="overflow-x-auto -mx-2 px-2">
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
                className={`border-b border-gray-100 hover:bg-blue-50/40 transition-colors duration-150 ${index === orders.length - 1 ? "border-none" : ""}`}
              >
                <td className="px-4 py-3.5 font-mono font-bold text-blue-600 text-sm">
                  {o.poId}
                </td>
                <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{o.product}</td>
                <td className="px-4 py-3.5 text-sm text-gray-700 tabular-nums">{o.quantity}</td>
                <td className="px-4 py-3.5 text-sm text-gray-700">{o.pharmacy}</td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${getStatusStyle(o.status)}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(o.status)}`} />
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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Supplier Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          A quick look at your orders, deliveries, and stock alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {statCards.map((card) => (
          <Card key={card.title}>
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  {card.title}
                </p>
                <h2 className="text-3xl font-bold text-gray-900 mt-1 tabular-nums">
                  {card.value}
                </h2>
              </div>
              <div
                className={`${card.bgColor} p-3 rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
              >
                {card.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <QuickActions />
      <div>
        <RecentOrders />
      </div>
    </div>
  );
}