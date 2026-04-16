import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

/* ================== AUTH PAGES ================== */
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import CustomerDashboard from "./pages/customer/CustomerDashboard"; //to use for testings

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
import AccountRequests from "./pages/admin/AccountRequests";
import SearchAnalytics from './pages/admin/SearchAnalytics';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ========== PUBLIC AUTH ROUTES ========== */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth" element={<Navigate to="/login" replace />} /> 
        <Route path="/customer" element={<CustomerDashboard />} /> 

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

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
          <Route path="account-requests" element={<AccountRequests />} />
          <Route path="search-analytics" element={<SearchAnalytics />} />
        </Route>

        {/* ========== 404 - NOT FOUND ========== */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}