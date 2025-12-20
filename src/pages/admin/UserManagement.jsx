import "./UserManagement.css";
import { useEffect, useState } from "react";
import axios from "axios";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // NEW STATES
  const [selectedUser, setSelectedUser] = useState(null);

  /* ================= FETCH USERS & ORDERS ================= */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        /* ================= FETCH USERS ================= */
        const usersRes = await axios.get("http://localhost:5000/api/users");
        setUsers(usersRes.data);
      } catch (err) {
        console.error("Failed to load users", err);
        setUsers([]); // fail safe
      }

      try {
        /* ================= FETCH ORDERS ================= */
        const ordersRes = await axios.get("http://localhost:5000/api/orders");
        setOrders(ordersRes.data);
      } catch (err) {
        console.error("Failed to load orders", err);
        setOrders([]); // fail safe
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  /* ================= CALCULATE TOTAL PURCHASES ================= */
  const getTotalPurchases = (userId) => {
    return orders
      .filter(o => o.userId === userId)
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  };

  /* ================= ADD LOYALTY POINTS ================= */
  const addLoyaltyPoints = async (userId) => {
    const points = prompt("Enter loyalty points to add:");
    if (!points || isNaN(points)) return;

    try {
      await axios.put(
        `http://localhost:5000/api/users/${userId}/loyalty`,
        { points }
      );

      setUsers(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, loyaltyPoints: (u.loyaltyPoints || 0) + Number(points) }
            : u
        )
      );

      alert("Loyalty points added successfully");
    } catch {
      alert("Failed to update points");
    }
  };

  /* ================= DISABLE USER ================= */
  const disableUser = async (userId) => {
    if (!window.confirm("Are you sure you want to disable this user?")) return;

    try {
      await axios.put(`http://localhost:5000/api/users/${userId}/status`, {
        status: "inactive"
      });

      setUsers(prev =>
        prev.map(u =>
          u.id === userId ? { ...u, status: "inactive" } : u
        )
      );
    } catch {
      alert("Failed to disable user");
    }
  };

  const filteredUsers = users.filter(u =>
    `${u.name} ${u.email} ${u.id}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="user-page">Loading users...</div>;
  }

  return (
    <div className="user-page">

      {/* ================= USER DETAILS VIEW ================= */}
      {selectedUser && (
        <div className="user-details-panel">
          <button className="back-btn" onClick={() => setSelectedUser(null)}>
            ⬅ Back
          </button>

          <h2>User Details</h2>

          <div className="user-info-grid">
            <p><strong>Name:</strong> {selectedUser.name}</p>
            <p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Phone:</strong> {selectedUser.phone}</p>
            <p><strong>Address:</strong> {selectedUser.address || "N/A"}</p>
            <p><strong>NIC:</strong> {selectedUser.nic || "N/A"}</p>
            <p><strong>DOB:</strong> {selectedUser.dob || "N/A"}</p>
          </div>

          <h3>User Orders</h3>

          <table className="user-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders
                .filter(o => o.userId === selectedUser.userId || o.userId === selectedUser.id)
                .map(order => (
                  <tr key={order.id}>
                    <td>{order.orderId || order.id}</td>
                    <td>
                      {order.date 
                        ? new Date(order.date).toLocaleDateString() 
                        : "-"}
                    </td>
                    <td>Rs. {order.totalAmount?.toFixed(2)}</td>
                    <td>{order.status}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= MAIN TABLE ================= */}
      {!selectedUser && (
        <>
          <div className="user-header">
            <h1>User Management</h1>
            <p>Manage registered users and loyalty points</p>
          </div>

          <div className="user-search">
            <input
              type="text"
              placeholder="Search users by name, email, or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="user-table-wrapper">
            <table className="user-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Registered</th>
                  <th>Total Purchases</th>
                  <th>Loyalty Points</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.userId || user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.phone}</td>
                    <td>
                      {user.registeredAt
                        ? new Date(user.registeredAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="green">
                      Rs. {getTotalPurchases(user.userId || user.id).toFixed(2)}
                    </td>
                    <td>⭐ {user.loyaltyPoints || 0}</td>
                    <td>
                      <span className={`status ${user.status || "active"}`}>
                        {user.status || "active"}
                      </span>
                    </td>
                    <td className="actions">
                      <button title="View" onClick={() => setSelectedUser(user)}>👁</button>
                      <button title="Add Points" onClick={() => addLoyaltyPoints(user.id)}>🎁</button>
                      <button title="Disable" onClick={() => disableUser(user.id)}>🚫</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="empty">No users found</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}