import { useEffect, useState } from "react";
import axios from "axios";
import { getAuthHeaders } from "../../services/firebase";
import {
  MdArrowBack,
  MdVisibility,
  MdCardGiftcard,
  MdBlock,
} from "react-icons/md";
import { FaStar } from "react-icons/fa";
import PageLayout from "../../components/PageLayout";
import ResponsiveTable from "../../components/ResponsiveTable";

export default function UserManagement() {
  const [users, setUsers]               = useState([]);
  const [orders, setOrders]             = useState([]);
  const [search, setSearch]             = useState("");
  const [loading, setLoading]           = useState(true);
  const [selectedUser, setSelectedUser] = useState(null); // null = list view, object = detail view

  // Fetch all users and orders when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch users; on failure set to empty array so the page still renders
      try {
        const authHeaders = await getAuthHeaders();
        const usersRes = await axios.get("http://localhost:5000/api/users", {
          headers: authHeaders,
        });
        setUsers(usersRes.data);
      } catch (err) {
        console.error("Failed to load users", err);
        setUsers([]);
      }

      // Fetch orders separately so a users failure doesn't block this
      try {
        const authHeaders = await getAuthHeaders();
        const ordersRes = await axios.get("http://localhost:5000/api/orders", {
          headers: authHeaders,
        });
        setOrders(ordersRes.data);
      } catch (err) {
        console.error("Failed to load orders", err);
        setOrders([]);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  // Sum all order amounts for a user by matching their Firestore doc ID
  const getTotalPurchases = (userId) =>
    orders
      .filter((o) => o.userId === userId)
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Prompt admin for a point value, call the API, then update local state optimistically
  const addLoyaltyPoints = async (docId) => {
    const points = prompt("Enter loyalty points to add:");
    if (!points || isNaN(points) || Number(points) <= 0) return; // ignore invalid input
    try {
      const authHeaders = await getAuthHeaders();
      await axios.put(
        `http://localhost:5000/api/users/${docId}/loyalty`,
        { points: Number(points) },
        { headers: authHeaders }
      );
      // Update the user's points in state without refetching
      setUsers((prev) =>
        prev.map((u) =>
          u.id === docId
            ? { ...u, loyaltyPoints: (u.loyaltyPoints || 0) + Number(points) }
            : u
        )
      );
      alert("Loyalty points added successfully");
    } catch {
      alert("Failed to update points");
    }
  };

  // Ask for confirmation, then set the user's status to "inactive" via API
  const disableUser = async (docId) => {
    if (!window.confirm("Are you sure you want to disable this user?")) return;
    try {
      const authHeaders = await getAuthHeaders();
      await axios.put(
        `http://localhost:5000/api/users/${docId}/status`,
        { status: "inactive" },
        { headers: authHeaders }
      );
      // Reflect the status change immediately in local state
      setUsers((prev) =>
        prev.map((u) => (u.id === docId ? { ...u, status: "inactive" } : u))
      );
    } catch {
      alert("Failed to disable user");
    }
  };

  // Client-side filter: match search term against name, email, or customer ID
  const filteredUsers = users.filter((u) =>
    `${u.fullName} ${u.email} ${u.customerId} ${u.userId}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Show a simple loading message while API calls are in progress
  if (loading)
    return (
      <div className="p-6 bg-[#f5f8ff] min-h-screen text-slate-500 text-lg">
        Loading users...
      </div>
    );

  /* ================= USER DETAIL VIEW ================= */
  // Shown when admin clicks "View" on a user row
  if (selectedUser) {
    // Only show orders that belong to this user (matched by Firestore doc ID)
    const userOrders = orders.filter((o) => o.userId === selectedUser.id);

    const orderColumns = [
      {
        key: "orderId",
        label: "Order ID",
        render: (_v, order) => (
          <span className="text-sm font-mono font-semibold text-blue-600">
            {order.orderId || order.id}
          </span>
        ),
      },
      {
        key: "date",
        label: "Date",
        render: (_v, order) => (
          <span className="text-sm text-slate-600">
            {order.date ? new Date(order.date).toLocaleDateString() : "-"}
          </span>
        ),
      },
      {
        key: "totalAmount",
        label: "Total",
        render: (_v, order) => (
          <span className="text-sm font-semibold text-emerald-600">
            Rs. {order.totalAmount?.toFixed(2)}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (_v, order) => (
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase
            ${
              ["active", "completed"].includes((order.status || "").toLowerCase())
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {order.status}
          </span>
        ),
      },
    ];

    return (
      <PageLayout
        title="User Details"
        actions={
          <button
            onClick={() => setSelectedUser(null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg border-none cursor-pointer transition-all duration-200"
          >
            <MdArrowBack size={18} /> Back
          </button>
        }
      >
        {/* Profile grid — renders each field from a config array */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Customer ID",    value: selectedUser.customerId || "N/A" },
            { label: "Name",           value: selectedUser.fullName || selectedUser.name },
            { label: "Email",          value: selectedUser.email },
            { label: "Phone",          value: selectedUser.phone },
            { label: "Status",         value: selectedUser.status || "active" },
            { label: "Loyalty Points", value: selectedUser.loyaltyPoints || 0 },
          ].map((item) => (
            <div key={item.label} className="flex flex-col">
              <span className="text-xs text-slate-400 font-semibold uppercase mb-1">
                {item.label}
              </span>
              <span className="text-[15px] font-medium text-slate-800">
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Order history for the selected user */}
        <h3 className="text-xl font-bold text-slate-800 mb-4">User Orders</h3>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <ResponsiveTable
            columns={orderColumns}
            data={userOrders}
            keyField="id"
            loading={false}
            emptyMessage="No orders found for this user"
            cardTitle="orderId"
            cardBadge="status"
          />
        </div>
      </PageLayout>
    );
  }

  /* ================= MAIN TABLE VIEW ================= */
  const userColumns = [
    {
      key: "customerId",
      label: "Customer ID",
      render: (_v, user) => (
        <span className="text-sm font-mono font-semibold text-blue-700">
          {user.customerId || user.userId || user.id}
        </span>
      ),
    },
    {
      key: "fullName",
      label: "Name",
      render: (_v, user) => (
        <span className="text-sm font-semibold text-slate-800">{user.fullName || user.name}</span>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (_v, user) => <span className="text-sm text-slate-600">{user.email}</span>,
    },
    {
      key: "phone",
      label: "Phone",
      render: (_v, user) => <span className="text-sm text-slate-600">{user.phone}</span>,
    },
    {
      key: "createdAt",
      label: "Registered",
      render: (_v, user) => (
        <span className="text-sm text-slate-600">
          {user.createdAt
            ? new Date(
                user.createdAt._seconds ? user.createdAt._seconds * 1000 : user.createdAt
              ).toLocaleDateString()
            : "-"}
        </span>
      ),
    },
    {
      key: "totalPurchases",
      label: "Total Purchases",
      render: (_v, user) => (
        <span className="text-sm font-bold text-emerald-600">
          Rs. {getTotalPurchases(user.id).toFixed(2)}
        </span>
      ),
    },
    {
      key: "loyaltyPoints",
      label: "Loyalty Points",
      render: (_v, user) => (
        <div className="flex items-center gap-1">
          <FaStar size={13} className="text-amber-400" />
          <span className="text-sm font-semibold text-slate-700">{user.loyaltyPoints || 0}</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (_v, user) => (
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase
          ${
            (user.status || "active") === "active"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {user.status || "active"}
        </span>
      ),
    },
  ];

  const renderUserActions = (user) => (
    <div className="flex items-center gap-1.5">
      <button
        title="View"
        onClick={() => setSelectedUser(user)}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border-none cursor-pointer transition-colors duration-200"
      >
        <MdVisibility size={16} />
      </button>
      <button
        title="Add Points"
        onClick={() => addLoyaltyPoints(user.id)}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 border-none cursor-pointer transition-colors duration-200"
      >
        <MdCardGiftcard size={16} />
      </button>
      <button
        title="Disable"
        onClick={() => disableUser(user.id)}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 border-none cursor-pointer transition-colors duration-200"
      >
        <MdBlock size={16} />
      </button>
    </div>
  );

  return (
    <PageLayout title="User Management" subtitle="Manage registered users and loyalty points">
      {/* Search input — filters the user list as the admin types */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name, email, or customer ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2.5 border border-indigo-200 rounded-lg text-[15px] transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        <ResponsiveTable
          columns={userColumns}
          data={filteredUsers}
          keyField="id"
          loading={false}
          emptyMessage="No users found"
          cardTitle="fullName"
          cardBadge="status"
          actions={renderUserActions}
        />
      </div>
    </PageLayout>
  );
}