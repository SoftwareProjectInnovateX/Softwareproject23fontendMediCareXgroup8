import { useState } from "react";
import { NavLink } from "react-router-dom";
import "./SidebarSUP.css";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 1, icon: "📊", text: "Dashboard", path: "/supplier" },
    { id: 2, icon: "🔔", text: "Restock Alert", path: "/supplier/restock-alert" },
    { id: 3, icon: "🛒", text: "Purchase Orders", path: "/supplier/purchase-orders" },
    { id: 4, icon: "📦", text: "Product Catalog", path: "/supplier/product-catalog" },
    { id: 5, icon: "🚚", text: "Update Delivery", path: "/supplier/update-delivery" },
    { id: 6, icon: "📄", text: "Invoice & Payments", path: "/supplier/invoices" },
    { id: 7, icon: "⚙️", text: "Settings", path: "/supplier/settings" },
  ];

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">
            <span className="logo-symbol">M</span>
          </div>
          {!isCollapsed && <span className="logo-text">MediCareX</span>}
        </div>
        <button
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? "▶" : "◀"}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
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

      <div className="sidebar-footer">
        <button className="logout-btn">
          🚪 {!isCollapsed && "Logout"}
        </button>
      </div>
    </div>
  );
}
