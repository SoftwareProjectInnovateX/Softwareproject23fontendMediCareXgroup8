import { Outlet } from "react-router-dom";
import PharmacistSidebar from "../components/PharmacistSidebar";
import PharmacistHeader from "../components/PharmacistHeader";

export default function PharmacistLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f1f5f9" }}>

      {/* White sidebar */}
      <PharmacistSidebar />

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <header style={{
          background: "#ffffff",
          borderBottom: "1px solid rgba(26,135,225,0.18)",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          boxShadow: "0 1px 8px rgba(26,135,225,0.07)",
        }}>
          <PharmacistHeader />
        </header>

        {/* Page content */}
        <main style={{
          flex: 1,
          padding: "32px",
          overflowY: "auto",
          background: "#f1f5f9",
        }}>
          <Outlet />
        </main>

        {/* Footer */}
        <footer style={{
          background: "#ffffff",
          borderTop: "1px solid rgba(26,135,225,0.18)",
          textAlign: "center",
          padding: "14px",
          fontSize: 13,
          color: "#94a3b8",
          fontWeight: 500,
        }}>
          © 2026 MediCareX Pharmacy System. All rights reserved.
        </footer>

      </div>
    </div>
  );
}