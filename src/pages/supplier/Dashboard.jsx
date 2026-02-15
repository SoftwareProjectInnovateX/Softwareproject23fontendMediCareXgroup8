import "./Dashboard.css";
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

/* ================= Stats Card ================= */
function StatsCard({ title, value, icon, iconColor }) {
  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <p className="stats-card-title">{title}</p>
          <h2 className="stats-card-value">{value}</h2>
        </div>
        <div className={`stats-card-icon ${iconColor}`}>{icon}</div>
      </div>
    </div>
  );
}

/* ================= Quick Actions ================= */
function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { id: 1, icon: "🛒", text: "View product orders", iconColor: "blue", path: "/purchase-orders" },
    { id: 2, icon: "➕", text: "Add products", iconColor: "gray", path: "/product-catalog" },
    { id: 3, icon: "🚚", text: "Update Delivery", iconColor: "gray", path: "/update-delivery" },
  ];

  return (
    <div className="quick-actions">
      <h2 className="quick-actions-title">Quick Actions</h2>
      <div className="actions-grid-horizontal">
        {actions.map(action => (
          <button
            key={action.id}
            className={`action-button-horizontal ${action.iconColor}`}
            onClick={() => navigate(action.path)}
          >
            <span className="action-icon-horizontal">{action.icon}</span>
            <span className="action-text-horizontal">{action.text}</span>
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

  const getStatusColor = (status) =>
    ({
      PENDING: "status-new",
      APPROVED: "status-approved",
      "IN DELIVERY": "status-delivery",
      DELIVERED: "status-delivered",
      REJECTED: "status-rejected",
    }[status] || "status-new");

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

        const list = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        }));

        setOrders(list);
      } catch (error) {
        console.error("Failed to load recent orders", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [supplierId]);

  if (loading) return <div className="recent-orders">Loading recent orders...</div>;
  if (orders.length === 0) return <div className="recent-orders">No recent orders</div>;

  return (
    <div className="recent-orders">
      <div className="recent-orders-header">
        <h2>Recent Orders</h2>
        <button className="view-all-btn" onClick={() => navigate("/purchase-orders")}>
          View All
        </button>
      </div>

      <table className="orders-table">
        <thead>
          <tr>
            <th>PO ID</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Pharmacy</th>
            <th>Status</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id}>
              <td><strong>{o.poId}</strong></td>
              <td>{o.product}</td>
              <td>{o.quantity}</td>
              <td>{o.pharmacy}</td>
              <td>
                <span className={`order-status ${getStatusColor(o.status)}`}>
                  {o.status}
                </span>
              </td>
              <td>Rs.{o.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================= Dashboard ================= */
export default function Dashboard() {
  const { user } = useAuth();
  const supplierId = user?.uid;

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    delivered: 0,
    alerts: 0,
  });

  useEffect(() => {
    if (!supplierId) return;

    const loadStats = async () => {
      try {
        const ordersSnap = await getDocs(
          query(
            collection(db, "purchaseOrders"),
            where("supplierId", "==", supplierId)
          )
        );

        let pending = 0;
        let delivered = 0;

        ordersSnap.forEach(doc => {
          const status = doc.data().status;
          if (status === "PENDING") pending++;
          if (status === "DELIVERED") delivered++;
        });

        const alertSnap = await getDocs(
          query(
            collection(db, "notifications"),
            where("supplierId", "==", supplierId),
            where("type", "==", "LOW_STOCK")
          )
        );

        setStats({
          total: ordersSnap.size,
          pending,
          delivered,
          alerts: alertSnap.size,
        });
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
      }
    };

    loadStats();
  }, [supplierId]);

  return (
    <div className="dashboard-container">
      <div className="stats-grid">
        <StatsCard title="Total Purchase Orders" value={stats.total} icon="🛒" iconColor="blue" />
        <StatsCard title="Orders Pending Approval" value={stats.pending} icon="⏳" iconColor="yellow" />
        <StatsCard title="Delivered Orders" value={stats.delivered} icon="✅" iconColor="green" />
        <StatsCard title="Low Stock Alerts" value={stats.alerts} icon="⚠️" iconColor="red" />
      </div>

      <QuickActions />

      <div className="dashboard-content">
        <RecentOrders />
      </div>
    </div>
  );
}
