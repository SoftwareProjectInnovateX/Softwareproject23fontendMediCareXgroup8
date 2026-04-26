import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
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
} from "recharts";

/**
 * AdminDashboard page — provides a high-level overview of platform activity
 * for administrators.
 *
 * On mount, a single data-fetch function queries five Firestore collections:
 *   - `users`          → total registered user count.
 *   - `suppliers`      → total supplier count.
 *   - `products`       → total product count.
 *   - `orders`         → customer orders used to calculate revenue and category sales.
 *   - `purchaseOrders` → supplier purchase orders used to calculate cost and populate
 *                        the recent orders table.
 *
 * Derived metrics:
 *   - Total Revenue  = sum of totalAmount across all customer orders.
 *   - Total Profit   = Total Revenue minus sum of amount across all purchase orders.
 *   - Category Sales = revenue grouped by order category, fed into the bar chart.
 */
export default function AdminDashboard() {
  const [users, setUsers]               = useState(0);
  const [suppliers, setSuppliers]       = useState(0);
  const [products, setProducts]         = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProfit, setTotalProfit]   = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);     // latest 5 purchase orders for the table
  const [categorySales, setCategorySales] = useState([]);   // aggregated revenue per category for the chart

  // Fetch all dashboard data once on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  /**
   * Retrieves and aggregates data from all relevant Firestore collections in a
   * single async function to minimise the number of render cycles.
   *
   * Computation steps:
   *   1. Fetch collection sizes for the summary cards (users, suppliers, products).
   *   2. Sum totalAmount across customer orders to derive total revenue.
   *   3. Sum amount across purchase orders to derive cost, then compute profit.
   *   4. Query the 5 most recent purchase orders for the recent orders table.
   *   5. Build a category-to-revenue map from customer orders for the bar chart.
   */
  const fetchAllData = async () => {
    try {
      // Step 1 — fetch collection sizes for the summary stat cards
      const usersSnap     = await getDocs(collection(db, "users"));
      const suppliersSnap = await getDocs(collection(db, "suppliers"));
      const productsSnap  = await getDocs(collection(db, "products"));

      // Fetch customer orders and supplier purchase orders for financial calculations
      const ordersSnap         = await getDocs(collection(db, "orders"));
      const purchaseOrdersSnap = await getDocs(collection(db, "purchaseOrders"));

      setUsers(usersSnap.size);
      setSuppliers(suppliersSnap.size);
      setProducts(productsSnap.size);

      // Step 2 — sum customer order amounts to compute total platform revenue
      const orders = ordersSnap.docs.map((doc) => doc.data());
      const revenue = orders.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0
      );
      setTotalRevenue(revenue);

      // Step 3 — sum purchase order amounts to compute total cost, then derive profit
      const purchaseOrders = purchaseOrdersSnap.docs.map((doc) => doc.data());
      const cost = purchaseOrders.reduce(
        (sum, po) => sum + (po.amount || 0),
        0
      );
      setTotalProfit(revenue - cost);

      // Step 4 — fetch the 5 most recent purchase orders for the recent orders table
      const recentQ = query(
        collection(db, "purchaseOrders"),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const recentSnap = await getDocs(recentQ);
      setRecentOrders(
        recentSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );

      // Step 5 — aggregate customer order revenue by category for the bar chart
      // Orders without a category are grouped under "Uncategorized"
      const categoryMap = {};
      orders.forEach((order) => {
        const category = order.category || "Uncategorized";
        categoryMap[category] =
          (categoryMap[category] || 0) + (order.totalAmount || 0);
      });

      // Convert the category map to the array shape expected by Recharts
      setCategorySales(
        Object.keys(categoryMap).map((key) => ({
          category: key,
          total: categoryMap[key],
        }))
      );
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  return (
    <div className="p-6 bg-[#f5f7fb] min-h-screen">

      {/* Summary Cards — four top-level metrics shown in a responsive grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card title="Total Users"   value={users} />
        <Card title="Suppliers"     value={suppliers} />
        <Card title="Products"      value={products} />
        <Card
          title="Total Revenue"
          value={`Rs. ${totalRevenue.toLocaleString()}`}
        />
      </div>

      {/* Sales by Category Bar Chart — visualises revenue distribution across product categories */}
      <div className="bg-white p-6 rounded-2xl mt-8 shadow-[0_8px_20px_rgba(0,0,0,0.05)]">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Sales by Category
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categorySales}>
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            {/* Single bar series representing total revenue per category */}
            <Bar dataKey="total" fill="#1e88e5" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Purchase Orders Table — shows the latest 5 orders with status badges */}
      <div className="bg-white p-6 rounded-2xl mt-8 shadow-[0_8px_20px_rgba(0,0,0,0.05)]">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Orders
        </h3>
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left font-semibold text-gray-700">Order ID</th>
              <th className="p-3 text-left font-semibold text-gray-700">Product</th>
              <th className="p-3 text-left font-semibold text-gray-700">Quantity</th>
              <th className="p-3 text-left font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {/* Empty state — displayed when no purchase orders exist */}
            {recentOrders.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-3 text-center text-gray-400">
                  No recent orders
                </td>
              </tr>
            ) : (
              recentOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  {/* Prefer the human-readable poId; fall back to the Firestore document ID */}
                  <td className="p-3 text-gray-600">{order.poId || order.id}</td>
                  <td className="p-3 text-gray-600">{order.product || "N/A"}</td>
                  <td className="p-3 text-gray-600">{order.quantity || 0}</td>
                  <td className="p-3">
                    {/* StatusBadge renders a color-coded pill based on the order status */}
                    <StatusBadge status={order.status || "pending"} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}