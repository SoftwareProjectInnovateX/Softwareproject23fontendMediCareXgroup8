import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Search, Bell, Plus, User, FileText, Pill, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AlertContext } from '../layouts/PharmacistLayout';
import { getPatients, getPrescriptions, getInventory } from '../services/pharmacistService';

const PharmacistHeader = () => {
  const navigate = useNavigate();
  const { unreadAlerts, userProfile } = useContext(AlertContext);

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [results, setResults] = useState({ patients: [], prescriptions: [], drugs: [] });
  const [isSearching, setIsSearching] = useState(false);
  
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const displayAvatar = userProfile?.avatarUrl || `https://ui-avatars.com/api/?name=${(userProfile?.name || 'Pharmacist').replace(' ', '+')}&background=ffffff&color=084298`;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Perform Search against real Firebase backend with 300ms debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults({ patients: [], prescriptions: [], drugs: [] });
      setIsDropdownOpen(false);
      return;
    }

    // Debounce — wait 300ms after user stops typing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const q = searchQuery.toLowerCase();

      try {
        const [pList, rxList, invList] = await Promise.all([
          getPatients().catch(() => []),
          getPrescriptions().catch(() => []),
          getInventory().catch(() => [])
        ]);

        const matchedPatients = pList.filter(p =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.phone && p.phone.toLowerCase().includes(q)) ||
          (p.id && p.id.toLowerCase().includes(q))
        ).slice(0, 3);

        const matchedRx = rxList.filter(rx =>
          (rx.patientName && rx.patientName.toLowerCase().includes(q)) ||
          (rx.id && `rx-${rx.id}`.toLowerCase().includes(q)) ||
          (rx.id && rx.id.toLowerCase().includes(q))
        ).slice(0, 3);

        const matchedDrugs = invList.filter(d => {
          const name = d.name || d.productName || '';
          return name.toLowerCase().includes(q) ||
            (d.category && d.category.toLowerCase().includes(q));
        }).slice(0, 3).map(d => ({
          ...d,
          name: d.name || d.productName || 'Unknown',
          stock: d.stock ?? d.qty ?? d.quantity ?? d.currentStock ?? 0
        }));

        setResults({ patients: matchedPatients, prescriptions: matchedRx, drugs: matchedDrugs });
        setIsDropdownOpen(true);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const handleResultClick = (targetType, targetValue) => {
    setSearchQuery('');
    setIsDropdownOpen(false);
    
    switch(targetType) {
      case 'patient':
        navigate('/pharmacist/patients', { state: { searchTarget: targetValue } });
        break;
      case 'prescription':
        navigate('/pharmacist/prescriptions', { state: { searchTarget: targetValue } });
        break;
      case 'drug':
        navigate('/pharmacist/drug-lookup', { state: { searchTarget: targetValue } });
        break;
      default:
        break;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
       // If they just press enter, try navigating to the first relevant page
       if (results.prescriptions.length > 0) {
         handleResultClick('prescription', results.prescriptions[0].id);
       } else if (results.patients.length > 0) {
         handleResultClick('patient', results.patients[0].id);
       } else if (results.drugs.length > 0) {
         handleResultClick('drug', results.drugs[0].name);
       }
    }
  };

  const hasResults = results.patients.length > 0 || results.prescriptions.length > 0 || results.drugs.length > 0;

  return (
    <div className="h-[70px] bg-[#9fbaf2] border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-[100] transition-colors duration-200">
      {/* Title / Search */}
      <div className="flex-1 max-w-2xl relative" ref={searchRef}>
        <div className="relative z-10 relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isSearching ? 'text-blue-500 animate-pulse' : 'text-gray-500'}`} />
          <input 
            type="text" 
            placeholder="Search Rx#, Patient, or Drug..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if(searchQuery.trim() && hasResults) setIsDropdownOpen(true); }}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 pr-4 py-2 bg-white/70 border-none rounded-lg text-sm text-gray-800 placeholder-gray-500 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
          />
        </div>

        {/* Global Search Autocomplete Dropdown */}
        {isDropdownOpen && hasResults && (
          <div className="absolute left-0 right-0 top-[110%] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="max-h-[70vh] overflow-y-auto py-2">
              
              {/* Prescriptions */}
              {results.prescriptions.length > 0 && (
                <div className="mb-2">
                  <h3 className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Rx Orders
                  </h3>
                  {results.prescriptions.map(rx => (
                    <div 
                      key={rx.id} 
                      onClick={() => handleResultClick('prescription', rx.id)}
                      className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors border-l-2 border-l-transparent hover:border-l-blue-500"
                    >
                      <div>
                        <span className="text-sm font-bold text-slate-800 block">#RX-{rx.id}</span>
                        <span className="text-xs text-slate-500">{rx.patientName}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rx.status === 'Completed' || rx.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {rx.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Patients */}
              {results.patients.length > 0 && (
                <div className="mb-2">
                  <h3 className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 flex items-center gap-2">
                    <User className="w-3 h-3" /> Patients
                  </h3>
                  {results.patients.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => handleResultClick('patient', p.name)}
                      className="px-4 py-2.5 hover:bg-emerald-50 cursor-pointer flex justify-between items-center transition-colors border-l-2 border-l-transparent hover:border-l-emerald-500"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: `#${p.avatarColor || '94a3b8'}`}}>
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-800 block">{p.name}</span>
                          <span className="text-xs text-slate-500">{p.id} • {p.phone || 'No phone'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Drugs */}
              {results.drugs.length > 0 && (
                <div>
                  <h3 className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 flex items-center gap-2">
                    <Pill className="w-3 h-3" /> Inventory
                  </h3>
                  {results.drugs.map(d => (
                    <div 
                      key={d.id} 
                      onClick={() => handleResultClick('drug', d.name)}
                      className="px-4 py-2.5 hover:bg-purple-50 cursor-pointer flex justify-between items-center transition-colors border-l-2 border-l-transparent hover:border-l-purple-500"
                    >
                      <div>
                        <span className="text-sm font-bold text-slate-800 block">{d.name}</span>
                        <span className="text-xs text-slate-500">{d.category}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        Stock: {d.stock}
                      </span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4 pl-8">
        <button 
          onClick={() => navigate('/pharmacist/notifications')}
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
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-white/40 overflow-hidden flex items-center justify-center border border-white/50 shadow-sm">
              <img src={displayAvatar} alt="User" className="w-full h-full object-cover" />
            </div>
            {userProfile?.isActive !== false && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 leading-tight">{userProfile?.name || 'Pharmacist'}</span>
            <span className="text-[10px] text-gray-700 font-black uppercase tracking-wider">{userProfile?.role || 'Pharmacist'}</span>
          </div>
        </div>

        {/* Global Quick Actions */}
        <div className="flex items-center gap-2 border-l border-white/50 pl-4 ml-4">
           {/* Settings */}
           <div className="relative group">
              <button 
                onClick={() => navigate('/pharmacist/settings')}
                className="p-2 rounded-xl hover:bg-white/40 transition-all text-gray-800 hover:text-blue-700 active:scale-95"
              >
                <Settings size={20} />
              </button>
              <div className="absolute right-0 top-full mt-3 hidden group-hover:flex bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-2xl z-[100] whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                 Settings
              </div>
           </div>

           {/* Logout */}
           <div className="relative group">
              <button 
                onClick={() => navigate('/login')}
                className="p-2 rounded-xl hover:bg-red-500/20 transition-all text-gray-800 hover:text-red-600 active:scale-95"
              >
                <LogOut size={20} />
              </button>
              <div className="absolute right-0 top-full mt-3 hidden group-hover:flex bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-2xl z-[100] whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                 Logout
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacistHeader;
