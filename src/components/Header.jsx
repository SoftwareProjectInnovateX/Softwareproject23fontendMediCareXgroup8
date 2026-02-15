import { useLocation, useNavigate } from "react-router-dom";
import "./Header.css";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return { title: "Dashboard", subtitle: "Admin overview & insights" };
      case "/admin/usermanagement":
        return { title: "User Management", subtitle: "Manage registered customers" };
      case "/admin/suppliers":
        return { title: "Suppliers", subtitle: "Manage supplier partners" };
      case "/admin/products":
        return { title: "Products", subtitle: "View pharmacy products" };
      case "/admin/ordermanagement":
        return { title: "Orders", subtitle: "Manage purchase orders" };
      case "/admin/financialAnalytics":
        return { title: "Analytics", subtitle: "Sales & profit analysis" };
      case "/admin/notifications":
        return { title: "Notifications", subtitle: "System alerts & updates" };
        case "/admin/analytics":
        return { title: "Sales Analytics", subtitle: "Analyse sales & updates" };
        case "/admin/adminpayments":
        return { title: "Payments", subtitle: "Manage payments" };
      default:
        return { title: "Dashboard", subtitle: "Welcome to MediCareX" };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>

      <div className="header-right">
        <button className="icon-btn">
          🔔
          <span className="badge">3</span>
        </button>

        <div
          className="profile"
          onClick={() => navigate("/admin/settings")}
        >
          <span className="avatar">👤</span>
          <div>
            <p className="name">Admin</p>
            <p className="role">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
