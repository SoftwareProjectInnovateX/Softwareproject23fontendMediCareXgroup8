import CustomerNavbar from "../components/CustomerNavbar";
import CustomerFooter from "../components/CustomerFooter";
import { Outlet } from "react-router-dom";

export default function CustomerLayout() {
  return (
    <div className="flex flex-col min-h-screen w-full">

      {/* Top Navbar */}
      <CustomerNavbar />

      {/* Page Content */}
      <main className="flex-1 p-5 w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <CustomerFooter />

    </div>
  );
}