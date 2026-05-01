import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiBell, FiUser } from "react-icons/fi";
import { MdLogout } from "react-icons/md";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handler = (e) => setUnreadCount(e.detail.count);
    window.addEventListener("restock-unread-count", handler);
    return () => window.removeEventListener("restock-unread-count", handler);
  }, []);

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":                          return { title: "Dashboard",           subtitle: "Welcome to MediCareX" };
      case "/supplier/product-catalog":  return { title: "Product Catalog",     subtitle: "View and manage products" };
      case "/supplier/purchase-orders":  return { title: "Purchase Orders",     subtitle: "Manage orders from MediCareX" };
      case "/supplier/update-delivery":  return { title: "Update Delivery",     subtitle: "Update delivery status" };
      case "/supplier/restock-alert":    return { title: "Restock Alerts",      subtitle: "Check low stock products" };
      case "/supplier/invoices":         return { title: "Invoices & Payments", subtitle: "View invoices and payments" };
      case "/supplier/notifications":    return { title: "Notifications",       subtitle: "Recent notifications" };
      case "/supplier/settings":         return { title: "Settings",            subtitle: "Update your preferences" };
      default:                           return { title: "Dashboard",           subtitle: "Welcome to MediCareX" };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <header className="fixed top-0 left-[240px] right-0 h-[68px] bg-blue-600 z-[999] flex items-center px-6 shadow-md">
      <div className="w-full flex items-center justify-between gap-4">

        {/* LEFT — page title */}
        <div className="flex items-center gap-3 min-w-0">
          {/* White accent bar */}
          <span className="hidden sm:block w-[3px] h-8 rounded-full bg-white/40 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold text-white m-0 leading-tight truncate">
              {title}
            </h1>
            <p className="text-[12px] text-blue-100 m-0 leading-tight hidden sm:block">
              {subtitle}
            </p>
          </div>
        </div>

        {/* RIGHT — bell + profile */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Notification Bell */}
          <button
            onClick={() => navigate("/supplier/restock-alert")}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500 hover:bg-blue-400 text-white transition border border-blue-400/50"
          >
            <FiBell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-amber-400 text-blue-900 text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-blue-600 leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Divider */}
          <span className="w-px h-6 bg-blue-500 mx-1" />

          {/* Profile pill */}
          <button
            onClick={() => navigate("/supplier/settings")}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 border border-blue-400/50 transition cursor-pointer"
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <FiUser size={14} className="text-white" />
            </div>

            {/* Name + role */}
            <div className="hidden md:flex flex-col items-start leading-tight">
              <span className="text-[13px] font-semibold text-white leading-tight">
                Hello.com
              </span>
              <span className="text-[11px] text-blue-100 leading-tight">
                Supplier
              </span>
            </div>

            {/* Chevron */}
            <svg className="hidden md:block h-3.5 w-3.5 text-blue-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>

      </div>
    </header>
  );
}