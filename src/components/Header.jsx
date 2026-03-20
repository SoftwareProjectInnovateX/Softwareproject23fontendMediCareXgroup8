import { useLocation, useNavigate } from "react-router-dom";
import { FiBell, FiUser } from "react-icons/fi";

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
    <header className="h-[70px] bg-[#9fbaf2] border-b border-gray-200 px-6 flex justify-between items-center">
      
      {/* LEFT — Page title & subtitle */}
      <div>
        <h1 className="text-[22px] font-semibold text-gray-900">{title}</h1>
        <p className="text-[13px] text-gray-500">{subtitle}</p>
      </div>

      {/* RIGHT — Bell + Profile */}
      <div className="flex items-center gap-5">

        {/* Notification Bell */}
        <button className="relative p-2 rounded-full hover:bg-white/30 transition-colors cursor-pointer bg-transparent border-none">
          <FiBell size={22} className="text-gray-800" />
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            3
          </span>
        </button>

        {/* Profile */}
        <div
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate("/admin/settings")}
        >
          <div className="w-9 h-9 rounded-full bg-white/40 flex items-center justify-center">
            <FiUser size={20} className="text-gray-800" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">Admin</p>
            <p className="text-xs text-gray-600 leading-tight">Administrator</p>
          </div>
        </div>

      </div>
    </header>
  );
}