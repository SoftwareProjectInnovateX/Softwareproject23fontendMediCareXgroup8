import React from "react";
import { ShieldCheck, Truck, HeartPulse, Users, Target, Eye } from "lucide-react";

const FONT = { display: "'Playfair Display', serif", body: "'DM Sans', sans-serif" };

export default function About() {
  return (
    <div style={{ fontFamily: FONT.body, background: "#f8fbff" }}>

      {/* 🔷 HERO */}
      <section style={{
        background: "linear-gradient(135deg, #0f2a5e 0%, #1a87e1 100%)",
        padding: "120px 20px",
        textAlign: "center",
        color: "#fff",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: -80, left: -80, width: 250, height: 250, background: "rgba(255,255,255,0.03)", borderRadius: "50%" }} />
        
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{
            fontFamily: FONT.display,
            fontSize: 56,
            fontWeight: 700,
            marginBottom: 16,
            letterSpacing: "-1px"
          }}>
            About MediCareX
          </h1>

          <p style={{ opacity: 0.95, fontSize: 18, maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
            Your trusted digital pharmacy delivering care, convenience, and confidence with every order.
          </p>
        </div>
      </section>

      {/* 🔷 ABOUT */}
      <section style={{ padding: "90px 20px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <h2 style={{ fontSize: 40, fontWeight: 700, color: "#0f2a5e", marginBottom: 20, letterSpacing: "-0.5px" }}>Who We Are</h2>
          <div style={{ width: 80, height: 4, background: "linear-gradient(90deg, #1a87e1, #2ba3f5)", margin: "0 auto", borderRadius: 2 }} />
        </div>

        <p style={{ color: "#5a7090", lineHeight: 1.85, fontSize: 16, marginBottom: 20 }}>
          <strong style={{ color: "#1a87e1", fontSize: 17 }}>MediCareX</strong> is a modern healthcare platform designed to make
          medicine access simple, safe, and fast. We provide high-quality pharmaceutical
          products, wellness items, and healthcare essentials — all in one place.
        </p>

        <p style={{ marginTop: 18, color: "#5a7090", lineHeight: 1.85, fontSize: 16 }}>
          Our goal is to combine technology with healthcare to give you a seamless
          pharmacy experience from ordering to delivery, ensuring your wellbeing is always our priority.
        </p>
      </section>

      {/* 🔷 MISSION + VISION */}
      <section style={{
        background: "var(--card-bg, #f5f9ff)",
        padding: "70px 20px"
      }}>
        <div style={{
          maxWidth: 1100,
          margin: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 25
        }}>

          <div style={card}>
            <h3>🎯 Our Mission</h3>
            <p>
              To provide safe, affordable, and fast access to medicines with a focus
              on customer trust and satisfaction.
            </p>
          </div>

          <div style={card}>
            <h3>👁️ Our Vision</h3>
            <p>
              To become Sri Lanka’s most trusted online pharmacy delivering healthcare
              solutions to every doorstep.
            </p>
          </div>

        </div>
      </section>

      {/* 🔷 WHY US */}
      <section style={{ padding: "90px 20px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h2 style={{ fontSize: 40, fontWeight: 700, color: "#0f2a5e", marginBottom: 20, letterSpacing: "-0.5px" }}>
            Why Choose MediCareX?
          </h2>
          <div style={{ width: 80, height: 4, background: "linear-gradient(90deg, #1a87e1, #2ba3f5)", margin: "0 auto", borderRadius: 2 }} />
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 24
        }}>
          <Feature icon={<ShieldCheck size={28} />} text="100% Genuine Medicines" desc="Verified and certified pharmaceutical products" />
          <Feature icon={<Truck size={28} />} text="Fast Delivery Service" desc="Quick and reliable home delivery" />
          <Feature icon={<HeartPulse size={28} />} text="Health & Wellness" desc="Complete healthcare essentials" />
          <Feature icon={<Users size={28} />} text="Trusted Customers" desc="Thousands of satisfied customers" />
        </div>
      </section>

      {/* 🔷 SERVICES */}
      <section style={{
        background: "linear-gradient(135deg, #f5f9ff 0%, #eef5ff 100%)",
        padding: "90px 20px"
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontSize: 40, fontWeight: 700, color: "#0f2a5e", marginBottom: 20, letterSpacing: "-0.5px" }}>
              Our Services
            </h2>
            <div style={{ width: 80, height: 4, background: "linear-gradient(90deg, #1a87e1, #2ba3f5)", margin: "0 auto", borderRadius: 2 }} />
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20
          }}>
            <ServiceCard text="💊 Online Medicine Ordering" />
            <ServiceCard text="🚚 Fast Home Delivery" />
            <ServiceCard text="🧾 Prescription Upload" />
            <ServiceCard text="🩺 Healthcare Essentials" />
          </div>
        </div>
      </section>

      {/* 🔷 CTA */}
      <section style={{
        padding: "100px 20px",
        textAlign: "center",
        background: "linear-gradient(135deg, #0f2a5e 0%, #1a87e1 100%)",
        color: "#fff",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 150, height: 150, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 200, height: 200, background: "rgba(255,255,255,0.03)", borderRadius: "50%" }} />
        
        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 style={{ fontSize: 42, fontWeight: 700, marginBottom: 16, letterSpacing: "-0.5px" }}>Your Health, Our Priority 💙</h2>
          <p style={{ color: "rgba(255,255,255,0.9)", marginTop: 12, fontSize: 18, maxWidth: 600, margin: "12px auto 0" }}>
            Experience smart pharmacy services with MediCareX today.
          </p>

          <a href="/customer/products" style={{
            marginTop: 32,
            display: "inline-block",
            background: "#fff",
            color: "#1a87e1",
            padding: "14px 32px",
            borderRadius: 12,
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 15,
            transition: "all 0.3s ease",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            cursor: "pointer",
            letterSpacing: "0.5px"
          }} 
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)"; }}>
            Shop Now
          </a>
        </div>
      </section>

    </div>
  );
}

const card = {
  background: "#fff",
  padding: 22,
  borderRadius: 12,
  boxShadow: "0 4px 18px rgba(0,0,0,0.05)",
  color: "#5a7090",
  lineHeight: 1.6
};

function MissionCard({ icon, title, desc }) {
  return (
    <div style={{
      background: "#fff",
      padding: 30,
      borderRadius: 16,
      border: "2px solid #e0eeff",
      transition: "all 0.3s ease",
      cursor: "pointer"
    }} 
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-8px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(26,135,225,0.15)"; }} 
    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 18px rgba(0,0,0,0.05)"; }}>
      <div style={{ marginBottom: 16, color: "#1a87e1" }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 22, fontWeight: 700, color: "#0f2a5e", marginBottom: 12 }}>{title}</h3>
      <p style={{ color: "#5a7090", lineHeight: 1.8 }}>
        {desc}
      </p>
    </div>
  );
}

function Feature({ icon, text, desc }) {
  return (
    <div style={{
      background: "#fff",
      padding: 28,
      borderRadius: 16,
      textAlign: "center",
      boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
      border: "1px solid #e0eeff",
      transition: "all 0.3s ease",
      cursor: "pointer"
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(26,135,225,0.12)"; e.currentTarget.style.borderColor = "#1a87e1"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.05)"; e.currentTarget.style.borderColor = "#e0eeff"; }}>
      <div style={{ marginBottom: 14, color: "#1a87e1" }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#0f2a5e", marginBottom: 8 }}>{text}</div>
      <div style={{ fontSize: 13, color: "#7a8ba8", lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

function ServiceCard({ text }) {
  return (
    <div style={{
      background: "#fff",
      padding: 26,
      borderRadius: 16,
      textAlign: "center",
      fontSize: 16,
      fontWeight: 600,
      color: "#0f2a5e",
      boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
      border: "1px solid #e0eeff",
      transition: "all 0.3s ease",
      cursor: "pointer"
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(26,135,225,0.12)"; e.currentTarget.style.borderColor = "#1a87e1"; e.currentTarget.style.background = "#f5f9ff"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.05)"; e.currentTarget.style.borderColor = "#e0eeff"; e.currentTarget.style.background = "#fff"; }}>
      {text}
    </div>
  );
}