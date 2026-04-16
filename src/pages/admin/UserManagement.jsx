import { useEffect, useState } from "react";
import axios from "axios";
import {
  MdArrowBack,
  MdVisibility,
  MdCardGiftcard,
  MdBlock,
} from "react-icons/md";
import { FaStar } from "react-icons/fa";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const usersRes = await axios.get("http://localhost:5000/api/users");
        setUsers(usersRes.data);
      } catch (err) {
        console.error("Failed to load users", err);
        setUsers([]);
      }
      try {
        const ordersRes = await axios.get("http://localhost:5000/api/orders");
        setOrders(ordersRes.data);
      } catch (err) {
        console.error("Failed to load orders", err);
        setOrders([]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const getTotalPurchases = (userId) =>
    orders
      .filter((o) => o.userId === userId)
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const addLoyaltyPoints = async (userId) => {
    const points = prompt("Enter loyalty points to add:");
    if (!points || isNaN(points)) return;
    try {
      await axios.put(`http://localhost:5000/api/users/${userId}/loyalty`, { points });
      setUsers((prev) =>
        prev.map((u) =>
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

  const disableUser = async (userId) => {
    if (!window.confirm("Are you sure you want to disable this user?")) return;
    try {
      await axios.put(`http://localhost:5000/api/users/${userId}/status`, {
        status: "inactive",
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: "inactive" } : u))
      );
    } catch {
      alert("Failed to disable user");
    }
  };

  const filteredUsers = users.filter((u) =>
    `${u.name} ${u.email} ${u.id}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading)
    return (
      <div className="p-6 bg-[#f5f8ff] min-h-screen text-slate-500 text-lg">
        Loading users...
      </div>
    );

  /* ================= USER DETAIL VIEW ================= */
  if (selectedUser) {
    const userOrders = orders.filter(
      (o) => o.userId === selectedUser.userId || o.userId === selectedUser.id
    );

    return (
      <div className="p-6 bg-[#f5f8ff] min-h-screen">

        {/* Back Button */}
        <button
          onClick={() => setSelectedUser(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg border-none cursor-pointer transition-all duration-200 mb-6"
        >
          <MdArrowBack size={18} /> Back
        </button>

        <h2 className="text-2xl font-bold text-slate-800 mb-6">User Details</h2>

        {/* Info Grid */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Name",    value: selectedUser.fullName },
            { label: "Email",   value: selectedUser.email },
            { label: "Phone",   value: selectedUser.phone },
            { label: "Address", value: selectedUser.address || "N/A" },
            { label: "NIC",     value: selectedUser.nic || "N/A" },
            { label: "DOB",     value: selectedUser.dob || "N/A" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col">
              <span className="text-xs text-slate-400 font-semibold uppercase mb-1">{item.label}</span>
              <span className="text-[15px] font-medium text-slate-800">{item.value}</span>
            </div>
          ))}
        </div>

        {/* User Orders */}
        <h3 className="text-xl font-bold text-slate-800 mb-4">User Orders</h3>

        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {userOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-base">
              No orders found for this user
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[500px]">
                <thead className="bg-blue-50">
                  <tr>
                    {["Order ID", "Date", "Total", "Status"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[13px] font-semibold text-blue-900 uppercase tracking-wide border-b-2 border-blue-100">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {userOrders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-600">
                        {order.orderId || order.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {order.date ? new Date(order.date).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                        Rs. {order.totalAmount?.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase
                          ${(order.status || "").toLowerCase() === "active" || (order.status || "").toLowerCase() === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                          }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ================= MAIN TABLE VIEW ================= */
  return (
    <div className="p-6 bg-[#f5f8ff] min-h-screen">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-800 mb-1">User Management</h1>
        <p className="text-slate-500 text-[15px]">Manage registered users and loyalty points</p>
      </div>

      {/* Search */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search users by name, email, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2.5 border border-indigo-200 rounded-lg text-[15px] transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead className="bg-blue-50">
              <tr>
                {["User ID", "Name", "Email", "Phone", "Registered", "Total Purchases", "Loyalty Points", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[13px] font-semibold text-blue-900 uppercase tracking-wide border-b-2 border-blue-100">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150">
                  <td className="px-4 py-3 text-sm font-mono text-slate-600">
                    {user.customerId}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">{user.fullName}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{user.phone}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {user.registeredAt
                      ? new Date(user.registeredAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-emerald-600">
                    Rs. {getTotalPurchases(user.userId || user.id).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <FaStar size={13} className="text-amber-400" />
                      <span className="text-sm font-semibold text-slate-700">
                        {user.loyaltyPoints || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase
                      ${(user.status || "active") === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                      }`}>
                      {user.status || "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {/* View */}
                      <button
                        title="View"
                        onClick={() => setSelectedUser(user)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border-none cursor-pointer transition-colors duration-200"
                      >
                        <MdVisibility size={16} />
                      </button>
                      {/* Add Points */}
                      <button
                        title="Add Points"
                        onClick={() => addLoyaltyPoints(user.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 border-none cursor-pointer transition-colors duration-200"
                      >
                        <MdCardGiftcard size={16} />
                      </button>
                      {/* Disable */}
                      <button
                        title="Disable"
                        onClick={() => disableUser(user.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 border-none cursor-pointer transition-colors duration-200"
                      >
                        <MdBlock size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="py-16 text-center text-slate-400 text-base">
            No users found
          </div>
        )}
      </div>
    </div>
  );
}