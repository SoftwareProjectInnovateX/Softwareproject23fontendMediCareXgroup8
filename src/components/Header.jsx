import { useLocation, useNavigate } from "react-router-dom";
import { FiBell, FiUser } from "react-icons/fi";
import { useEffect, useState } from "react";
import { auth, db } from '../services/firebase';
import { doc, getDoc } from "firebase/firestore";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const [showProfile, setShowProfile] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

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
        return { title: "Registration", subtitle: "Manage user registrations" };
    }
  };

  const { title, subtitle } = getPageTitle();

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications?recipientType=admin`);
      if (!res.ok) return;
      const data = await res.json();
      const count = data.filter((n) => !n.read).length;
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching notification count:", error);
    }
  };

  // Fetch admin data from Firebase
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setAdminData(docSnap.data());
          } else {
            console.log("No admin data found");
          }
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
      }
    };

    fetchAdminData();
  }, []);

  // Fetch unread count on mount and poll every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Re-fetch when navigating away from notifications page (user may have read some)
  useEffect(() => {
    fetchUnreadCount();
  }, [location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowProfile(false);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <header className="h-[70px] bg-[#9fbaf2] border-b border-gray-200 px-6 flex justify-between items-center relative">

      {/* LEFT — Title */}
      <div>
        <h1 className="text-[22px] font-semibold text-gray-900">{title}</h1>
        <p className="text-[13px] text-gray-500">{subtitle}</p>
      </div>

      {/* RIGHT — Bell + Profile */}
      <div className="flex items-center gap-5 relative">

        {/* Notification Bell */}
        <button
          onClick={() => navigate("/admin/notifications")}
          className="relative p-2 rounded-full hover:bg-white/30 transition"
        >
          <FiBell size={22} className="text-gray-800" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Profile */}
        <div className="relative">
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowProfile(!showProfile);
            }}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition"
          >
            <div className="w-9 h-9 rounded-full bg-white/40 flex items-center justify-center">
              <FiUser size={20} className="text-gray-800" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {adminData?.fullName || "Admin"}
              </p>
              <p className="text-xs text-gray-600">
                {adminData?.role || "Administrator"}
              </p>
            </div>
          </div>

          {/* PROFILE CARD */}
          {showProfile && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-3 w-64 bg-white shadow-lg rounded-lg p-4 z-50"
            >
              {adminData ? (
                <>
                  <p className="font-semibold text-gray-800">
                    {adminData.fullName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {adminData.email}
                  </p>
                  <p className="text-sm text-gray-600">
                    📞 {adminData.phone || "No phone"}
                  </p>
                  <p className="text-xs text-blue-500 mt-2">
                    Role: {adminData.role}
                  </p>
                  <button
                    onClick={() => navigate("/login")}
                    className="mt-3 w-full bg-red-500 text-white py-1.5 rounded hover:bg-red-600"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-500">Loading...</p>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
}