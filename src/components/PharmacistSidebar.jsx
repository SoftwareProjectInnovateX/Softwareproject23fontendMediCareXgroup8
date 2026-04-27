import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AlertContext } from '../layouts/PharmacistLayout';
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
  RotateCcw,
  Package,
  PlusCircle,
  Tag,
  Layers,
  MessageSquare,
} from 'lucide-react';

const PharmacistSidebar = () => {
  const navigate = useNavigate();
  const { unreadAlerts, pendingRxCount } = useContext(AlertContext);

  const handleLogout = () => {
    navigate('/login');
  };

  const navItems = [
    { path: '/pharmacist/dashboard',     name: 'Dashboard',      icon: LayoutDashboard },
    { path: '/pharmacist/prescriptions', name: 'Prescriptions',  icon: FileText, badge: pendingRxCount > 0 ? pendingRxCount.toString() : null },
    { path: '/pharmacist/orders',        name: 'Orders',         icon: Package },
    { path: '/pharmacist/dispensing',    name: 'Dispensing',     icon: Pill },
    { path: '/pharmacist/patients',      name: 'Patients',       icon: Users },
    { path: '/pharmacist/inventory',     name: 'Inventory',      icon: Archive },
    { path: '/pharmacist/lookup',        name: 'Drug Lookup',    icon: Search },
    { path: '/pharmacist/reports',       name: 'Reports',        icon: BarChart2 },
    { path: '/pharmacist/my-products',   name: 'My Products',    icon: Layers },
    { path: '/pharmacist/add-product',   name: 'Add Product',    icon: PlusCircle },
    { path: '/pharmacist/brands',        name: 'Add Brand',      icon: Tag },
    { path: '/pharmacist/messages',      name: 'Messages',       icon: MessageSquare, dot: false },
    { path: '/pharmacist/notifications', name: 'Notifications',  icon: Bell, dot: unreadAlerts > 0 },
  ];

  return (
    <div className="w-64 bg-[#0b5ed7] text-white flex flex-col h-screen fixed left-0 top-0 transition-all duration-300 shadow-2xl">
      {/* Logo */}
      <div className="h-[70px] flex items-center px-6 bg-[#084298] border-b border-indigo-900/30">
        <span className="text-3xl font-black tracking-wider antialiased text-white drop-shadow-sm">
          MediCareX
        </span>
      </div>

      {/* Navigation - Stretched to fill height */}
      <div className="flex-1 flex flex-col justify-between py-4 px-3 scrollbar-hide">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-[#06357a] text-white font-black shadow-lg shadow-black/20 scale-[1.02]'
                    : 'hover:bg-[#084298] text-blue-100 hover:text-white font-semibold'
                }`
              }
            >
              <div className="flex items-center gap-3.5">
                <item.icon className="w-5 h-5 opacity-90" />
                <span className="text-[14.5px] tracking-tight">{item.name}</span>
              </div>
              {item.badge && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-md">
                  {item.badge}
                </span>
              )}
              {item.dot && (
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shadow-md shadow-red-500/50" />
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PharmacistSidebar;