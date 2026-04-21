import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  Activity,
  ArrowRight,
  BookOpen,
  Inbox
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PharmacistDashboard = () => {
  const navigate = useNavigate();
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [dailyRevenue, setDailyRevenue] = useState(0);

  useEffect(() => {
    try {
      const savedDate = localStorage.getItem('medicarex_revenue_date');
      const today = new Date().toDateString();
      if (savedDate === today) {
        const savedRev = localStorage.getItem('medicarex_daily_revenue');
        if (savedRev) setDailyRevenue(parseFloat(savedRev));
      }
    } catch(e) {}
  }, []);

  const currentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">PharmacistDashboard Overview</h1>
          <p className="text-slate-500 mt-1">Welcome back, here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 shadow-sm">
          <Calendar className="w-4 h-4" />
          {currentDate}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4">
        {/* Card 1 */}
        <div 
          className="card shadow-none hover:shadow-md border border-slate-100 border-l-4 border-l-emerald-500 relative overflow-hidden group cursor-pointer transition-all"
          onClick={() => navigate('/pharmacist/dispensed-today')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Dispensed Today</p>
              <h2 className="text-3xl font-bold text-slate-800 mt-1">4</h2>
            </div>
            <div className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
              +12%
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform">
             <FileText className="w-20 h-20 -mr-4 -mb-4 text-emerald-500" />
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
            <div className="bg-emerald-500 w-3/4 h-full"></div>
          </div>
        </div>

        {/* Card 2 */}
        <div 
          className="card shadow-none hover:shadow-md border border-slate-100 cursor-pointer transition-all flex flex-col justify-between" 
          onClick={() => navigate('/pharmacist/new-patients')}
        >
          <div className="flex justify-between items-start">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg flex items-center justify-center">
              <Inbox className="w-6 h-6" strokeWidth={2} />
            </div>
            <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
              +12 new
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">New PharmacistPatients</p>
            <h2 className="text-4xl font-bold text-slate-800 mt-1">24</h2>
            <p className="text-[13px] text-slate-400 mt-2 font-medium">Last registered: 4 mins ago</p>
          </div>
        </div>

        {/* Card 3 */}
        <div 
          className="card shadow-none hover:shadow-md border border-slate-100 border-l-4 border-l-orange-500 transition-all cursor-pointer relative overflow-hidden group"
          onClick={() => navigate('/pharmacist/low-stock')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Low Stock Items</p>
              <h2 className="text-3xl font-bold text-slate-800 mt-1">4</h2>
            </div>
            <div className="bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full text-xs font-bold border border-orange-100">
              Alert
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-6 rounded-full overflow-hidden relative">
            <div className="bg-orange-500 w-1/3 h-full absolute"></div>
          </div>
        </div>

        {/* Card 4 */}
        <div 
          className="card shadow-none hover:shadow-md border border-slate-100 border-l-4 border-l-red-500 transition-all cursor-pointer relative overflow-hidden group"
          onClick={() => navigate('/pharmacist/expiring-inventory')}
        >
           <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Expiring Soon</p>
              <h2 className="text-3xl font-bold text-slate-800 mt-1">3</h2>
            </div>
            <div className="bg-red-50 text-red-600 px-2 py-1 rounded-full text-xs font-bold border border-red-100">
              Action Req.
            </div>
          </div>
           <div className="mt-5 flex gap-1">
             <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm border border-white z-20" title="Amoxicillin">A</span>
             <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm border border-white -ml-2 z-10" title="Metformin">M</span>
             <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm border border-white -ml-2" title="Atorvastatin">A</span>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* Left Column (PharmacistAlerts & PharmacistVerification) */}
        <div className="col-span-2 space-y-6">


          {/* Today's Business Circle Chart */}
          <div className="card shadow-sm pt-6 pb-6">
            <h3 className="text-base font-bold text-slate-800 mb-6">Today's Revenue Overview</h3>
            <div className="flex items-center justify-center relative">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-slate-100" />
                {/* 100% PharmacistPrescriptions for now since all are from dispensing */}
                <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" fill="transparent" strokeDasharray="502" strokeDashoffset={dailyRevenue > 0 ? "0" : "502"} className="text-blue-600" strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-slate-800">Rs. {dailyRevenue.toFixed(0)}</span>
                <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded mt-1">+14% vs Yes.</span>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-6 pt-4 border-t border-slate-100">
               <div className="text-center">
                 <div className="flex items-center justify-center gap-2 mb-1">
                   <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                   <span className="text-xs font-bold text-slate-500">PharmacistPrescriptions</span>
                 </div>
                 <span className="font-bold text-slate-800">Rs. {dailyRevenue.toFixed(0)}</span>
               </div>
               <div className="text-center opacity-50">
                 <div className="flex items-center justify-center gap-2 mb-1">
                   <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                   <span className="text-xs font-bold text-slate-500">OTC</span>
                 </div>
                 <span className="font-bold text-slate-800">Rs. 0</span>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column (Recent Activity & Clinic Reference) */}
        <div className="space-y-6">
          <div className="card pt-5 pb-2">
            <h3 className="text-base font-bold text-slate-800 mb-6">Recent Activity</h3>
            
            <div className="relative border-l-2 border-slate-100 ml-3 space-y-6 pb-4">
              <div className="relative pl-6">
                <span className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[7px] top-1 border-2 border-white"></span>
                <p className="text-xs text-slate-400 font-medium">10:05 AM</p>
                <p className="text-sm text-slate-700 mt-0.5">Rx #8892 <span className="text-emerald-600 font-semibold">Verified</span> by Dr. Sarah L.</p>
              </div>
              <div className="relative pl-6">
                <span className="absolute w-3 h-3 bg-blue-400 rounded-full -left-[7px] top-1 border-2 border-white"></span>
                <p className="text-xs text-slate-400 font-medium">09:55 AM</p>
                <p className="text-sm text-slate-700 mt-0.5">PharmacistInventory Update: Amoxicillin batch #223 received.</p>
              </div>
              <div className="relative pl-6">
                <span className="absolute w-3 h-3 bg-amber-400 rounded-full -left-[7px] top-1 border-2 border-white"></span>
                <p className="text-xs text-slate-400 font-medium">09:30 AM</p>
                <p className="text-sm text-slate-700 mt-0.5">Dispensed Rx #8890 to Patient J. Doe.</p>
              </div>
              <div className="relative pl-6">
                <span className="absolute w-3 h-3 bg-slate-300 rounded-full -left-[7px] top-1 border-2 border-white"></span>
                <p className="text-xs text-slate-400 font-medium">09:15 AM</p>
                <p className="text-sm text-slate-700 mt-0.5">Shift started for Tech Team A.</p>
              </div>
              
              {/* Expanding Section */}
              <div className={`space-y-6 overflow-hidden transition-all duration-300 ${showAllLogs ? 'max-h-[500px] mt-6 opacity-100' : 'max-h-0 opacity-0 mt-0'}`}>
                <div className="relative pl-6">
                  <span className="absolute w-3 h-3 bg-red-400 rounded-full -left-[7px] top-1 border-2 border-white"></span>
                  <p className="text-xs text-slate-400 font-medium">08:45 AM</p>
                  <p className="text-sm text-slate-700 mt-0.5">Alert Flag: Severe interaction prevented (Rx #8889).</p>
                </div>
                <div className="relative pl-6">
                  <span className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[7px] top-1 border-2 border-white"></span>
                  <p className="text-xs text-slate-400 font-medium">08:30 AM</p>
                  <p className="text-sm text-slate-700 mt-0.5">System startup and daily sync completed successfully.</p>
                </div>
                <div className="relative pl-6">
                  <span className="absolute w-3 h-3 bg-purple-400 rounded-full -left-[7px] top-1 border-2 border-white"></span>
                  <p className="text-xs text-slate-400 font-medium">08:15 AM</p>
                  <p className="text-sm text-slate-700 mt-0.5">Received 15 pending electronic prescriptions to queue.</p>
                </div>
                <div className="relative pl-6">
                  <span className="absolute w-3 h-3 bg-orange-400 rounded-full -left-[7px] top-1 border-2 border-white"></span>
                  <p className="text-xs text-slate-400 font-medium">Yesterday, 06:00 PM</p>
                  <p className="text-sm text-slate-700 mt-0.5">Store closed and end-of-day register balanced.</p>
                </div>
              </div>
            </div>
            
            <button 
               onClick={() => setShowAllLogs(!showAllLogs)}
               className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-800 mt-4 py-2 border-t border-slate-100 transition-colors"
            >
               {showAllLogs ? 'View Less Activity' : 'View All Log'}
            </button>
          </div>


        </div>

      </div>
    </div>
  );
};

export default PharmacistDashboard;

