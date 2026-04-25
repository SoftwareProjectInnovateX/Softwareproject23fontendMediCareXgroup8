import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

/* AUTH */
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import RegisterSuccess from "./pages/auth/RegisterSuccess";

/* LAYOUTS */
import SupplierLayout from "./layouts/SupplierLayout";
import AdminLayout from "./layouts/AdminLayout";
import CustomerLayout from "./layouts/CustomerLayout";
import PharmacistLayout from "./layouts/PharmacistLayout";

/* SUPPLIER */
import Dashboard from "./pages/supplier/Dashboard";
import ProductCatalog from "./pages/supplier/ProductCatalog";
import PurchaseOrders from "./pages/supplier/PurchaseOrders";
import UpdateDelivery from "./pages/supplier/UpdateDelivery";
import Settings from "./pages/supplier/Settings";
import InvoicePayments from "./pages/supplier/InvoicePayments";
import RestockAlert from "./pages/supplier/RestockAlert";

/* ADMIN */
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
import AdminProductApproval from './pages/admin/AdminProductApproval';

/* CUSTOMER */
import HomePage from "./pages/customer/HomePage";
import ProductsPage from "./pages/customer/ProductsPage";
import CartPage from "./pages/customer/CartPage";
import CheckoutPage from "./pages/customer/Checkout";
import OrdersPage from "./pages/customer/OrdersPage";
import BrandsPage from "./pages/customer/BrandsPage";
import ContactPage from "./pages/customer/ContactPage";
import PrescriptionPage from "./pages/customer/PrescriptionPage";
import ReturnPage from "./pages/customer/ReturnPage";
import CustomerProfilePage from "./pages/customer/CustomerProfilePage";
import Checkout from './pages/customer/Checkout';
import Success from './pages/customer/Success';
import Cancel from './pages/customer/Cancel';

/* PHARMACIST */

import AddProductForm from "./pages/pharmacist/Addproductform";
import MyProducts from "./pages/pharmacist/MyProducts";
import Prescriptions from "./pages/pharmacist/Prescriptions";
import Orders from "./pages/pharmacist/Orders";
import Returns from "./pages/pharmacist/Returns";
import BrandsManagementPage from './pages/pharmacist/BrandsManagementPage';
import MessagesPage from './pages/pharmacist/MessagesPage';
import PharmacistDashboard from "./pages/pharmacist/PharmacistDashboard";
import PharmacistVerification from "./pages/pharmacist/PharmacistVerification";
import PharmacistDispensing from "./pages/pharmacist/PharmacistDispensing";
import PharmacistPatients from "./pages/pharmacist/PharmacistPatients";
import PharmacistInventory from "./pages/pharmacist/PharmacistInventory";
import PharmacistDrugLookup from "./pages/pharmacist/PharmacistDrugLookup";
import PharmacistReports from "./pages/pharmacist/PharmacistReports";
import PharmacistNotifications from "./pages/pharmacist/PharmacistNotifications";
import PharmacistSettings from "./pages/pharmacist/PharmacistSettings";
import PharmacistNewRxEntry from "./pages/pharmacist/PharmacistNewRxEntry";
import PharmacistDispensedToday from "./pages/pharmacist/PharmacistDispensedToday";
import PharmacistExpiringInventory from "./pages/pharmacist/PharmacistExpiringInventory";
import PharmacistNewPatients from "./pages/pharmacist/PharmacistNewPatients";
import PharmacistLowStock from "./pages/pharmacist/PharmacistLowStock";


// ── My Route Constants ────────────────────────────────────────────────────────
const ROUTES = {
  HOME:             "/",
  CHECKOUT:         "/checkout",
  CHECKOUT_SUCCESS: "/customer/checkout/success",
  CHECKOUT_CANCEL:  "/customer/checkout/cancel",
};

export default function App() {
  return (
    <Routes>

      {/* AUTH */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/register-success" element={<RegisterSuccess />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* SUPPLIER */}
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

      {/* ADMIN */}
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
        <Route path="adminproductapproval" element={<AdminProductApproval />} />
      </Route>

      {/* CUSTOMER */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="checkout/success" element={<Success />} />
        <Route path="checkout/cancel" element={<Cancel />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="brands" element={<BrandsPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="prescription" element={<PrescriptionPage />} />
        <Route path="returns" element={<ReturnPage />} />
        <Route path="/customer/profile" element={<CustomerProfilePage />} />
      </Route>

      {/* PHARMACIST */}
      <Route
        path="/pharmacist"
        element={
          <ProtectedRoute allowedRoles={["pharmacist"]}>
            <PharmacistLayout />
          </ProtectedRoute>
        }
      >
        
        <Route path="add-product" element={<AddProductForm />} />
        <Route path="my-products" element={<MyProducts />} />
        <Route path="prescriptions" element={<Prescriptions />} />
        <Route path="orders" element={<Orders />} />
        
        <Route path="returns" element={<Returns />} />
        <Route path="/pharmacist/brands" element={<BrandsManagementPage />} />
        <Route path="/pharmacist/messages" element={<MessagesPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PharmacistDashboard />} />
          <Route path="verification/:id" element={<PharmacistVerification />} />
          <Route path="dispensing" element={<PharmacistDispensing />} />
          <Route path="patients" element={<PharmacistPatients />} />
          <Route path="inventory" element={<Products />} />
          <Route path="lookup" element={<PharmacistDrugLookup />} />
          <Route path="reports" element={<PharmacistReports />} />
          <Route path="notifications" element={<PharmacistNotifications />} />
          <Route path="settings" element={<PharmacistSettings />} />
          <Route path="new-rx" element={<PharmacistNewRxEntry />} />
          <Route path="dispensed-today" element={<PharmacistDispensedToday />} />
          <Route path="expiring-inventory" element={<PharmacistExpiringInventory />} />
          <Route path="new-patients" element={<PharmacistNewPatients />} />
          <Route path="low-stock" element={<PharmacistLowStock />} />
          
        
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  );
}