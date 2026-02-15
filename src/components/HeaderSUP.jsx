import { useLocation, useNavigate } from "react-router-dom";
import './HeaderSUP.css';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return { title: "Dashboard", subtitle: "Welcome to MediCareX" };
      case "/supplier/product-catalog":
        return { title: "Product Catalog", subtitle: "View and manage products" };
      case "/supplier/purchase-orders":
        return { title: "Purchase Orders", subtitle: "Manage orders from MediCareX" };
      case "/supplier/update-delivery":
        return { title: "Update Delivery", subtitle: "Update delivery status" };
      case "/supplier/restock-alert":
        return { title: "Restock Alerts", subtitle: "Check low stock products" };
      case "/supplier/invoices":
        return { title: "Invoices & Payments", subtitle: "View invoices and payments" };
      case "/supplier/notifications":
        return { title: "Notifications", subtitle: "Recent notifications" };
      case "/ssupplier/ettings":
        return { title: "Settings", subtitle: "Update your preferences" };
      default:
        return { title: "Dashboard", subtitle: "Welcome to MediCareX" };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="page-title-section">
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">{subtitle}</p>
          </div>
        </div>

        <div className="header-right">
          <button className="header-icon-btn notification-btn">
            <span className="icon">🔔</span>
            <span className="notification-badge">3</span>
          </button>

          {/* 👇 Clickable Profile Section */}
          <div
            className="user-profile-header"
            onClick={() => navigate("/settings")}
            style={{ cursor: "pointer" }}
          >
            <div className="user-avatar-header">
              <span>👤</span>
            </div>
            <div className="user-info-header">
              <p className="user-greeting">Hello.com</p>
              <p className="user-role-header">Supplier</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
