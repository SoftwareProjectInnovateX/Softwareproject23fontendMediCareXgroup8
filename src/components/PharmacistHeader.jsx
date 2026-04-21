import React, { useContext } from 'react';
import { Search, Bell, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AlertContext } from '../layouts/PharmacistLayout';

const PharmacistHeader = () => {
  const navigate = useNavigate();
  const { unreadAlerts, userProfile } = useContext(AlertContext);

  const displayAvatar = userProfile?.avatarUrl || `https://ui-avatars.com/api/?name=${(userProfile?.name || 'Pharmacist').replace(' ', '+')}&background=ffffff&color=084298`;

  return (
    <div className="h-[70px] bg-[#9fbaf2] border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-10 transition-colors duration-200">
      {/* Title / Search */}
      <div className="flex-1 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search Rx#, Patient, or Drug..." 
            className="w-full pl-10 pr-4 py-2 bg-white/70 border-none rounded-lg text-sm text-gray-800 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4 pl-8">
        <button 
          onClick={() => navigate('/pharmacist/alerts')}
          className="text-gray-800 hover:text-black transition-colors relative p-2 rounded-full hover:bg-white/30"
        >
          <Bell className="w-5 h-5" />
          {unreadAlerts > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-white"></span>}
        </button>

        <button 
          onClick={() => navigate('/pharmacist/new-rx')}
          className="flex items-center gap-2 bg-[#084298] hover:bg-[#06357a] text-white rounded-md text-sm font-medium ml-2 px-4 py-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Rx Entry
        </button>

        <div className="flex items-center gap-3 border-l border-white/50 pl-6 ml-2">
          <div className="w-9 h-9 rounded-full bg-white/40 overflow-hidden flex items-center justify-center border border-white/50 shadow-sm">
            <img src={displayAvatar} alt="User" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 leading-tight">{userProfile?.name || 'Pharmacist'}</span>
            <span className="text-[10px] text-gray-700 font-black uppercase tracking-wider">{userProfile?.role || 'Pharmacist'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacistHeader;

