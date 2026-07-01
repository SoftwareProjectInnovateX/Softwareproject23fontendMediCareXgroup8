import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AlertContext } from '../layouts/PharmacistLayout';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Pill, 
  Users, 
  Archive, 
  Search, 
  Bell,
  BarChart2,
  Settings,
  LogOut,
  Package,
  PlusCircle,
  Tag,
  Layers,
  MessageSquare,
  Trophy,
} from 'lucide-react';

const PharmacistSidebar = () => {
  const navigate = useNavigate();
  const { unreadAlerts, pendingRxCount } = useContext(AlertContext);
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      navigate('/login');
    }
  };

  const navItems = [
    { path: '/pharmacist/dashboard',     name: 'Dashboard',      icon: LayoutDashboard },
    { path: '/pharmacist/prescriptions', name: 'Prescriptions',  icon: FileText, badge: pendingRxCount > 0 ? pendingRxCount.toString() : null },
    { path: '/pharmacist/orders',        name: 'Orders',         icon: Package },
    { path: '/pharmacist/dispensing',    name: 'Dispensing',     icon: Pill },
    { path: '/pharmacist/patients',      name: 'Patients',       icon: Users },
    { path: '/pharmacist/inventory',     name: 'Inventory',      icon: Archive },
    { path: '/pharmacist/lookup',        name: 'Drug Lookup',    icon: Search },
    { path: '/pharmacist/notifications', name: 'Notifications',  icon: Bell, dot: unreadAlerts > 0 },
    { path: '/pharmacist/reports',       name: 'Reports',        icon: BarChart2 },
    { path: '/pharmacist/loyalty',       name: 'Loyalty',        icon: Trophy },
  ];

  const managementItems = [
    { path: '/pharmacist/add-product',   name: 'Add Product',    icon: PlusCircle },
    { path: '/pharmacist/brands',        name: 'Add Brand',      icon: Tag },
    { path: '/pharmacist/my-products',   name: 'My Products',    icon: Layers },
    { path: '/pharmacist/messages',      name: 'Messages',       icon: MessageSquare, dot: false },
  ];

  const NavItem = ({ item }) => (
    <NavLink
      key={item.name}
      to={item.path}
      className={({ isActive }) =>
        `group flex items-center justify-between px-3 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-[#06357a] text-white font-medium shadow-sm'
            : 'text-blue-100 hover:bg-[#084298] hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-md transition-colors duration-200 ${
              isActive ? 'bg-white/15' : 'bg-transparent group-hover:bg-white/10'
            }`}>
              <item.icon className="w-4 h-4" />
            </div>
            <span className="text-sm tracking-wide">{item.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {item.badge && (
              <span className="bg-white text-[#0b5ed7] text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center leading-4">
                {item.badge}
              </span>
            )}
            {item.dot && (
              <span className="w-2 h-2 rounded-full bg-red-400 ring-2 ring-red-400/30" />
            )}
          </div>
        </>
      )}
    </NavLink>
  );

  return (
    <div className="w-64 bg-[#0b5ed7] text-white flex flex-col h-screen fixed left-0 top-0">

      {/* Logo + Settings & Logout top-right */}
      <div className="h-[70px] flex items-center justify-between px-5 bg-[#084298] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Pill className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-black tracking-wide text-white">
            MediCareX
          </span>
        </div>

        {/* Settings & Logout — top right */}
        <div className="flex items-center gap-1">
          <NavLink
            to="/pharmacist/settings"
            className={({ isActive }) =>
              `p-1.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`
            }
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </NavLink>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-blue-100 hover:bg-red-500/80 hover:text-white transition-all duration-200"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable nav */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-blue-400/30 scrollbar-track-transparent">

        {/* Main section */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-300/70 px-5 mb-1.5">
            Main
          </p>
          <nav className="space-y-0.5">
            {navItems.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div className="mx-5 border-t border-white/10 my-3" />

        {/* Management section */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-300/70 px-5 mb-1.5">
            Management
          </p>
          <nav className="space-y-0.5">
            {managementItems.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </nav>
        </div>
      </div>

      {/* Footer removed — Settings & Logout moved to top */}
    </div>
  );
};

export default PharmacistSidebar;