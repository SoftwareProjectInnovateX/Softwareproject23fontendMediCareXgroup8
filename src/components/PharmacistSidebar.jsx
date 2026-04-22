import { NavLink } from "react-router-dom";
import logo from "../assets/logo.png";
import {
  LayoutDashboard, PlusCircle, Package,
  FileText, ShoppingCart, Archive,
  RefreshCw, Tag, MessageSquare
} from "lucide-react";

const C = {
  sidebar: "linear-gradient(180deg, #1737c2 0%, #0284c7 100%)",
  border: "rgba(255,255,255,0.18)",
};

const FONT = {
  display: "'Playfair Display', serif",
  body: "'DM Sans', sans-serif",
};

const navItems = [
  { section: "Main", items: [
    { to: "/pharmacist/dashboard",   label: "Dashboard",     icon: LayoutDashboard },
    { to: "/pharmacist/add-product", label: "Add Product",   icon: PlusCircle      },
    { to: "/pharmacist/my-products", label: "My Products",   icon: Package         },
  ]},
  { section: "Management", items: [
    { to: "/pharmacist/prescriptions", label: "Prescriptions", icon: FileText      },
    { to: "/pharmacist/orders",        label: "Orders",        icon: ShoppingCart  },
    { to: "/pharmacist/inventory",     label: "Inventory",     icon: Archive       },
    { to: "/pharmacist/returns",       label: "Returns",       icon: RefreshCw     },
    { to: "/pharmacist/brands",        label: "Brands",        icon: Tag           },
    { to: "/pharmacist/messages",      label: "Messages",      icon: MessageSquare },
  ]},
];

export default function PharmacistSidebar() {
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@500&display=swap" rel="stylesheet" />

      <aside style={{
    width: "230px", height: "100vh",
    position: "fixed", top: 0, left: 0,
    background: C.sidebar,
    borderRight: `1px solid ${C.border}`,
    display: "flex", flexDirection: "column",
    fontFamily: FONT.body,
    boxShadow: "2px 0 16px rgba(2,132,199,0.3)",
    overflowY: "auto", zIndex: 100,
  }}>
        {/* Logo */}
        <div style={{ padding: "28px 20px 22px", borderBottom: `1px solid ${C.border}` }}>
          <img
            src={logo}
            alt="MediCare Logo"
            style={{ width: 120, height: "auto", objectFit: "contain", marginBottom: 6 }}
          />
          <div style={{
            fontSize: 11, color: "rgb(255, 255, 255)", marginTop: 3,
            textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600,
          }}>
            Pharmacist Panel
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(({ section, items }) => (
            <div key={section}>
              <div style={{
                fontSize: 11, color: "rgb(255, 255, 255)",
                textTransform: "uppercase", letterSpacing: "0.12em",
                fontWeight: 700, padding: "14px 12px 5px",
              }}>
                {section}
              </div>
              {items.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} style={({ isActive }) => ({
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 8,
                  fontSize: 14, fontWeight: isActive ? 600 : 500,
                  color: "#ffffff",
                  opacity: isActive ? 1 : 0.78,
                  background: isActive ? "rgba(255,255,255,0.22)" : "transparent",
                  borderLeft: isActive ? "2.5px solid #ffffff" : "2.5px solid transparent",
                  textDecoration: "none", fontFamily: FONT.body,
                  transition: "all 0.15s",
                  boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                })}>
                  <Icon size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: "14px 16px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,0.25)",
              border: "1.5px solid rgba(255,255,255,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#ffffff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}>PH</div>
            <div>
              <div style={{ fontSize: 15, color: "#ffffff", fontWeight: 700 }}>Pharmacist</div>
              <div style={{ fontSize: 12, color: "#bbf7d0", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                Online
              </div>
            </div>
          </div>
        </div>

      </aside>
    </>
  );
}