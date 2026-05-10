import React from "react";
import { ShieldCheck, Truck, HeartPulse, Users } from "lucide-react";

const FONT = { display: "'Playfair Display', serif", body: "'DM Sans', sans-serif" };

export default function About() {
  return (
    <div style={{ fontFamily: FONT.body }}>

      {/* 🔷 HERO */}
      <section style={{
        background: "linear-gradient(135deg, #0f2a5e 0%, #1a87e1 100%)",
        padding: "90px 20px",
        textAlign: "center",
        color: "#fff"
      }}>
        <h1 style={{
          fontFamily: FONT.display,
          fontSize: 44,
          fontWeight: 700,
          marginBottom: 10
        }}>
          About MediCareX
        </h1>

        <p style={{ opacity: 0.9, fontSize: 16 }}>
          Your trusted digital pharmacy delivering care, convenience, and confidence.
        </p>
      </section>

      {/* 🔷 ABOUT */}
      <section style={{ padding: "70px 20px", maxWidth: 1100, margin: "auto" }}>
        <h2 style={{ fontSize: 30, marginBottom: 15 }}>Who We Are</h2>

        <p style={{ color: "#5a7090", lineHeight: 1.7 }}>
          <strong>MediCareX</strong> is a modern healthcare platform designed to make
          medicine access simple, safe, and fast. We provide high-quality pharmaceutical
          products, wellness items, and healthcare essentials — all in one place.
        </p>

        <p style={{ marginTop: 12, color: "#5a7090", lineHeight: 1.7 }}>
          Our goal is to combine technology with healthcare to give you a seamless
          pharmacy experience from ordering to delivery.
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
      <section style={{ padding: "70px 20px", maxWidth: 1100, margin: "auto" }}>
        <h2 style={{ textAlign: "center", marginBottom: 40 }}>
          Why Choose MediCareX?
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 20
        }}>
          <Feature icon={<ShieldCheck size={22} />} text="100% Genuine Medicines" />
          <Feature icon={<Truck size={22} />} text="Fast Delivery Service" />
          <Feature icon={<HeartPulse size={22} />} text="Health & Wellness Products" />
          <Feature icon={<Users size={22} />} text="Trusted by Customers" />
        </div>
      </section>

      {/* 🔷 SERVICES */}
      <section style={{
        background: "var(--card-bg, #f5f9ff)",
        padding: "70px 20px"
      }}>
        <div style={{ maxWidth: 1100, margin: "auto" }}>
          <h2 style={{ textAlign: "center", marginBottom: 40 }}>
            Our Services
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20
          }}>
            <div style={card}>💊 Online Medicine Ordering</div>
            <div style={card}>🚚 Home Delivery</div>
            <div style={card}>🧾 Prescription Upload</div>
            <div style={card}>🩺 Healthcare Essentials</div>
          </div>
        </div>
      </section>

      {/* 🔷 CTA */}
      <section style={{
        padding: "70px 20px",
        textAlign: "center"
      }}>
        <h2>Your Health, Our Priority 💙</h2>
        <p style={{ color: "#5a7090", marginTop: 10 }}>
          Experience smart pharmacy services with MediCareX.
        </p>

        <a href="/customer/products" style={{
          marginTop: 20,
          display: "inline-block",
          background: "#1a87e1",
          color: "#fff",
          padding: "12px 26px",
          borderRadius: 10,
          textDecoration: "none",
          fontWeight: 600
        }}>
          Shop Now
        </a>
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

function Feature({ icon, text }) {
  return (
    <div style={{
      background: "#fff",
      padding: 20,
      borderRadius: 12,
      textAlign: "center",
      boxShadow: "0 4px 16px rgba(0,0,0,0.05)"
    }}>
      <div style={{ marginBottom: 10, color: "#1a87e1" }}>{icon}</div>
      <div>{text}</div>
    </div>
  );
}