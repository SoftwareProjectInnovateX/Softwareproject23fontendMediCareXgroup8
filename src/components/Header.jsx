import { useLocation, useNavigate } from "react-router-dom";
import { Bell, User, Phone, Shield, LogOut, ChevronDown, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { auth, db } from '../services/firebase';
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PAGE_META = {
  "/":                           { title: "Dashboard",        subtitle: "Admin overview & insights"    },
  "/admin/dashboard":            { title: "Dashboard",        subtitle: "Admin overview & insights"    },
  "/admin/usermanagement":       { title: "User Management",  subtitle: "Manage registered customers"  },
  "/admin/suppliers":            { title: "Suppliers",        subtitle: "Manage supplier partners"     },
  "/admin/products":             { title: "Products",         subtitle: "View pharmacy inventory"      },
  "/admin/ordermanagement":      { title: "Orders",           subtitle: "Manage purchase orders"       },
  "/admin/financialAnalytics":   { title: "Financials",       subtitle: "Sales & profit analysis"      },
  "/admin/notifications":        { title: "Notifications",    subtitle: "System alerts & updates"      },
  "/admin/analytics":            { title: "Sales Analytics",  subtitle: "Analyse sales & updates"      },
  "/admin/adminPayments":        { title: "Payments",         subtitle: "Manage payment records"       },
  "/admin/adminproductapproval": { title: "Product Approval", subtitle: "Approve new product listings" },
  "/admin/search-analytics":     { title: "Search Analytics", subtitle: "Analyze search behavior"      },
};

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const [showProfile, setShowProfile] = useState(false);
  const [adminData, setAdminData]     = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tokenClaims, setTokenClaims] = useState(null);

  const { title, subtitle } =
    PAGE_META[location.pathname] || { title: "Admin Panel", subtitle: "Manage your system" };

  /* ── Fetch unread count ── */
  const fetchUnreadCount = async () => {
    try {
      const res  = await fetch(`${API_BASE}/notifications?recipientType=admin`);
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch (err) {
      console.error("Error fetching notification count:", err);
    }
  };

  /* ── Auth listener ── */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const token   = await user.getIdToken();
        const payload = JSON.parse(atob(token.split(".")[1]));
        setTokenClaims(payload);

        let storedRole = sessionStorage.getItem("userRole");
        if (!storedRole) {
          const probe = await getDoc(doc(db, "admins", user.uid));
          if (probe.exists()) {
            storedRole = "admin";
            sessionStorage.setItem("userRole", "admin");
          }
        }

        const col =
          storedRole === "admin"      ? "admins"      :
          storedRole === "supplier"   ? "suppliers"   :
          storedRole === "pharmacist" ? "pharmacists" : "users";

        const snap = await getDoc(doc(db, col, user.uid));
        if (snap.exists()) setAdminData(snap.data());
      } catch (err) {
        console.error("Auth init error:", err);
      }
    });
    return () => unsubscribe();
  }, []);

  /* ── Poll notifications ── */
  useEffect(() => {
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { fetchUnreadCount(); }, [location.pathname]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const close = () => setShowProfile(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  /* ── Avatar initials ── */
  const initials = adminData?.fullName
    ? adminData.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "A";

  return (
    <header className="h-[70px] bg-gradient-to-r from-blue-600 to-blue-700 px-6 flex justify-between items-center relative shadow-md">

      {/* ── LEFT: Page title ── */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-6 rounded-full bg-white/60" />
          <h1 className="text-[20px] font-bold text-white leading-tight tracking-tight">
            {title}
          </h1>
        </div>
        <p className="text-[12px] text-blue-100 font-medium ml-3.5 mt-0.5 tracking-wide">
          {subtitle}
        </p>
      </div>

      {/* ── RIGHT: Actions ── */}
      <div className="flex items-center gap-2">

        {/* Notification Bell */}
        <button
          onClick={() => navigate("/admin/notifications")}
          className="relative w-10 h-10 rounded-xl flex items-center justify-center
                     text-white/80 hover:text-white hover:bg-white/15
                     border border-transparent hover:border-white/20
                     transition-all duration-150"
        >
          <Bell size={19} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-bold
                             rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5
                             ring-2 ring-blue-600 leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-white/20 mx-1" />

        {/* Profile trigger */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowProfile((p) => !p); }}
            className={`
              flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer
              border transition-all duration-150
              ${showProfile
                ? "bg-white/20 border-white/30 shadow-inner"
                : "bg-white/10 border-white/15 hover:bg-white/20 hover:border-white/30"
              }
            `}
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-lg bg-white/25 border border-white/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[12px] font-bold text-white">{initials}</span>
            </div>

            {/* Name + role */}
            <div className="text-left hidden sm:block">
              <p className="text-[13px] font-semibold text-white leading-tight">
                {adminData?.fullName || "Admin User"}
              </p>
              <p className="text-[11px] text-blue-100 leading-tight capitalize">
                {adminData?.role || "Administrator"}
              </p>
            </div>

            <ChevronDown
              size={15}
              strokeWidth={2.5}
              className={`text-white/60 transition-transform duration-200 ${showProfile ? "rotate-180" : ""}`}
            />
          </button>

          {/* ── Profile Dropdown ── */}
          {showProfile && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl
                         border border-gray-100 z-50 overflow-hidden"
            >
              {adminData ? (
                <>
                  {/* Card header */}
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30
                                      flex items-center justify-center flex-shrink-0">
                        <span className="text-[16px] font-bold text-white">{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold text-white truncate">
                          {adminData.fullName}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Shield size={11} className="text-blue-200" strokeWidth={2} />
                          <p className="text-[11px] text-blue-200 capitalize font-medium">
                            {adminData.role || "Administrator"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info rows */}
                  <div className="px-4 py-3 space-y-2.5">
                    <div className="flex items-center gap-2.5 text-gray-600">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Mail size={13} strokeWidth={2} className="text-blue-500" />
                      </div>
                      <p className="text-[12.5px] truncate">{adminData.email || "No email"}</p>
                    </div>

                    <div className="flex items-center gap-2.5 text-gray-600">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Phone size={13} strokeWidth={2} className="text-blue-500" />
                      </div>
                      <p className="text-[12.5px]">{adminData.phone || "No phone on record"}</p>
                    </div>

                    <div className="flex items-center gap-2.5 text-gray-600">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Shield size={13} strokeWidth={2} className="text-blue-500" />
                      </div>
                      <p className="text-[12.5px] text-blue-600 font-semibold capitalize">
                        {adminData.role || "Administrator"}
                      </p>
                    </div>
                  </div>

                  {/* Dev token claims */}
                  {import.meta.env.DEV && tokenClaims && (
                    <div className="px-4 pb-2">
                      <details className="bg-gray-50 rounded-lg px-3 py-2">
                        <summary className="text-[11px] text-gray-400 cursor-pointer select-none font-medium">
                          Token claims (dev only)
                        </summary>
                        <pre className="text-[10px] text-gray-500 mt-2 overflow-auto max-h-24 leading-relaxed">
                          {JSON.stringify(tokenClaims, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="h-px bg-gray-100 mx-4" />

                  {/* Logout */}
                  <div className="px-4 py-3">
                    <button
                      onClick={() => { auth.signOut(); navigate("/login"); }}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                                 bg-red-50 text-red-600 border border-red-100
                                 hover:bg-red-500 hover:text-white hover:border-red-500
                                 text-[13px] font-semibold transition-all duration-150"
                    >
                      <LogOut size={15} strokeWidth={2} />
                      Sign out
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-8 gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  <p className="text-[13px] text-gray-400">Loading profile...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}