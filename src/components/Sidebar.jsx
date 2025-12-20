import { useState } from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 1, icon: "📊", text: "Dashboard", path: "/" },
    { id: 2, icon: "👥", text: "Users", path: "/admin/usermanagement" },
    { id: 3, icon: "🏭", text: "Suppliers", path: "/admin/suppliers" },
    { id: 4, icon: "📦", text: "Inventory", path: "/admin/products" },
    { id: 5, icon: "🛒", text: "Financials", path: "/admin/financialAnalytics" },
    { id: 6, icon: "📈", text: "Analytics", path: "/admin/analytics" },
    { id: 7, icon: "🔔", text: "Notifications", path: "/admin/notifications" }
  ];

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-text">
            {!isCollapsed ? "MediCareX" : "M"}
          </span>
        </div>
        <button
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? "▶" : "◀"}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            {!isCollapsed && <span className="nav-text">{item.text}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
