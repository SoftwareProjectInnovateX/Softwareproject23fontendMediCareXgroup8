import { Routes, Route } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import FinancialAnalytics from "./pages/admin/FinancialAnalytics";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Suppliers from "./pages/admin/Suppliers";
import Products from "./pages/admin/Products";
import Analytics from "./pages/admin/Analytics";
import Notifications from "./pages/admin/Notifications";
import UserManagement from "./pages/admin/UserManagement";

function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/admin/suppliers" element={<Suppliers />} />
        <Route path="/admin/products" element={<Products />} />
        <Route path="/admin/financialAnalytics" element={<FinancialAnalytics/>} />
        <Route path="/admin/analytics" element={<Analytics />} />
        <Route path="/admin/notifications" element={<Notifications />} />
        <Route path="/admin/usermanagement" element={<UserManagement />} />

      </Route>
    </Routes>
  );
}

export default App;
