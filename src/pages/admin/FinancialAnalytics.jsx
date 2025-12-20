import "./FinancialAnalytics.css";
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
  Cell
} from "recharts";

export default function FinancialAnalytics() {
  const [orders, setOrders] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const orderSnap = await getDocs(collection(db, "orders"));
      const purchaseSnap = await getDocs(collection(db, "purchaseOrders"));

      setOrders(orderSnap.docs.map(d => d.data()));
      setPurchaseOrders(purchaseSnap.docs.map(d => d.data()));
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="finance-page">Loading analytics...</div>;

  /* ================= SUMMARY ================= */
  const totalRevenue = orders.reduce(
    (sum, o) => sum + (o.totalAmount || 0),
    0
  );

  const totalCost = purchaseOrders.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );

  const profit = totalRevenue - totalCost;
  const margin = totalRevenue
    ? ((profit / totalRevenue) * 100).toFixed(1)
    : 0;

  /* ================= MONTHLY TREND ================= */
  const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const trendData = months.map(month => {
    const revenue = orders
      .filter(
        o =>
          o.createdAt?.toDate().toLocaleString("default", { month: "short" }) ===
          month
      )
      .reduce((s, o) => s + (o.totalAmount || 0), 0);

    const cost = purchaseOrders
      .filter(
        p =>
          p.createdAt?.toDate().toLocaleString("default", { month: "short" }) ===
          month
      )
      .reduce((s, p) => s + (p.amount || 0), 0);

    return { month, Revenue: revenue, Cost: cost };
  });

  /* ================= CATEGORY CALCULATION ================= */
  const categories = [
    ...new Set([
      ...orders.map(o => o.category),
      ...purchaseOrders.map(p => p.category)
    ])
  ];

  const categoryData = categories.map(cat => {
    const revenue = orders
      .filter(o => o.category === cat)
      .reduce((s, o) => s + (o.totalAmount || 0), 0);

    const cost = purchaseOrders
      .filter(p => p.category === cat)
      .reduce((s, p) => s + (p.amount || 0), 0);

    const profit = revenue - cost;

    return {
      category: cat,
      revenue,
      cost,
      profit,
      margin: revenue ? ((profit / revenue) * 100).toFixed(1) : 0
    };
  });

  /* ================= PIE COLORS ================= */
  const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444"];

  return (
    <div className="finance-page">
      <h1>Financial Analytics</h1>
      <p>Track costs, revenue, and profit margins</p>

      {/* ================= CARDS ================= */}
      <div className="cards">
        <div className="card cost">
          Total Cost
          <h2>Rs. {totalCost.toLocaleString()}</h2>
        </div>

        <div className="card revenue">
          Total Revenue
          <h2>Rs. {totalRevenue.toLocaleString()}</h2>
        </div>

        <div className="card profit">
          Total Profit
          <h2>Rs. {profit.toLocaleString()}</h2>
        </div>

        <div className="card margin">
          Profit Margin
          <h2>{margin}%</h2>
        </div>
      </div>

      {/* ================= CHARTS ================= */}
      <div className="charts">
        <div className="chart-box">
          <h3>Revenue vs Cost Trend</h3>
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

        <div className="chart-box">
          <h3>Profit Distribution</h3>
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
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="table-box">
        <h3>Category Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Total Cost</th>
              <th>Total Revenue</th>
              <th>Profit</th>
              <th>Margin</th>
            </tr>
          </thead>
          <tbody>
            {categoryData.map(c => (
              <tr key={c.category}>
                <td>{c.category}</td>
                <td className="red">
                  Rs. {c.cost.toLocaleString()}
                </td>
                <td className="green">
                  Rs. {c.revenue.toLocaleString()}
                </td>
                <td className="green">
                  Rs. {c.profit.toLocaleString()}
                </td>
                <td>{c.margin}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}