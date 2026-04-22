import { FileText, Upload } from "lucide-react";

const C = {
  accentDark: "#0f2a5e",
};

const FONT = { display: "'Playfair Display', serif", body: "'DM Sans', sans-serif" };

export default function UploadPrescriptionSection({ onOpen }) {
  return (
    <section style={{
      padding: "72px 24px",
      background: "linear-gradient(135deg, #0f2a5e 0%, #1a87e1 100%)",
      textAlign: "center",
      fontFamily: FONT.body,
    }}>

      {/* Icon */}
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: "rgba(255,255,255,0.15)",
        border: "1.5px solid rgba(255,255,255,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px",
      }}>
        <FileText size={28} color="#ffffff" />
      </div>

      {/* Label */}
      <p style={{
        fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)",
        textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10,
      }}>
        Quick &amp; Easy
      </p>

      {/* Heading */}
      <h2 style={{
        fontFamily: FONT.display, fontSize: 32, fontWeight: 700,
        color: "#ffffff", margin: "0 0 14px",
      }}>
        Upload Prescription
      </h2>

      {/* Underline accent */}
      <div style={{
        width: 48, height: 3, borderRadius: 4,
        background: "rgba(255,255,255,0.45)",
        margin: "0 auto 20px",
      }} />

      {/* Subtitle */}
      <p style={{
        fontSize: 15, color: "rgba(255,255,255,0.75)",
        marginBottom: 36, lineHeight: 1.6,
      }}>
        Get medicines delivered to your home
      </p>

      {/* Button */}
      <button
        onClick={onOpen}
        style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "14px 40px",
          borderRadius: 12,
          fontSize: 15, fontWeight: 700,
          fontFamily: FONT.body,
          background: "#ffffff",
          color: C.accentDark,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
          transition: "opacity 0.15s, box-shadow 0.15s, transform 0.15s",
          letterSpacing: "0.02em",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.opacity = "0.92";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 10px 32px rgba(0,0,0,0.22)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.18)";
        }}
      >
        <Upload size={17} color={C.accentDark} />
        Upload Now
      </button>

    </section>
  );
}