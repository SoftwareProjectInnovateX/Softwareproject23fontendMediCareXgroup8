import SidebarSUP from "../components/SidebarSUP";
import HeaderSUP from "../components/HeaderSUP";
import { Outlet } from "react-router-dom";

export default function SupplierLayout() {
  return (
    <div style={{ display: "flex" }}>
      <SidebarSUP />

      <div style={{ marginLeft: "240px", width: "100%" }}>
        <HeaderSUP />
        <main style={{ padding: "20px" , paddingTop: "90px" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
