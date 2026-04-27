import { useLocation, useNavigate } from "react-router-dom";
import { FiBell, FiUser } from "react-icons/fi";
import { useEffect, useState } from "react";
import { auth, db } from '../services/firebase';
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const [showProfile, setShowProfile] = useState(false);
  const [adminData, setAdminData]     = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tokenClaims, setTokenClaims] = useState(null);

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
      case "/admin/dashboard":
        return { title: "Dashboard",        subtitle: "Admin overview & insights"     };
      case "/admin/usermanagement":
        return { title: "User Management",  subtitle: "Manage registered customers"   };
      case "/admin/suppliers":
        return { title: "Suppliers",        subtitle: "Manage supplier partners"      };
      case "/admin/products":
        return { title: "Products",         subtitle: "View pharmacy products"        };
      case "/admin/ordermanagement":
        return { title: "Orders",           subtitle: "Manage purchase orders"        };
      case "/admin/financialAnalytics":
        return { title: "Analytics",        subtitle: "Sales & profit analysis"       };
      case "/admin/notifications":
        return { title: "Notifications",    subtitle: "System alerts & updates"       };
      case "/admin/analytics":
        return { title: "Sales Analytics",  subtitle: "Analyse sales & updates"       };
      case "/admin/adminPayments":
        return { title: "Payments",         subtitle: "Manage payments"               };
      case "/admin/adminproductapproval":
        return { title: "Product Approval", subtitle: "Approve new product listings"  };
      case "/admin/searchAnalytics":
        return { title: "Search Analytics", subtitle: "Analyze search behavior"       };
      default:
        return { title: "Admin Panel",      subtitle: "Manage your system"            };
    }
  };

  const { title, subtitle } = getPageTitle();

  // ─── Fetch unread notification count ────────────────────────────────────────
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications?recipientType=admin`);
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch (err) {
      console.error("Error fetching notification count:", err);
    }
  };

  // ─── Auth state listener ─────────────────────────────────────────────────────
  // FIX 1: No force-refresh (getIdToken(true)) — was causing auth/network-request-failed.
  // FIX 2: Reads from the correct Firestore collection based on role.
  // FIX 3: If sessionStorage is empty on page load (e.g. hard refresh), probes
  //         the 'admins' collection directly before falling back to 'users'.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.warn("No authenticated user found.");
        return;
      }

      try {
        // Cached token — no force-refresh
        const token = await user.getIdToken();
        const payload = JSON.parse(atob(token.split('.')[1]));
        setTokenClaims(payload);
        console.log("Token claims:", payload);

        if (!payload.role || payload.role !== 'admin') {
          console.warn(
            "⚠️  Token is missing the 'admin' role claim.\n" +
            "Run setCustomUserClaims({ role: 'admin' }) on the backend for UID:", user.uid,
            "\nThen sign out and back in."
          );
        }

        // Determine collection from sessionStorage role
        let storedRole = sessionStorage.getItem('userRole');

        // FIX: sessionStorage can be empty on hard refresh before AuthContext sets it.
        // Probe the admins collection directly so the header still loads the profile.
        if (!storedRole) {
          const adminProbe = await getDoc(doc(db, 'admins', user.uid));
          if (adminProbe.exists()) {
            storedRole = 'admin';
            sessionStorage.setItem('userRole', 'admin');
          }
        }

        const collectionName =
          storedRole === 'admin'      ? 'admins'      :
          storedRole === 'supplier'   ? 'suppliers'   :
          storedRole === 'pharmacist' ? 'pharmacists' : 'users';

        const docSnap = await getDoc(doc(db, collectionName, user.uid));
        if (docSnap.exists()) {
          setAdminData(docSnap.data());
        } else {
          console.warn(
            `No Firestore document found in "${collectionName}" for UID:`, user.uid,
            "\nCreate the document in Firestore Console under the correct collection."
          );
        }
      } catch (err) {
        console.error("Error in auth init:", err);
      }
    });

    return () => unsubscribe();
  }, []);

  // Poll notifications every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Re-fetch when navigating away from notifications page
  useEffect(() => {
    fetchUnreadCount();
  }, [location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowProfile(false);
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
            onClick={(e) => { e.stopPropagation(); setShowProfile(!showProfile); }}
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
                  <p className="font-semibold text-gray-800">{adminData.fullName}</p>
                  <p className="text-sm text-gray-600">{adminData.email}</p>
                  <p className="text-sm text-gray-600">📞 {adminData.phone || "No phone"}</p>
                  <p className="text-xs text-blue-500 mt-2">Role: {adminData.role}</p>

                  {/* Debug: show token claims in dev mode */}
                  {import.meta.env.DEV && tokenClaims && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-400 cursor-pointer">Token claims (dev)</summary>
                      <pre className="text-[10px] text-slate-500 mt-1 overflow-auto max-h-24">
                        {JSON.stringify(tokenClaims, null, 2)}
                      </pre>
                    </details>
                  )}

                  <button
                    onClick={() => { auth.signOut(); navigate("/login"); }}
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