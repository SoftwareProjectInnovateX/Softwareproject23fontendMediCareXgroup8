import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
const FinancialTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
        <p className="text-slate-500 mb-2 font-semibold">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ background: entry.color }}
            />
            <span className="text-slate-500 capitalize">{entry.name}:</span>
            <span className="text-slate-800 font-bold">
              Rs. {Number(entry.value).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Stock Bar ─────────────────────────────────────────────────────────────────
const StockBar = ({ stock, max = 100 }) => {
  const pct = Math.min((stock / max) * 100, 100);
  const color =
    stock <= 30 ? "#ef4444" : stock <= 70 ? "#f59e0b" : "#3b82f6";
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
      <div
        className="h-1.5 rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0, suppliers: 0, products: 0,
    revenue: 0, cost: 0, profit: 0,
  });
  const [monthlyData, setMonthlyData]     = useState([]);
  const [recentOrders, setRecentOrders]   = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    fetchAll();
    // Real-time low stock listener
    const unsub = onSnapshot(
      query(collection(db, "adminProducts"), where("stock", "<=", 100)),
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.stock || 0) - (b.stock || 0));
        setLowStockItems(items);
      }
    );
    return () => unsub();
  }, []);

  const fetchAll = async () => {
    try {
      const [usersSnap, suppliersSnap, productsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "suppliers")),
        getDocs(collection(db, "adminProducts")),
      ]);

      // Revenue from CustomerOrders
      const customerOrdersSnap = await getDocs(collection(db, "CustomerOrders"));
      const customerOrders = customerOrdersSnap.docs.map((d) => d.data());
      const revenue = customerOrders.reduce(
        (sum, o) => sum + (o.totalAmount || o.total || 0), 0
      );

      // Cost from payments (PAID only)
      const paymentsSnap = await getDocs(
        query(collection(db, "payments"), where("status", "==", "PAID"))
      );
      const payments = paymentsSnap.docs.map((d) => d.data());
      const cost = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Build monthly chart data
      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const monthlyMap = {};

      customerOrders.forEach((o) => {
        const date = o.createdAt?.toDate?.() || new Date(o.createdAt || 0);
        const key  = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            month: monthNames[date.getMonth()],
            revenue: 0, cost: 0,
            year: date.getFullYear(),
            monthIdx: date.getMonth(),
          };
        }
        monthlyMap[key].revenue += o.totalAmount || o.total || 0;
      });

      payments.forEach((p) => {
        const date = p.createdAt?.toDate?.() || new Date(p.createdAt || 0);
        const key  = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            month: monthNames[date.getMonth()],
            revenue: 0, cost: 0,
            year: date.getFullYear(),
            monthIdx: date.getMonth(),
          };
        }
        monthlyMap[key].cost += p.amount || 0;
      });

      const chartData = Object.values(monthlyMap)
        .sort((a, b) =>
          a.year !== b.year ? a.year - b.year : a.monthIdx - b.monthIdx
        )
        .map((d) => ({ ...d, profit: d.revenue - d.cost }));

      // Recent purchase orders
      const recentSnap = await getDocs(
        query(collection(db, "purchaseOrders"), orderBy("createdAt", "desc"), limit(5))
      );
      const recent = recentSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setStats({
        users:     usersSnap.size,
        suppliers: suppliersSnap.size,
        products:  productsSnap.size,
        revenue, cost, profit: revenue - cost,
      });
      setMonthlyData(chartData);
      setRecentOrders(recent);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#f5f7fb] min-h-screen">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          MediCareX · Pharmacy Management System
        </p>
      </div>

      {/* ── Main layout: left content + right sidebar ────────────────── */}
      <div className="flex gap-6 flex-col xl:flex-row">

        {/* ── LEFT: main content ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">

          {/* Stat Cards — using existing Card component */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            <Card title="Total Users"    value={stats.users} />
            <Card title="Suppliers"      value={stats.suppliers} />
            <Card title="Products"       value={stats.products} />
            <Card title="Total Revenue"  value={`Rs. ${stats.revenue.toLocaleString()}`} />
            <Card title="Total Payments" value={`Rs. ${stats.cost.toLocaleString()}`} />
            <Card title="Net Profit"     value={`Rs. ${stats.profit.toLocaleString()}`} />
          </div>

          {/* ── Financial Chart ───────────────────────────────────────── */}
          <div className="bg-white p-6 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Revenue vs Payments vs Profit
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Monthly financial overview
                </p>
              </div>
              {/* Legend */}
              <div className="flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />
                  Revenue
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#818cf8" }} />
                  Payments
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#34d399" }} />
                  Profit
                </span>
              </div>
            </div>

            {monthlyData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
                No financial data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={monthlyData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  barCategoryGap="30%"
                  barGap={3}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                    }
                  />
                  <Tooltip
                    content={<FinancialTooltip />}
                    cursor={{ fill: "rgba(59,130,246,0.04)" }}
                  />
                  <Bar dataKey="revenue" name="Revenue"  fill="#1e88e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost"    name="Payments" fill="#818cf8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit"  name="Profit"   fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Recent Purchase Orders ────────────────────────────────── */}
          <div className="bg-white p-6 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.05)]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Orders
            </h3>
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-100">
                <tr>
                  {["Order ID", "Product", "Supplier", "Quantity", "Amount", "Status"].map((h) => (
                    <th
                      key={h}
                      className="p-3 text-left font-semibold text-gray-700 text-xs uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-3 text-center text-gray-400">
                      No recent orders
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-3 text-blue-600 font-mono text-xs">
                        {order.poId || order.id}
                      </td>
                      <td className="p-3 text-gray-700 font-medium">
                        {order.product || "N/A"}
                      </td>
                      <td className="p-3 text-gray-500 text-xs">
                        {order.supplierName || "—"}
                      </td>
                      <td className="p-3 text-gray-600">
                        {order.quantity || 0}
                      </td>
                      <td className="p-3 text-gray-600">
                        Rs. {(order.totalAmount || 0).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={order.status || "pending"} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT: Low Stock Sidebar ──────────────────────────────────── */}
        <div className="xl:w-72 shrink-0">
          <div className="bg-white rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.05)] p-5">

            {/* Sidebar Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h3 className="text-base font-semibold text-gray-900">
                  Low Stock Alert
                </h3>
              </div>
              <span className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {lowStockItems.length}
              </span>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <p className="text-slate-400 text-sm text-center">
                  All products are sufficiently stocked
                </p>
              </div>
            ) : (
              <div
                className="flex flex-col gap-3 overflow-y-auto pr-0.5"
                style={{ maxHeight: "560px", scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
              >
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3 hover:border-blue-200 transition-colors"
                  >
                    {/* Product name + stock count */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 text-sm font-semibold truncate">
                          {item.productName}
                        </p>
                        <p className="text-slate-400 text-[11px] truncate mt-0.5">
                          {item.supplierName || "No supplier"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm font-bold ${
                            item.stock <= 30
                              ? "text-red-500"
                              : item.stock <= 70
                              ? "text-amber-500"
                              : "text-blue-500"
                          }`}
                        >
                          {item.stock}
                        </p>
                        <p className="text-[10px] text-slate-400">units</p>
                      </div>
                    </div>

                    {/* Stock progress bar */}
                    <StockBar stock={item.stock} max={100} />

                    {/* Category + severity label */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                        {item.category || "Uncategorized"}
                      </span>
                      {item.stock === 0 && (
                        <span className="text-[10px] text-red-500 font-bold uppercase tracking-wide">
                          Out of Stock
                        </span>
                      )}
                      {item.stock > 0 && item.stock <= 30 && (
                        <span className="text-[10px] text-red-500 font-semibold">Critical</span>
                      )}
                      {item.stock > 30 && item.stock <= 70 && (
                        <span className="text-[10px] text-amber-500 font-semibold">Low</span>
                      )}
                      {item.stock > 70 && (
                        <span className="text-[10px] text-blue-500 font-semibold">Reorder</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3 flex-wrap">
              {[
                { color: "bg-red-500",   label: "Critical (0-30)"  },
                { color: "bg-amber-500", label: "Low (31-70)"       },
                { color: "bg-blue-500",  label: "Reorder (71-100)" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-[10px] text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}