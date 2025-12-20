import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div style={{ marginLeft: "240px", width: "100%" }}>
        <Header />
        <main style={{ padding: "20px" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
