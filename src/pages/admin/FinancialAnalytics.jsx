import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import Card from "../../components/Card";
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
  Legend,
  CartesianGrid,
} from "recharts";

/* ================= SAFE DATE HELPER ================= */
const getMonth = (val) => {
  if (!val) return -1;
  if (typeof val.toDate === "function") return val.toDate().getMonth();
  if (val instanceof Date) return val.getMonth();
  const d = new Date(val);
  return isNaN(d) ? -1 : d.getMonth();
};

/* ================= CUSTOM TOOLTIPS ================= */
const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
        <p className="text-gray-500 font-medium mb-2">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: entry.fill }} />
            <span className="text-gray-700">
              {entry.name}:{" "}
              <span className="font-semibold">Rs. {entry.value.toLocaleString()}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
        <p className="text-gray-600 font-semibold mb-1">{d.category}</p>
        <p style={{ color: payload[0].fill }} className="font-bold">
          Rs. {d.profit.toLocaleString()}
        </p>
        <p className="text-gray-400 text-xs mt-0.5">Margin: {d.margin}%</p>
      </div>
    );
  }
  return null;
};

/* ================= MAIN COMPONENT ================= */
export default function FinancialAnalytics() {
  const [orders, setOrders] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]); // NEW: customer revenue
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const orderSnap = await getDocs(collection(db, "orders"));
      const purchaseSnap = await getDocs(collection(db, "purchaseOrders"));
      const customerSnap = await getDocs(collection(db, "CustomerOrders")); // NEW
      setOrders(orderSnap.docs.map((d) => d.data()));
      setPurchaseOrders(purchaseSnap.docs.map((d) => d.data()));
      setCustomerOrders(customerSnap.docs.map((d) => d.data())); // NEW
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-4 border-blue-100 border-t-blue-700 animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading analytics…</p>
        </div>
      </div>
    );

  /* ================= SUMMARY ================= */
  // Cost  = what admin paid to suppliers (purchaseOrders)
  const totalCost = purchaseOrders.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Revenue = what customers paid to admin (CustomerOrders → totalAmount)
  const totalRevenue = customerOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const profit = totalRevenue - totalCost;
  const margin = totalRevenue ? ((profit / totalRevenue) * 100).toFixed(1) : 0;

  /* ================= MONTHLY TREND ================= */
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const trendData = months.map((month, i) => {
    // Revenue: from CustomerOrders
    const revenue = customerOrders
      .filter((o) => getMonth(o.createdAt) === i)
      .reduce((s, o) => s + (o.totalAmount || 0), 0);

    // Cost: from purchaseOrders (supplier payments)
    const cost = purchaseOrders
      .filter((p) => getMonth(p.createdAt) === i)
      .reduce((s, p) => s + (p.amount || 0), 0);

    return { month, Revenue: revenue, Cost: cost };
  });

  /* ================= CATEGORY DATA ================= */
  // Build category revenue from CustomerOrders → types array items
  // Each CustomerOrder has a `types` array: [{ id, name, price, quantity, imageUrl }, ...]
  // We derive per-item revenue as price * quantity, grouped by product name as category proxy.
  // For cost, we use purchaseOrders which already have a `category` field.

  // Collect all categories from purchaseOrders
  const supplierCategories = [...new Set(purchaseOrders.map((p) => p.category))].filter(Boolean);

  // Build a flat list of line items from CustomerOrders for revenue breakdown
  // Since CustomerOrders items (types[]) don't have a category, we group by product name
  const customerLineItems = [];
  customerOrders.forEach((order) => {
    if (Array.isArray(order.types)) {
      order.types.forEach((item) => {
        customerLineItems.push({
          name: item.name,
          revenue: (item.price || 0) * (item.quantity || 1),
          category: item.category || item.name, // fallback to product name if no category
        });
      });
    }
  });

  // Merge categories from all sources
  const allCategories = [
    ...new Set([
      ...supplierCategories,
      ...customerLineItems.map((i) => i.category),
      ...orders.map((o) => o.category), // keep original orders categories for backward compat
    ]),
  ].filter(Boolean);

  const categoryData = allCategories.map((cat) => {
    // Revenue: sum from CustomerOrders line items matching this category
    const revenueFromCustomers = customerLineItems
      .filter((i) => i.category === cat)
      .reduce((s, i) => s + i.revenue, 0);

    // Also include any revenue from the original `orders` collection (kept for backward compat)
    const revenueFromOrders = orders
      .filter((o) => o.category === cat)
      .reduce((s, o) => s + (o.totalAmount || 0), 0);

    const revenue = revenueFromCustomers + revenueFromOrders;

    // Cost: from purchaseOrders
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

  const CHART_COLORS = [
    "#f59e0b",
    "#10b981",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#f97316",
    "#ec4899",
    "#84cc16",
  ];

  const summaryCards = [
    { title: "Total Cost",      value: `Rs. ${totalCost.toLocaleString()}` },
    { title: "Total Revenue",   value: `Rs. ${totalRevenue.toLocaleString()}` },
    { title: "Net Profit",      value: `Rs. ${profit.toLocaleString()}` },
    { title: "Profit Margin",   value: `${margin}%` },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Page Header — plain, bold black ── */}
      <div className="px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Financial Analytics</h1>
        <p className="text-gray-400 text-sm mt-0.5">Track costs, revenue, and profit margins</p>
      </div>

      <div className="px-6 pb-6">

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {summaryCards.map((card) => (
            <Card key={card.title} title={card.title} value={card.value} />
          ))}
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 mb-6">

          {/* Bar Chart */}
          <div className="bg-white rounded-xl shadow-[0_4px_14px_rgba(0,0,0,0.07)] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-gray-800">Revenue vs Cost Trend</h3>
                <p className="text-xs text-gray-400 mt-0.5">Monthly breakdown for current year</p>
              </div>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
                Monthly
              </span>
            </div>
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={trendData} barGap={4} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={(v) => `Rs.${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#f8fafc" }} />
                <Legend wrapperStyle={{ paddingTop: 14, fontSize: 12, color: "#64748b" }} />
                <Bar dataKey="Revenue" fill="#10b981" radius={[5, 5, 0, 0]} />
                <Bar dataKey="Cost"    fill="#f59e0b" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-xl shadow-[0_4px_14px_rgba(0,0,0,0.07)] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-gray-800">Profit by Category</h3>
                <p className="text-xs text-gray-400 mt-0.5">Distribution across categories</p>
              </div>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
                Donut
              </span>
            </div>
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="profit"
                  nameKey="category"
                  innerRadius={68}
                  outerRadius={105}
                  paddingAngle={3}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 14, fontSize: 12, color: "#64748b" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Category Breakdown Table ── */}
        <div className="bg-white rounded-xl shadow-[0_4px_14px_rgba(0,0,0,0.07)] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-gray-800">Category Breakdown</h3>
              <p className="text-xs text-gray-400 mt-0.5">Cost, revenue and profit per category</p>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
              {categoryData.length} Categories
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {["Category", "Total Cost", "Total Revenue", "Net Profit", "Margin"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categoryData.map((c, i) => {
                  const marginNum = parseFloat(c.margin);
                  const marginColor =
                    marginNum >= 30 ? "text-emerald-600 bg-emerald-50"
                    : marginNum >= 15 ? "text-amber-600 bg-amber-50"
                    : "text-red-500 bg-red-50";
                  const barColor =
                    marginNum >= 30 ? "bg-emerald-400"
                    : marginNum >= 15 ? "bg-amber-400"
                    : "bg-red-400";

                  return (
                    <tr
                      key={c.category}
                      className="border-b border-gray-50 hover:bg-slate-50 transition-colors duration-150"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          <span className="font-medium text-gray-800">{c.category}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-red-500 text-[13px] font-medium">
                        Rs. {c.cost.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-emerald-600 text-[13px] font-medium">
                        Rs. {c.revenue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-blue-700 text-[13px] font-semibold">
                        Rs. {c.profit.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-16 h-1.5 rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full ${barColor}`}
                              style={{ width: `${Math.min(Math.max(marginNum, 0), 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${marginColor}`}>
                            {c.margin}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals footer */}
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-4 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Total
                  </td>
                  <td className="px-4 py-3.5 font-mono text-red-500 text-[13px] font-bold">
                    Rs. {totalCost.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-emerald-600 text-[13px] font-bold">
                    Rs. {totalRevenue.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-blue-700 text-[13px] font-bold">
                    Rs. {profit.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                      {margin}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}