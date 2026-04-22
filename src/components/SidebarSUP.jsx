import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  MdDashboard,
  MdNotifications,
  MdShoppingCart,
  MdInventory,
  MdLocalShipping,
  MdReceiptLong,
  MdSettings,
  MdLogout,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { id: 1, icon: <MdDashboard size={22} />, text: "Dashboard", path: "/supplier" },
    { id: 2, icon: <MdNotifications size={22} />, text: "Restock Alert", path: "/supplier/restock-alert" },
    { id: 3, icon: <MdShoppingCart size={22} />, text: "Purchase Orders", path: "/supplier/purchase-orders" },
    { id: 4, icon: <MdInventory size={22} />, text: "Product Catalog", path: "/supplier/product-catalog" },
    { id: 5, icon: <MdLocalShipping size={22} />, text: "Update Delivery", path: "/supplier/update-delivery" },
    { id: 6, icon: <MdReceiptLong size={22} />, text: "Invoice & Payments", path: "/supplier/invoices" },
    { id: 7, icon: <MdSettings size={22} />, text: "Settings", path: "/supplier/settings" },
  ];

  const handleLogout = () => {
    // Clear auth state here if needed (e.g. Firebase signOut())
    navigate("/login");
  };

  return (
    <div
      className={`${
        isCollapsed ? "w-20" : "w-[260px]"
      } h-screen bg-gradient-to-b from-[#1e40af] to-[#1e3a8a] text-white flex flex-col fixed left-0 top-0 shadow-[2px_0_10px_rgba(0,0,0,0.1)] z-[1000] transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo icon */}
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-extrabold text-[#1e40af]">M</span>
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold text-white whitespace-nowrap">
              MediCareX
            </span>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white bg-transparent border-none cursor-pointer hover:bg-white/20 rounded-full p-1 transition-colors flex-shrink-0"
        >
          {isCollapsed ? (
            <MdChevronRight size={22} />
          ) : (
            <MdChevronLeft size={22} />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-5 overflow-y-auto scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20 hover:scrollbar-thumb-white/30">
        {menuItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === "/supplier"}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-5 py-3.5 mx-3 my-1 rounded-lg no-underline transition-all duration-300
              ${
                isActive
                  ? "bg-white/20 text-white font-semibold"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            {/* Active left accent bar */}
            {({ isActive }) =>
              isActive ? (
                <>
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-[70%] bg-amber-400 rounded-r" />
                  <span className="shrink-0">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="text-[15px] whitespace-nowrap">{item.text}</span>
                  )}
                </>
              ) : (
                <>
                  <span className="shrink-0">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="text-[15px] whitespace-nowrap">{item.text}</span>
                  )}
                </>
              )
            }
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-5 border-t border-white/10">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-5 py-3.5 rounded-lg text-white/80 bg-transparent border-none cursor-pointer transition-all duration-300 hover:bg-red-500/70 hover:text-white
          ${isCollapsed ? "justify-center" : ""}`}
        >
          <MdLogout size={22} className="shrink-0" />
          {!isCollapsed && (
            <span className="text-[15px] font-medium">Logout</span>
          )}
        </button>
      </div>
    </div>
  );
}