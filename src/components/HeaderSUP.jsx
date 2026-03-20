import { useLocation, useNavigate } from "react-router-dom";
import { FiBell, FiUser } from "react-icons/fi";
import { MdLogout } from "react-icons/md";

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
      case "/supplier/settings":
        return { title: "Settings", subtitle: "Update your preferences" };
      default:
        return { title: "Dashboard", subtitle: "Welcome to MediCareX" };
    }
  };

  const { title, subtitle } = getPageTitle();

  const handleLogout = () => {
    // Clear auth state here if needed (e.g. Firebase signOut())
    navigate("/login");
  };

  return (
    <header className="fixed top-0 left-[260px] right-0 h-[70px] bg-gradient-to-r from-[#1e40af] to-[#3b82f6] shadow-md z-[999] flex items-center px-8 box-border">
      <div className="w-full flex justify-between items-center">

        {/* LEFT — Page title & subtitle */}
        <div className="flex flex-col justify-center flex-1 min-w-0">
          <h1 className="text-[22px] font-bold text-white m-0 whitespace-nowrap overflow-hidden text-ellipsis">
            {title}
          </h1>
          <p className="text-[13px] text-white/80 m-0 hidden sm:block">
            {subtitle}
          </p>
        </div>

        {/* RIGHT — Bell + Profile + Logout */}
        <div className="flex items-center gap-5 flex-shrink-0">

          {/* Notification Bell */}
          <button className="relative w-11 h-11 bg-white/15 border-none rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-white/25 hover:-translate-y-0.5">
            <FiBell size={20} className="text-white" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-[#1e40af]">
              3
            </span>
          </button>

          {/* Profile */}
          <div
            className="flex items-center gap-3 px-4 py-2 bg-white/15 rounded-full cursor-pointer transition-all duration-300 hover:bg-white/25 flex-shrink-0"
            onClick={() => navigate("/supplier/settings")}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-full flex items-center justify-center border-2 border-white/30 flex-shrink-0">
              <FiUser size={18} className="text-white" />
            </div>
            <div className="hidden md:flex flex-col gap-0.5">
              <p className="m-0 text-sm font-semibold text-white leading-tight">
                Hello.com
              </p>
              <p className="m-0 text-xs text-white/80 leading-tight">
                Supplier
              </p>
            </div>
          </div>

          

        </div>
      </div>
    </header>
  );
}