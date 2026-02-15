import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../services/firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const [users, setUsers] = useState(0);
  const [suppliers, setSuppliers] = useState(0);
  const [products, setProducts] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [categorySales, setCategorySales] = useState([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      // Fetch counts
      const usersSnap = await getDocs(collection(db, "users"));
      const suppliersSnap = await getDocs(collection(db, "suppliers"));
      const productsSnap = await getDocs(collection(db, "products"));
      
      // Fetch orders and purchase orders
      const ordersSnap = await getDocs(collection(db, "orders"));
      const purchaseOrdersSnap = await getDocs(collection(db, "purchaseOrders"));

      setUsers(usersSnap.size);
      setSuppliers(suppliersSnap.size);
      setProducts(productsSnap.size);

      // Calculate total revenue from orders
      const orders = ordersSnap.docs.map(doc => doc.data());
      const revenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      setTotalRevenue(revenue);

      // Calculate total cost from purchase orders
      const purchaseOrders = purchaseOrdersSnap.docs.map(doc => doc.data());
      const cost = purchaseOrders.reduce((sum, po) => sum + (po.amount || 0), 0);

      // Calculate profit
      const profit = revenue - cost;
      setTotalProfit(profit);

      // Fetch recent purchase orders
      const recentQ = query(
        collection(db, "purchaseOrders"),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const recentSnap = await getDocs(recentQ);
      setRecentOrders(recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Calculate category sales from orders
      const categoryMap = {};
      orders.forEach(order => {
        const category = order.category || "Uncategorized";
        categoryMap[category] = (categoryMap[category] || 0) + (order.totalAmount || 0);
      });

      const categoryData = Object.keys(categoryMap).map(key => ({
        category: key,
        total: categoryMap[key]
      }));

      setCategorySales(categoryData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  return (
    <div className="dashboard">
     
      {/* SUMMARY CARDS */}
      <div className="cards">
        <Card title="Total Users" value={users} />
        <Card title="Suppliers" value={suppliers} />
        <Card title="Products" value={products} />
        <Card title="Total Revenue" value={`Rs. ${totalRevenue.toLocaleString()}`} />
      </div>

      {/* CHART */}
      <div className="chart-box">
        <h3>Sales by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categorySales}>
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#1e88e5" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* RECENT ORDERS */}
      <div className="table-box">
        <h3>Recent Orders</h3>
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", color: "#9e9e9e" }}>
                  No recent orders
                </td>
              </tr>
            ) : (
              recentOrders.map(order => (
                <tr key={order.id}>
                  <td>{order.poId || order.id}</td>
                  <td>{order.product || "N/A"}</td>
                  <td>{order.quantity || 0}</td>
                  <td>
                    <span className={`status-badge ${(order.status || "pending").toLowerCase()}`}>
                      {order.status || "PENDING"}
                    </span>
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

function Card({ title, value }) {
  return (
    <div className="card">
      <p>{title}</p>
      <h3>{value}</h3>
    </div>
  );
}