import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  MdDashboard,
  MdPeople,
  MdLocalShipping,
  MdInventory,
  MdShoppingCart,
  MdAttachMoney,
  MdBarChart,
  MdNotifications,
  MdPayment,
  MdLogout,
  MdChevronLeft,
  MdChevronRight,
  MdAssignmentInd,
} from "react-icons/md";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { id: 1, icon: <MdDashboard size={22} />, text: "Dashboard", path: "/admin" },
    { id: 2, icon: <MdPeople size={22} />, text: "Users", path: "/admin/usermanagement" },
    { id: 3, icon: <MdLocalShipping size={22} />, text: "Suppliers", path: "/admin/suppliers" },
    { id: 4, icon: <MdInventory size={22} />, text: "Inventory", path: "/admin/products" },
    { id: 5, icon: <MdShoppingCart size={22} />, text: "Order Management", path: "/admin/ordermanagement" },
    { id: 6, icon: <MdAttachMoney size={22} />, text: "Financials", path: "/admin/financialAnalytics" },
    { id: 7, icon: <MdBarChart size={22} />, text: "Analytics", path: "/admin/analytics" },
    { id: 8, icon: <MdNotifications size={22} />, text: "Notifications", path: "/admin/notifications" },
    { id: 9, icon: <MdPayment size={22} />, text: "Admin Payments", path: "/admin/adminPayments" },
    { id: 10, icon: <MdAssignmentInd size={22} />, text: "Account Requests", path: "/admin/account-requests" },
  ];

  const handleLogout = () => {
    // Clear auth state here if needed
    navigate("/login");
  };

  return (
    <div
      className={`${
        isCollapsed ? "w-20" : "w-60"
      } h-screen bg-[#0b5ed7] text-white flex flex-col fixed left-0 top-0 transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-4 bg-[#084298]">
        {!isCollapsed && (
          <span className="text-xl font-bold tracking-wide">MediCareX</span>
        )}
        {isCollapsed && (
          <span className="text-xl font-bold mx-auto">M</span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white bg-transparent border-none cursor-pointer hover:bg-white/20 rounded-full p-1 transition-colors ml-auto"
        >
          {isCollapsed ? <MdChevronRight size={22} /> : <MdChevronLeft size={22} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-5 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === "/admin"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 text-white no-underline transition-colors duration-200
              ${isActive ? "bg-[#06357a]" : "hover:bg-[#084298]"}`
            }
          >
            <span className="shrink-0">{item.icon}</span>
            {!isCollapsed && (
              <span className="text-sm font-medium whitespace-nowrap">
                {item.text}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="border-t border-blue-400/40 p-3">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-4 py-3 text-white rounded-lg hover:bg-red-500/80 transition-colors duration-200 cursor-pointer bg-transparent border-none
          ${isCollapsed ? "justify-center" : ""}`}
        >
          <MdLogout size={22} className="shrink-0" />
          {!isCollapsed && (
            <span className="text-sm font-medium">Logout</span>
          )}
        </button>
      </div>
    </div>
  );
}