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
  LineChart,
  Line,
} from "recharts";
import Card from "../../components/Card";

export default function FinancialAnalytics() {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchData = async () => {
      const orderSnap = await getDocs(collection(db, "orders"));
      const paymentSnap = await getDocs(collection(db, "payments"));

      setOrders(orderSnap.docs.map((d) => d.data()));
      setPayments(paymentSnap.docs.map((d) => d.data()));
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading)
    return <div className="p-6 text-gray-500">Loading analytics...</div>;

  /* ================= FILTER BY YEAR ================= */
  const filterByYear = (data, field) =>
    data.filter((d) => {
      const date = d[field]?.toDate?.();
      return date && date.getFullYear() === year;
    });

  const filteredOrders = filterByYear(orders, "createdAt");
  const filteredPayments = filterByYear(payments, "paidDate");

  /* ================= SUMMARY ================= */
  const totalRevenue = filteredOrders.reduce(
    (sum, o) => sum + (o.totalAmount || 0),
    0
  );

  const totalCost = filteredPayments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const overdueCost = payments
    .filter((p) => p.status === "OVERDUE")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const profit = totalRevenue - totalCost;

  const margin = totalRevenue
    ? ((profit / totalRevenue) * 100).toFixed(1)
    : 0;

  /* ================= PROFIT GROWTH ================= */
  const lastYearOrders = orders.filter(
    (o) => o.createdAt?.toDate()?.getFullYear() === year - 1
  );

  const lastYearRevenue = lastYearOrders.reduce(
    (s, o) => s + (o.totalAmount || 0),
    0
  );

  const growth = lastYearRevenue
    ? (((totalRevenue - lastYearRevenue) / lastYearRevenue) * 100).toFixed(1)
    : 0;

  /* ================= MONTHLY TREND ================= */
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  const trendData = months.map((month, i) => {
    const revenue = filteredOrders
      .filter((o) => o.createdAt?.toDate()?.getMonth() === i)
      .reduce((s, o) => s + (o.totalAmount || 0), 0);

    const cost = filteredPayments
      .filter(
        (p) =>
          p.status === "PAID" &&
          p.paidDate?.toDate()?.getMonth() === i
      )
      .reduce((s, p) => s + (p.amount || 0), 0);

    return { month, Revenue: revenue, Cost: cost, Profit: revenue - cost };
  });

  /* ================= CATEGORY DATA ================= */
  const categories = [
    ...new Set([
      ...filteredOrders.map((o) => o.category || "Other"),
      ...filteredPayments.map((p) => p.category || "Other"),
    ]),
  ];

  const categoryData = categories.map((cat) => {
    const revenue = filteredOrders
      .filter((o) => o.category === cat)
      .reduce((s, o) => s + (o.totalAmount || 0), 0);

    const cost = filteredPayments
      .filter((p) => p.category === cat && p.status === "PAID")
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

  /* ================= TOP PRODUCTS ================= */
  const productMap = {};
  filteredOrders.forEach((o) => {
    const name = o.productName || "Unknown";
    productMap[name] = (productMap[name] || 0) + (o.quantity || 0);
  });

  const topProducts = Object.entries(productMap)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7"];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">

      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-4">Financial Analytics</h1>

      {/* YEAR FILTER */}
      <select
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="mb-6 p-2 border rounded"
      >
        {[2023, 2024, 2025, 2026].map((y) => (
          <option key={y}>{y}</option>
        ))}
      </select>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card title="Revenue" value={`Rs. ${totalRevenue.toLocaleString()}`} color="bg-emerald-500" />
        <Card title="Cost" value={`Rs. ${totalCost.toLocaleString()}`} color="bg-red-500" />
        <Card title="Profit" value={`Rs. ${profit.toLocaleString()}`} color="bg-green-600" />
        <Card title="Margin" value={`${margin}%`} color="bg-amber-500" />
        <Card title="Growth" value={`${growth}%`} color="bg-blue-600" />
      </div>

      {/* CHARTS */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* LINE CHART */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="mb-3 font-semibold">Monthly Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line dataKey="Revenue" stroke="#22c55e" />
              <Line dataKey="Cost" stroke="#f59e0b" />
              <Line dataKey="Profit" stroke="#3b82f6" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* TOP PRODUCTS */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="mb-3 font-semibold">Top Products</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topProducts}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="qty" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PIE */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="mb-3 font-semibold">Profit Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={categoryData} dataKey="profit" nameKey="category">
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* OVERDUE */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="mb-3 font-semibold">Overdue Impact</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={[
                { name: "Paid", value: totalCost },
                { name: "Overdue", value: overdueCost },
              ]}
            >
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}