import React, { useState, createContext, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import PharmacistSidebar from '../components/PharmacistSidebar';
import PharmacistHeader from '../components/PharmacistHeader';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const AlertContext = createContext();

const PharmacistLayout = () => {
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
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
        name: 'Pharmacist',
        role: 'Pharmacist',
        avatarUrl: '',
        isActive: true
     };
  });
  const [pendingRxCount, setPendingRxCount] = useState(0);

  const updateQueueCount = () => {
     import('../services/pharmacistService').then(({ getPrescriptions }) => {
        getPrescriptions().then(qs => {
           const count = qs.filter(q => q.status === 'In Review' || q.status === 'New').length;
           setPendingRxCount(count);
           // Simple unread check: if there are pending Rxs and they haven't been checked recently
           const lastViewed = localStorage.getItem('pharmacist_notif_viewed_at');
           if (!lastViewed || count > 0) {
              setUnreadAlerts(count > 0 ? count : 0);
           }
        }).catch(console.error);
     });
  };

  useEffect(() => {
     updateQueueCount();

     // Listen for unread messages in real-time
     const q = query(collection(db, 'contactMessages'), where('status', '==', 'unread'));
     const unsubscribeMessages = onSnapshot(q, (snapshot) => {
        setUnreadMessages(snapshot.docs.length);
     });
     
     // Fetch actual profile from backend to replace hardcoded values
     import('../services/pharmacistService').then(({ getPharmacistProfile }) => {
        getPharmacistProfile().then(data => {
           if (data && data.profile) {
              setUserProfile(prev => {
                 const updated = {
                    ...prev,
                    name: data.profile.name || prev.name,
                    role: data.profile.role || prev.role,
                    avatarUrl: data.profileImage || prev.avatarUrl
                 };
                 localStorage.setItem('medicarex_pharmacist_profile', JSON.stringify(updated));
                 return updated;
              });
           }
        }).catch(err => console.error("Failed to fetch pharmacist profile:", err));
     });

     return () => unsubscribeMessages();
  }, []);

  return (
    <AlertContext.Provider value={{ unreadAlerts, setUnreadAlerts, unreadMessages, pendingRxCount, updateQueueCount, userProfile, setUserProfile }}>
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
