import { useTheme } from "../context/ThemeContext";
import CustomerNavbar from "../components/CustomerNavbar";
import CustomerFooter from "../components/CustomerFooter";
import { Outlet } from "react-router-dom";
import FloatingChat from "../components/FloatingChat";

export default function CustomerLayout() {
  const { isDarkMode } = useTheme();

  return (
    <div 
      className={`flex flex-col min-h-screen w-full ${isDarkMode ? 'dark' : ''}`}
      style={{ 
        background: 'var(--bg-primary)', 
        color: 'var(--text-primary)',
        transition: 'background-color 0.3s ease, color 0.3s ease'
      }}
    >

      {/* Top Navbar */}
      <CustomerNavbar />

      {/* Page Content */}
      <main className="flex-1 p-5 w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <CustomerFooter />
      <FloatingChat />
    </div>
  );
}