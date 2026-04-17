import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function FinancialAnalytics() {
  const [orders, setOrders] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const orderSnap = await getDocs(collection(db, "orders"));
      const purchaseSnap = await getDocs(collection(db, "purchaseOrders"));
      setOrders(orderSnap.docs.map((d) => d.data()));
      setPurchaseOrders(purchaseSnap.docs.map((d) => d.data()));
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="p-6 bg-slate-50 min-h-screen text-slate-500 text-lg">
        Loading analytics...
      </div>
    );

  /* ================= SUMMARY ================= */
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalCost = purchaseOrders.reduce((sum, p) => sum + (p.amount || 0), 0);
  const profit = totalRevenue - totalCost;
  const margin = totalRevenue ? ((profit / totalRevenue) * 100).toFixed(1) : 0;

  /* ================= MONTHLY TREND ================= */
  const months = ["Jan","Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const trendData = months.map((month) => {
    const revenue = orders
      .filter(
        (o) =>
          o.createdAt?.toDate().toLocaleString("default", { month: "short" }) === month
      )
      .reduce((s, o) => s + (o.totalAmount || 0), 0);

    const cost = purchaseOrders
      .filter(
        (p) =>
          p.createdAt?.toDate().toLocaleString("default", { month: "short" }) === month
      )
      .reduce((s, p) => s + (p.amount || 0), 0);

    return { month, Revenue: revenue, Cost: cost };
  });

  /* ================= CATEGORY DATA ================= */
  const categories = [
    ...new Set([
      ...orders.map((o) => o.category),
      ...purchaseOrders.map((p) => p.category),
    ]),
  ];

  const categoryData = categories.map((cat) => {
    const revenue = orders
      .filter((o) => o.category === cat)
      .reduce((s, o) => s + (o.totalAmount || 0), 0);

    const cost = purchaseOrders
      .filter((p) => p.category === cat)
      .reduce((s, p) => s + (p.amount || 0), 0);

    const profit = revenue - cost;

    return {
      category: cat,
      revenue,
      cost,
      profit,
      margin: revenue ? ((profit / revenue) * 100).toFixed(1) : 0,
    };
  });

  /* ================= PIE COLORS ================= */
  const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444"];

  /* ================= SUMMARY CARDS CONFIG ================= */
  const summaryCards = [
    {
      label: "Total Cost",
      value: `Rs. ${totalCost.toLocaleString()}`,
      accent: "border-red-400",
      valueColor: "text-red-500",
    },
    {
      label: "Total Revenue",
      value: `Rs. ${totalRevenue.toLocaleString()}`,
      accent: "border-emerald-400",
      valueColor: "text-emerald-500",
    },
    {
      label: "Total Profit",
      value: `Rs. ${profit.toLocaleString()}`,
      accent: "border-green-500",
      valueColor: "text-green-600",
    },
    {
      label: "Profit Margin",
      value: `${margin}%`,
      accent: "border-amber-400",
      valueColor: "text-amber-500",
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">

      {/* Page Header */}
      <h1 className="text-3xl font-bold text-slate-800 mb-1">Financial Analytics</h1>
      <p className="text-slate-500 text-[15px] mb-6">Track costs, revenue, and profit margins</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`bg-white p-5 rounded-xl border-l-4 ${card.accent} shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`}
          >
            <p className="text-sm text-slate-500 font-medium mb-2">{card.label}</p>
            <h2 className={`text-2xl font-bold ${card.valueColor}`}>{card.value}</h2>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 mb-6">

        {/* Bar Chart */}
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <h3 className="text-base font-semibold text-slate-700 mb-4">Revenue vs Cost Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="Revenue" fill="#22c55e" />
              <Bar dataKey="Cost" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <h3 className="text-base font-semibold text-slate-700 mb-4">Profit Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="profit"
                nameKey="category"
                innerRadius={60}
                outerRadius={110}
                label
              >
                {categoryData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white p-5 rounded-xl shadow-sm">
        <h3 className="text-base font-semibold text-slate-700 mb-4">Category Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Category", "Total Cost", "Total Revenue", "Profit", "Margin"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold text-slate-500 uppercase text-xs tracking-wide border-b-2 border-slate-200"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categoryData.map((c) => (
                <tr
                  key={c.category}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150"
                >
                  <td className="px-4 py-3 text-slate-800 font-medium">{c.category}</td>
                  <td className="px-4 py-3 text-red-500 font-semibold">
                    Rs. {c.cost.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-emerald-600 font-semibold">
                    Rs. {c.revenue.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-green-600 font-semibold">
                    Rs. {c.profit.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{c.margin}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}