import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import Card from "../../components/Card";
import PageLayout from "../../components/PageLayout";
import ResponsiveTable from "../../components/ResponsiveTable";
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
  const [products, setProducts]             = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [payments, setPayments]             = useState([]);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsSnap, customerSnap, paymentsSnap] = await Promise.all([
          getDocs(collection(db, "products")),
          getDocs(collection(db, "CustomerOrders")),
          getDocs(collection(db, "payments")),
        ]);
        setProducts(productsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setCustomerOrders(customerSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setPayments(paymentsSnap.docs.map((d) => d.data()));
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
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

  /* ─────────────────────────────────────────────────────
     CATEGORY COST
     Source: products collection
     Logic : wholesalePrice × stock  (inventory value per product)
             grouped by product.category
  ───────────────────────────────────────────────────── */
  const costByCategory = {};
  products.forEach((p) => {
    const cat  = p.category || "Uncategorised";
    const cost = (p.wholesalePrice || 0) * (p.stock || 0);
    costByCategory[cat] = (costByCategory[cat] || 0) + cost;
  });

  /* ─────────────────────────────────────────────────────
     CATEGORY REVENUE
     Source: CustomerOrders collection
     Logic : sum totalAmount grouped by order.category
             (you add a "category" field to each order doc)
  ───────────────────────────────────────────────────── */
  const revenueByCategory = {};
  customerOrders.forEach((order) => {
    const cat    = order.category || "Uncategorised";
    const amount = order.totalAmount || 0;
    revenueByCategory[cat] = (revenueByCategory[cat] || 0) + amount;
  });

  /* ─────────────────────────────────────────────────────
     MERGE: all unique categories from both sources
  ───────────────────────────────────────────────────── */
  const allCategories = [
    ...new Set([
      ...Object.keys(costByCategory),
      ...Object.keys(revenueByCategory),
    ]),
  ].filter(Boolean).sort();

  const categoryData = allCategories.map((cat) => {
    const cost    = costByCategory[cat]    || 0;
    const revenue = revenueByCategory[cat] || 0;
    const profit  = revenue - cost;
    const margin  = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0.0";
    return { category: cat, cost, revenue, profit, margin };
  });

  /* ─────────────────────────────────────────────────────
     OVERALL SUMMARY
  ───────────────────────────────────────────────────── */
  const totalCost    = categoryData.reduce((s, c) => s + c.cost, 0);
  const totalRevenue = categoryData.reduce((s, c) => s + c.revenue, 0);
  const profit       = totalRevenue - totalCost;
  const margin       = totalRevenue > 0
    ? ((profit / totalRevenue) * 100).toFixed(1)
    : "0.0";

  /* ─────────────────────────────────────────────────────
     MONTHLY TREND  (payments collection for cost,
                     CustomerOrders for revenue)
  ───────────────────────────────────────────────────── */
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const trendData = months.map((month, i) => {
    const revenue = customerOrders
      .filter((o) => getMonth(o.createdAt) === i)
      .reduce((s, o) => s + (o.totalAmount || 0), 0);

    const cost = payments
      .filter((p) => getMonth(p.paidDate || p.createdAt) === i)
      .reduce((s, p) => s + (p.amount || 0), 0);

    return { month, Revenue: revenue, Cost: cost };
  });

  /* ─────────────────────────────────────────────────────
     COLOURS
  ───────────────────────────────────────────────────── */
  const CHART_COLORS = [
    "#f59e0b","#10b981","#ef4444","#8b5cf6","#06b6d4",
    "#f97316","#ec4899","#84cc16","#3b82f6","#a16207",
    "#0ea5e9","#d946ef","#14b8a6","#f43f5e","#6366f1",
  ];

  const summaryCards = [
    { title: "Total Cost",    value: `Rs. ${totalCost.toLocaleString()}` },
    { title: "Total Revenue", value: `Rs. ${totalRevenue.toLocaleString()}` },
    { title: "Net Profit",    value: `Rs. ${profit.toLocaleString()}` },
    { title: "Profit Margin", value: `${margin}%` },
  ];

  /* ─────────────────────────────────────────────────────
     ResponsiveTable column defs (category breakdown)
     Note: a synthetic "Total" row is appended to the data
     passed into ResponsiveTable to replicate the old
     <tfoot> totals row, since ResponsiveTable has no
     footer concept.
  ───────────────────────────────────────────────────── */
  const categoryColumns = [
    {
      key: "category",
      label: "Category",
      render: (_v, row) => {
        if (row.isTotal) {
          return <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</span>;
        }
        const i = categoryData.indexOf(row);
        return (
          <div className="flex items-center gap-2.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="font-medium text-gray-800 capitalize">{row.category}</span>
          </div>
        );
      },
    },
    {
      key: "cost",
      label: "Total Cost",
      render: (_v, row) => (
        <span className={`font-mono text-red-500 text-[13px] ${row.isTotal ? "font-bold" : "font-medium"}`}>
          Rs. {row.cost.toLocaleString()}
        </span>
      ),
    },
    {
      key: "revenue",
      label: "Total Revenue",
      render: (_v, row) => (
        <span className={`font-mono text-emerald-600 text-[13px] ${row.isTotal ? "font-bold" : "font-medium"}`}>
          Rs. {row.revenue.toLocaleString()}
          {!row.isTotal && row.revenue === 0 && (
            <span className="ml-1.5 text-[10px] text-amber-400 font-sans">no orders</span>
          )}
        </span>
      ),
    },
    {
      key: "profit",
      label: "Net Profit",
      render: (_v, row) => (
        <span className={`font-mono text-blue-700 text-[13px] ${row.isTotal ? "font-bold" : "font-semibold"}`}>
          Rs. {row.profit.toLocaleString()}
        </span>
      ),
    },
    {
      key: "margin",
      label: "Margin",
      render: (_v, row) => {
        if (row.isTotal) {
          return (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
              {row.margin}%
            </span>
          );
        }
        const marginNum  = parseFloat(row.margin);
        const marginColor =
          marginNum >= 30 ? "text-emerald-600 bg-emerald-50"
          : marginNum >= 15 ? "text-amber-600 bg-amber-50"
          : "text-red-500 bg-red-50";
        const barColor =
          marginNum >= 30 ? "bg-emerald-400"
          : marginNum >= 15 ? "bg-amber-400"
          : "bg-red-400";
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-16 h-1.5 rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${Math.min(Math.max(marginNum, 0), 100)}%` }}
              />
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${marginColor}`}>
              {row.margin}%
            </span>
          </div>
        );
      },
    },
  ];

  const categoryTableData = [
    ...categoryData,
    { category: "__total__", isTotal: true, cost: totalCost, revenue: totalRevenue, profit, margin },
  ];

  /* ─────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────── */
  return (
    <PageLayout
      title="Financial Analytics"
      subtitle="Track costs, revenue, and profit margins"
    >

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card) => (
          <Card key={card.title} title={card.title} value={card.value} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 mb-6">

        {/* Bar Chart - monthly trend */}
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

        {/* Donut Chart - profit by category */}
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

          {/* Show message if no revenue data yet */}
          {categoryData.every((c) => c.revenue === 0) ? (
            <div className="flex flex-col items-center justify-center h-[270px] gap-2">
              <p className="text-sm text-gray-400 text-center">
                No revenue data yet.
              </p>
              <p className="text-xs text-gray-300 text-center">
                Add a <span className="font-semibold">category</span> field to CustomerOrders to see this chart.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie
                  data={categoryData.filter((c) => c.profit > 0)}
                  dataKey="profit"
                  nameKey="category"
                  innerRadius={68}
                  outerRadius={105}
                  paddingAngle={3}
                >
                  {categoryData
                    .filter((c) => c.profit > 0)
                    .map((_, index) => (
                      <Cell
                        key={index}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 14, fontSize: 12, color: "#64748b" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-xl shadow-[0_4px_14px_rgba(0,0,0,0.07)] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Category Breakdown</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Cost from products inventory · Revenue from CustomerOrders
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
            {categoryData.length} Categories
          </span>
        </div>

        <ResponsiveTable
          columns={categoryColumns}
          data={categoryTableData}
          keyField="category"
          loading={false}
          emptyMessage="No category data available"
          cardTitle="category"
          cardBadge="margin"
        />
      </div>

    </PageLayout>
  );
}