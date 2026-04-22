import { Link } from "react-router-dom";

const C = {
  bg:         "#0f2a5e",
  surface:    "rgba(255,255,255,0.05)",
  border:     "rgba(26,135,225,0.25)",
  accent:     "#1a87e1",
  accentDark: "#0f2a5e",
  textPrimary:"#ffffff",
  textMuted:  "rgba(255,255,255,0.55)",
  textSoft:   "rgba(255,255,255,0.35)",
};

const FONT = { display: "'Playfair Display', serif", body: "'DM Sans', sans-serif" };

const linkStyle = {
  fontSize: 13,
  color: C.textMuted,
  textDecoration: "none",
  fontFamily: FONT.body,
  transition: "color 0.15s",
};

function FooterLink({ to, children }) {
  return (
    <li>
      <Link
        to={to}
        style={linkStyle}
        onMouseEnter={e => e.currentTarget.style.color = C.accent}
        onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
      >
        {children}
      </Link>
    </li>
  );
}

export default function Footer() {
  return (
    <footer style={{ background: "linear-gradient(135deg, #0f2a5e 0%, #0a1f47 100%)", fontFamily: FONT.body }}>

      {/* Top accent line */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #1a87e1, #0284c7, #1a87e1)" }} />

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px" }}>

        {/* GRID */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 40,
        }}>

          {/* COMPANY */}
          <div>
            <h2 style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
              MediCareX
            </h2>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
              Your Smart Pharmacy System
            </p>
            <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7 }}>
              Trusted pharmacy platform for managing medicines and healthcare services.
            </p>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h3 style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
              Quick Links
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <FooterLink to="/customer/products">Products</FooterLink>
              <FooterLink to="/customer/orders">Orders</FooterLink>
              <FooterLink to="/customer/cart">Cart</FooterLink>
              <FooterLink to="/customer/offers">Offers</FooterLink>
            </ul>
          </div>

          {/* SUPPORT */}
          <div>
            <h3 style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
              Support
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <FooterLink to="/customer/help">Help Center</FooterLink>
              <FooterLink to="/customer/returns">Returns</FooterLink>
              <FooterLink to="/customer/privacy">Privacy Policy</FooterLink>
              <FooterLink to="/customer/terms">Terms</FooterLink>
            </ul>
          </div>

          {/* CONTACT */}
          <div>
            <h3 style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
              Contact
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { icon: "📞", text: "+94 76 068 9429" },
                { icon: "📧", text: "info@medicarex.com" },
                { icon: "📍", text: "Sri Lanka" },
              ].map(({ icon, text }) => (
                <p key={text} style={{ fontSize: 13, color: C.textMuted, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{icon}</span> {text}
                </p>
              ))}
            </div>

            {/* Social icons */}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              {[
                { href: "https://facebook.com",          icon: "📘" },
                { href: "https://twitter.com",           icon: "🐦" },
                { href: "https://instagram.com",         icon: "📸" },
                { href: "https://wa.me/94760689429",     icon: "💬" },
              ].map(({ href, icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, textDecoration: "none",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(26,135,225,0.2)"; e.currentTarget.style.borderColor = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; }}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* BOTTOM */}
        <div style={{
          borderTop: `1px solid ${C.border}`,
          marginTop: 40, paddingTop: 24,
          textAlign: "center",
          fontSize: 12, color: C.textSoft,
          fontFamily: FONT.body,
        }}>
          © 2026 MediCareX POS — All Rights Reserved
        </div>

      </div>
    </footer>
  );
}