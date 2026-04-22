import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCartStore } from "../stores/cartStore";

const FONT = { display: "'Playfair Display', serif", body: "'DM Sans', sans-serif" };

export default function CustomerNavbar() {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();

  const items = useCartStore((state) => state.items || []);
  const cartCount = items.reduce((total, item) => total + (item.qty || 0), 0);

  const navLinks = [
    { name: "Home",     href: "/customer" },
    { name: "Products", href: "/customer/products" },
    { name: "Orders",   href: "/customer/orders" },
    { name: "Brands",   href: "/customer/brands" },
    { name: "Contact",  href: "/customer/contact" },
  ];

  const isActive = (href) => {
    if (href === "/customer") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, width: "100%", fontFamily: FONT.body }}>

      {/* ── Top Bar ── */}
      <div style={{ background: "linear-gradient(135deg, #0f2a5e 0%, #1a87e1 100%)" }}>
        <div style={{
          maxWidth: "100%", margin: "0 auto", padding: "0 40px",
          height: 42, display: "flex", justifyContent: "flex-end",
          alignItems: "center", gap: 28,
        }}>
          {[
            { label: "📞 +94 723 556 700", href: null },
            { label: "Facebook",           href: "https://facebook.com",        target: "_blank" },
            { label: "WhatsApp",           href: "https://wa.me/94723556700",   target: "_blank" },
            { label: "Email",              href: "mailto:info@medicarex.com",   target: null },
          ].map(({ label, href, target }) =>
            href ? (
              <a
                key={label}
                href={href}
                target={target || undefined}
                rel={target === "_blank" ? "noreferrer" : undefined}
                style={{
                  fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,0.82)",
                  textDecoration: "none", letterSpacing: "0.01em",
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#ffffff"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.82)"}
              >
                {label}
              </a>
            ) : (
              <span key={label} style={{ fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,0.82)", letterSpacing: "0.01em" }}>
                {label}
              </span>
            )
          )}
        </div>
      </div>

      {/* ── Main Navbar ── */}
      <div style={{
        background: "#ffffff",
        borderBottom: "1px solid rgba(26,135,225,0.15)",
        boxShadow: "0 2px 16px rgba(26,135,225,0.09)",
      }}>
        <div style={{ width: "100%", padding: "0 40px", boxSizing: "border-box" }}>
          <div style={{ height: 90, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

            {/* ── LEFT: Logo ── */}
            <Link to="/customer" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", flexShrink: 0 }}>
              <div style={{
                width: 46, height: 46, borderRadius: "50%",
                backgroundImage: "url('/logo.png')", backgroundSize: "cover", backgroundPosition: "center",
                border: "2.5px solid rgba(26,135,225,0.22)",
                flexShrink: 0,
              }} />
              <div>
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: "#0f2a5e", lineHeight: 1.2 }}>
                  MediCareX
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#64748b", letterSpacing: "0.04em", marginTop: 1 }}>
                  Your Smart Pharmacy
                </div>
              </div>
            </Link>

            {/* ── CENTER: Nav Links ── */}
            <nav style={{ display: "flex", alignItems: "center", gap: 80, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    fontSize: 17,
                    fontWeight: 800,
                    fontFamily: FONT.body,
                    textDecoration: "none",
                    letterSpacing: "0.01em",
                    transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
                    ...(isActive(link.href)
                      ? { background: "#1749b5", color: "#ffffff", boxShadow: "20px 20px 20px rgba(26,135,225,0.28)" }
                      : { color: "#334155", background: "transparent" }
                    ),
                  }}
                  onMouseEnter={e => { if (!isActive(link.href)) { e.currentTarget.style.background = "rgba(26,135,225,0.08)"; e.currentTarget.style.color = "#1a87e1"; } }}
                  onMouseLeave={e => { if (!isActive(link.href)) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#334155"; } }}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* ── RIGHT: Cart + Profile ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>

              {/* Cart */}
              <Link
                to="/customer/cart"
                style={{
                  position: "relative",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(26,135,225,0.06)",
                  border: "1.5px solid rgba(26,135,225,0.18)",
                  fontSize: 19, textDecoration: "none",
                  transition: "background 0.15s, border-color 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(26,135,225,0.13)"; e.currentTarget.style.borderColor = "rgba(26,135,225,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(26,135,225,0.06)"; e.currentTarget.style.borderColor = "rgba(26,135,225,0.18)"; }}
              >
                🛒
                {cartCount > 0 && (
                  <span style={{
                    position: "absolute", top: -7, right: -7,
                    background: "#dc2626", color: "#ffffff",
                    fontSize: 10.5, fontWeight: 700, fontFamily: FONT.body,
                    borderRadius: 20, padding: "2px 6px",
                    border: "2px solid #ffffff",
                    minWidth: 18, textAlign: "center", lineHeight: 1.4,
                  }}>
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Profile */}
              <button
                onClick={() => navigate("/customer/profile")}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 44, height: 44, borderRadius: 12,
                  background: "linear-gradient(135deg, #0f2a5e 0%, #1a87e1 100%)",
                  border: "none", fontSize: 19,
                  boxShadow: "0 4px 14px rgba(26,135,225,0.28)",
                  cursor: "pointer",
                  transition: "opacity 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(26,135,225,0.38)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(26,135,225,0.28)"; }}
              >
                👤
              </button>

            </div>
          </div>
        </div>
      </div>

    </header>
  );
}