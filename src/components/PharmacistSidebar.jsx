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
  ShieldPlus,
  LogOut
} from 'lucide-react';

const PharmacistSidebar = () => {
  const navigate = useNavigate();
  const { unreadAlerts, pendingRxCount } = useContext(AlertContext);

  const handleLogout = () => {
    navigate('/login');
  };

  const navItems = [
    { path: '/pharmacist/dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { path: '/pharmacist/prescriptions', name: 'Prescriptions', icon: FileText, badge: pendingRxCount > 0 ? pendingRxCount.toString() : null },
    { path: '/pharmacist/dispensing', name: 'Dispensing', icon: Pill },
    { path: '/pharmacist/patients', name: 'Patients', icon: Users },
    { path: '/pharmacist/inventory', name: 'Inventory', icon: Archive },
    { path: '/pharmacist/lookup', name: 'Drug Lookup', icon: Search },
    { path: '/pharmacist/alerts', name: 'Alerts', icon: Bell, dot: unreadAlerts > 0 },
    { path: '/pharmacist/reports', name: 'Reports', icon: BarChart2 },
  ];

  return (
    <div className="w-64 bg-[#0b5ed7] text-white flex flex-col h-screen fixed left-0 top-0 transition-all duration-300">
      {/* Logo Area */}
      <div className="h-[70px] flex items-center justify-center bg-[#084298]">
        <span className="text-2xl font-black tracking-widest">MediCareX</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center justify-between px-6 py-3 transition-colors duration-200 ${
                isActive 
                  ? 'bg-[#06357a] text-white font-medium' 
                  : 'hover:bg-[#084298] text-white'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </div>
            {item.badge && (
               <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                 {item.badge}
               </span>
            )}
            {item.dot && (
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
            )}
          </NavLink>
        ))}
      </div>

      {/* Footer / PharmacistSettings */}
      <div className="border-t border-blue-400/40 p-3">
        <NavLink
            to="/pharmacist/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive 
                  ? 'bg-[#06357a] text-white font-medium' 
                  : 'hover:bg-[#084298] text-white'
              }`
            }
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
        </NavLink>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-white rounded-lg hover:bg-red-500/80 transition-colors duration-200 bg-transparent border-none mt-1"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default PharmacistSidebar;

