import React, { useState, createContext } from 'react';
import { Outlet } from 'react-router-dom';
import PharmacistSidebar from '../components/PharmacistSidebar';
import PharmacistHeader from '../components/PharmacistHeader';

export const AlertContext = createContext();

const PharmacistLayout = () => {
  const [unreadAlerts, setUnreadAlerts] = useState(4);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(() => {
     try {
        const saved = localStorage.getItem('medicarex_pharmacist_profile');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.isActive === undefined) parsed.isActive = true;
            return parsed;
        }
     } catch {}
     return {
        name: 'Sarah Jenkins',
        role: 'Lead Pharmacist',
        avatarUrl: '',
        isActive: true
     };
  });
  const [pendingRxCount, setPendingRxCount] = useState(0);

  const updateQueueCount = () => {
     import('../services/pharmacistService').then(({ getPrescriptions }) => {
        getPrescriptions().then(qs => {
           setPendingRxCount(qs.filter(q => q.status === 'In Review' || q.status === 'New').length);
        }).catch(console.error);
     });
  };

  React.useEffect(() => {
     updateQueueCount();
  }, []);

  return (
    <AlertContext.Provider value={{ unreadAlerts, setUnreadAlerts, pendingRxCount, updateQueueCount, userProfile, setUserProfile }}>
      <div className="flex bg-[#f5f9ff] min-h-screen font-sans transition-colors duration-200">

        {/* Mobile overlay backdrop */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-[150] md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        <PharmacistSidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

        {/* Main content — no left margin on mobile, ml-64 on desktop */}
        <div className="flex-1 flex flex-col min-h-screen md:ml-64">
          <PharmacistHeader setIsMobileOpen={setIsMobileOpen} />
          <div className="flex-1 overflow-y-auto w-full p-4 md:p-6 relative">
             <Outlet />
          </div>
        </div>
      </div>
    </AlertContext.Provider>
  );
};

export default PharmacistLayout;
