import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../services/firebase";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const [users, setUsers]                 = useState(0);
  const [suppliers, setSuppliers]         = useState(0);
  const [products, setProducts]           = useState(0);
  const [totalRevenue, setTotalRevenue]   = useState(0);
  const [totalProfit, setTotalProfit]     = useState(0);
  const [recentOrders, setRecentOrders]   = useState([]);
  const [categorySales, setCategorySales] = useState([]);

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    try {
      // Fetch collection counts
      const usersSnap     = await getDocs(collection(db, "users"));
      const suppliersSnap = await getDocs(collection(db, "suppliers"));
      const productsSnap  = await getDocs(collection(db, "products"));
      const ordersSnap    = await getDocs(collection(db, "orders"));
      const purchaseOrdersSnap = await getDocs(collection(db, "purchaseOrders"));

      setUsers(usersSnap.size);
      setSuppliers(suppliersSnap.size);
      setProducts(productsSnap.size);

      // Calculate revenue from customer orders
      const orders  = ordersSnap.docs.map((doc) => doc.data());
      const revenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      setTotalRevenue(revenue);

      // Calculate profit = revenue - purchase order costs
      const purchaseOrders = purchaseOrdersSnap.docs.map((doc) => doc.data());
      const cost = purchaseOrders.reduce((sum, po) => sum + (po.amount || 0), 0);
      setTotalProfit(revenue - cost);

      // Fetch 5 most recent purchase orders for the table
      const recentSnap = await getDocs(
        query(collection(db, "purchaseOrders"), orderBy("createdAt", "desc"), limit(5))
      );
      setRecentOrders(recentSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

      // Group order revenue by category for the bar chart
      const categoryMap = {};
      orders.forEach((order) => {
        const cat = order.category || "Uncategorized";
        categoryMap[cat] = (categoryMap[cat] || 0) + (order.totalAmount || 0);
      });
      setCategorySales(Object.keys(categoryMap).map((key) => ({ category: key, total: categoryMap[key] })));

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  return (
    <div className="p-6 bg-[#f5f7fb] min-h-screen">

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card title="Total Users"   value={users} />
        <Card title="Suppliers"     value={suppliers} />
        <Card title="Products"      value={products} />
        <Card title="Total Revenue" value={`Rs. ${totalRevenue.toLocaleString()}`} />
      </div>

      {/* Revenue by category bar chart */}
      <div className="bg-white p-6 rounded-2xl mt-8 shadow-[0_8px_20px_rgba(0,0,0,0.05)]">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categorySales}>
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#1e88e5" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Latest 5 purchase orders */}
      <div className="bg-white p-6 rounded-2xl mt-8 shadow-[0_8px_20px_rgba(0,0,0,0.05)]">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
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
            {recentOrders.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-3 text-center text-gray-400">No recent orders</td>
              </tr>
            ) : (
              recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="p-3 text-gray-600">{order.poId || order.id}</td>
                  <td className="p-3 text-gray-600">{order.product || "N/A"}</td>
                  <td className="p-3 text-gray-600">{order.quantity || 0}</td>
                  <td className="p-3"><StatusBadge status={order.status || "pending"} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}