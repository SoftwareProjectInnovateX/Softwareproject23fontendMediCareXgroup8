import CustomerNavbar from "../components/CustomerNavbar";
import CustomerFooter from "../components/CustomerFooter";
import { Outlet } from "react-router-dom";
import FloatingChat from "../components/FloatingChat";
import { DarkModeProvider, useDarkMode } from "../context/DarkModeContext";

function CustomerLayoutInner() {
  const { isDark } = useDarkMode();

  return (
    <div
      className="flex flex-col min-h-screen w-full"
      style={{ background: isDark ? "#0f172a" : "#ffffff" }}
    >
      <CustomerNavbar />
      <main className="flex-1 p-5 w-full">
        <Outlet />
      </main>
      <CustomerFooter />
      <FloatingChat />
    </div>
  );
}

export default function CustomerLayout() {
  return (
    <DarkModeProvider>
      <CustomerLayoutInner />
    </DarkModeProvider>
  );
}
