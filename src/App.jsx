import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

/* ================== AUTH PAGES ================== */
import Auth from "./pages/auth/Auth";

/* ================== LAYOUTS ================== */
import SupplierLayout from "./layouts/SupplierLayout";
import AdminLayout from "./layouts/AdminLayout";

/* ================== SUPPLIER PAGES ================== */
import Dashboard from "./pages/supplier/Dashboard";
import ProductCatalog from "./pages/supplier/ProductCatalog";
import PurchaseOrders from "./pages/supplier/PurchaseOrders";
import UpdateDelivery from "./pages/supplier/UpdateDelivery";
import Settings from "./pages/supplier/Settings";
import InvoicePayments from "./pages/supplier/InvoicePayments";
import RestockAlert from "./pages/supplier/RestockAlert";

/* ================== ADMIN PAGES ================== */
import AdminDashboard from "./pages/admin/AdminDashboard";
import Suppliers from "./pages/admin/Suppliers";
import Products from "./pages/admin/Products";
import FinancialAnalytics from "./pages/admin/FinancialAnalytics";
import Analytics from "./pages/admin/Analytics";
import Notifications from "./pages/admin/Notifications";
import UserManagement from "./pages/admin/UserManagement";
import OrderManagement from "./pages/admin/OrderManagement";
import AdminPayments from "./pages/admin/AdminPayments";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ========== PUBLIC AUTH ROUTES ========== */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/register" element={<Navigate to="/auth" replace />} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/auth" replace />} />

        {/* ========== SUPPLIER ROUTES (Protected) ========== */}
        <Route
          path="/supplier"
          element={
            <ProtectedRoute allowedRoles={["supplier"]}>
              <SupplierLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="product-catalog" element={<ProductCatalog />} />
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="update-delivery" element={<UpdateDelivery />} />
          <Route path="settings" element={<Settings />} />
          <Route path="invoices" element={<InvoicePayments />} />
          <Route path="restock-alert" element={<RestockAlert />} />
        </Route>

        {/* ========== ADMIN ROUTES (Protected) ========== */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="products" element={<Products />} />
          <Route path="financialAnalytics" element={<FinancialAnalytics />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="usermanagement" element={<UserManagement />} />
          <Route path="ordermanagement" element={<OrderManagement />} />
          <Route path="adminPayments" element={<AdminPayments />} />
        </Route>

        {/* ========== 404 - NOT FOUND ========== */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </AuthProvider>
  );
}