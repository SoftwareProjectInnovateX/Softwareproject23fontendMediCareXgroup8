import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getInventory } from '../../services/pharmacistService';
import { 
  FileText, 
  Calendar,
  Inbox
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PharmacistDashboard = () => {
  const navigate = useNavigate();
  const [showAllLogs, setShowAllLogs] = useState(false);
  
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [walkinRxRev, setWalkinRxRev] = useState(0);
  const [walkinOtcRev, setWalkinOtcRev] = useState(0);
  const [onlinePaidRev, setOnlinePaidRev] = useState(0);
  const [onlineCodRev, setOnlineCodRev] = useState(0);
  const [onlineRevCard, setOnlineRevCard] = useState(0);
  const [onlineRevBank, setOnlineRevBank] = useState(0);
  const [onlineRevPayHere, setOnlineRevPayHere] = useState(0);
  const [onlineRevCod, setOnlineRevCod] = useState(0);
  const [dispensedTodayCount, setDispensedTodayCount] = useState(0);
  const [physicalDispensedCount, setPhysicalDispensedCount] = useState(0);
  const [onlineDispensedCount, setOnlineDispensedCount] = useState(0);
  const [totalPatientsCount, setTotalPatientsCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [expiringItems, setExpiringItems] = useState([]);
  const [totalInventoryCount, setTotalInventoryCount] = useState(0);

  const fetchRevenues = async () => {
    try {
      const { getPatients, getDispensedHistory, getOnlineOrders } = await import('../../services/pharmacistService');
      
      const todayStr = new Date().toDateString();

      // 1. Fetch Total Patients
      const patients = await getPatients();
      const uniquePatients = patients.filter((patient, index, self) => 
         index === self.findIndex((p) => p.name?.toLowerCase() === patient.name?.toLowerCase())
      );
      setTotalPatientsCount(uniquePatients.length);

      // 2. Fetch Dispensing History for Today (Walk-in & Physical)
      const dispensedList = await getDispensedHistory();
      const todayDispensed = dispensedList.filter(item => item.dispensedDate === todayStr);
      
      setDispensedTodayCount(todayDispensed.length);
      
      let wRxRev = 0;
      let wOtcRev = 0;
      let dRev = 0;
      let dRevCard = 0;
      let dRevBank = 0;
      let dRevPayHere = 0;
      let dRevCod = 0;
      let onlineDispCount = 0;
      let physicalDispCount = 0;

      todayDispensed.forEach(d => {
         // Items verified through the queue have an rxId. 
         // We'll consider them "Online Prescriptions" / "System Prescriptions" for the dashboard.
         // Items from the physical Walk-in POS will lack an rxId.
         if (d.rxId) {
             onlineDispCount++;
             if (d.paymentStatus === 'Paid') {
                 const amt = parseFloat(d.total) || 0;
                 dRev += amt;
                 if (d.paymentMethod === 'Card Payment') dRevCard += amt;
                 else if (d.paymentMethod === 'Bank Transfer') dRevBank += amt;
                 else if (d.paymentMethod === 'PayHere') dRevPayHere += amt;
                 else if (d.paymentMethod === 'COD') dRevCod += amt;
                 else dRevCard += amt; // Default to Card if no method or pharmacist marked manual
             }
         } else {
             physicalDispCount++;
             if (d.paymentStatus === 'Paid') {
                 if (d.type === 'prescription' || d.id?.includes('RX')) {
                    wRxRev += (parseFloat(d.total) || 0);
                 } else {
                    wOtcRev += (parseFloat(d.total) || 0);
                 }
             }
         }
      });

      setDailyRevenue(dRev);
      setOnlineRevCard(dRevCard);
      setOnlineRevBank(dRevBank);
      setOnlineRevPayHere(dRevPayHere);
      setOnlineRevCod(dRevCod);
      setWalkinRxRev(wRxRev);
      setWalkinOtcRev(wOtcRev);
      setOnlineDispensedCount(onlineDispCount);
      setPhysicalDispensedCount(physicalDispCount);

      // 3. Fetch Online Orders
      const onlineOrders = await getOnlineOrders();
      const dispatchedOnline = onlineOrders.filter(o => {
         const orderDate = new Date(o.orderDate || o.timestamp).toDateString();
         return o.status === 'Dispatched' && orderDate === todayStr;
      });
      
      let paidRev = 0;
      let codRev = 0;
      dispatchedOnline.forEach(o => {
         if (o.paymentStatus === 'Paid') {
            paidRev += (parseFloat(o.total) || 0);
         } else if (o.paymentMethod === 'COD') {
            codRev += (parseFloat(o.total) || 0);
         }
      });
      
      setOnlinePaidRev(paidRev);
      setOnlineCodRev(codRev);

    } catch(e) {
       console.error("Dashboard data sync error:", e);
    }
  };

  const fetchInventoryData = async () => {
     try {
         let inv = await getInventory();
         
         setTotalInventoryCount(inv.length);
         
         const lowStock = inv.filter(item => {
            const qty = item.stock ?? item.qty ?? item.quantity ?? item.totalStock ?? item.currentStock ?? 0;
            return qty < 50;
         });
         setLowStockItems(lowStock);
         
         const expiringList = inv.filter(item => {
            const dateStr = item.expiryDate ?? item.expiry ?? item.expirationDate;
            if (!dateStr) return false;
            const expDate = new Date(dateStr);
            const in30Days = new Date();
            in30Days.setDate(in30Days.getDate() + 30);
            return expDate <= in30Days;
         });
         setExpiringItems(expiringList);
     } catch(e) {
         console.error("Error loading inventory from Firebase:", e);
         setLowStockItems([]);
         setExpiringItems([]);
         setTotalInventoryCount(0);
     }
  };

  useEffect(() => {
    fetchRevenues();
    fetchInventoryData();
    const handleUpdate = () => {
       fetchRevenues();
       fetchInventoryData();
    };
    window.addEventListener('revenue_updated', handleUpdate);
    window.addEventListener('dispensed_updated', handleUpdate);
    return () => {
       window.removeEventListener('revenue_updated', handleUpdate);
       window.removeEventListener('dispensed_updated', handleUpdate);
    };
  }, []);

  const currentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  const walkinTotal = walkinRxRev + walkinOtcRev;
  const onlineTotal = onlinePaidRev + onlineCodRev;
  const circ = 314.16; // 2 * PI * 50
  
  const walkinRxDash = walkinTotal > 0 ? (walkinRxRev / walkinTotal) * circ : 0;
  const walkinOtcDash = walkinTotal > 0 ? (walkinOtcRev / walkinTotal) * circ : 0;

  const cardDashQueue = dailyRevenue > 0 ? (onlineRevCard / dailyRevenue) * circ : 0;
  const bankDashQueue = dailyRevenue > 0 ? (onlineRevBank / dailyRevenue) * circ : 0;
  const payHereDashQueue = dailyRevenue > 0 ? (onlineRevPayHere / dailyRevenue) * circ : 0;
  const codDashQueue = dailyRevenue > 0 ? (onlineRevCod / dailyRevenue) * circ : 0;

  const paidDash = onlineTotal > 0 ? (onlinePaidRev / onlineTotal) * circ : 0;
  const codDash = onlineTotal > 0 ? (onlineCodRev / onlineTotal) * circ : 0;

  const physicalWidth = dispensedTodayCount > 0 ? (physicalDispensedCount / dispensedTodayCount) * 100 : 0;
  const onlineWidth = dispensedTodayCount > 0 ? (onlineDispensedCount / dispensedTodayCount) * 100 : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pharmacist Dashboard Overview</h1>
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
              <h2 className="text-3xl font-bold text-slate-800 mt-1">{dispensedTodayCount}</h2>
            </div>
            <div className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
              +12%
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform z-0">
             <FileText className="w-20 h-20 -mr-4 -mb-4 text-emerald-500" />
          </div>
          <div className="w-full bg-slate-100 h-2 mt-4 rounded-full overflow-hidden flex relative z-10 w-full">
            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${physicalWidth}%` }} title={`Physical: ${physicalDispensedCount}`}></div>
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${onlineWidth}%` }} title={`Online: ${onlineDispensedCount}`}></div>
          </div>
          <div className="flex justify-between items-center mt-2 relative z-10">
             <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span><span className="text-[10px] text-slate-500 font-bold tracking-wide">Physical ({physicalDispensedCount})</span></div>
             <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-[10px] text-slate-500 font-bold tracking-wide">Online ({onlineDispensedCount})</span></div>
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
              System
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">Total Patients</p>
            <h2 className="text-4xl font-bold text-slate-800 mt-1">{totalPatientsCount}</h2>
            <p className="text-[13px] text-slate-400 mt-2 font-medium">All registered patients</p>
          </div>
        </div>

        {/* Card 3 */}
        <div 
          className="card shadow-none hover:shadow-md border border-slate-100 border-l-4 border-l-orange-500 transition-all cursor-pointer relative overflow-hidden group"
          onClick={() => navigate('/pharmacist/low-stock')}
        >
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-medium text-slate-500">Low Stock Items</h3>
            {lowStockItems.length > 0 && <span className="bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Alert</span>}
          </div>
          <div className="mt-4">
            <h2 className="text-4xl font-bold text-slate-800">{lowStockItems.length}</h2>
            {lowStockItems.length > 0 ? (
               <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden flex" title={`Low Stock items: ${lowStockItems.map(i => i.name).join(', ')}`}>
                 <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${Math.min((lowStockItems.length / Math.max(totalInventoryCount, 1)) * 100, 100)}%` }}></div>
               </div>
            ) : (
               <p className="text-[13px] text-slate-400 mt-2 font-medium">Inventory levels are stable</p>
            )}
          </div>
        </div>

        {/* Card 4 - Expiring Soon */}
        <div 
          className="card shadow-none hover:shadow-md border border-slate-100 border-l-4 border-l-red-500 cursor-pointer transition-all flex flex-col justify-between"
          onClick={() => navigate('/pharmacist/expiring-inventory')}
        >
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-medium text-slate-500">Expiring Soon</h3>
            {expiringItems.length > 0 && <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Action Req.</span>}
          </div>
          <div className="mt-4">
            <h2 className="text-4xl font-bold text-slate-800">{expiringItems.length}</h2>
            {expiringItems.length > 0 ? (
               <div className="flex gap-2 mt-4 overflow-hidden" title={`Expiring medications: ${expiringItems.map(i => i.name).join(', ')}`}>
                 {expiringItems.slice(0, 5).map((item, idx) => (
                    <span key={idx} className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-[10px] font-bold text-red-600 border border-red-100 flex-shrink-0" title={item.name}>
                       {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                    </span>
                 ))}
                 {expiringItems.length > 5 && (
                    <span className="text-xs text-slate-400 font-bold ml-1 self-center w-6 text-center">+{expiringItems.length - 5}</span>
                 )}
               </div>
            ) : (
               <p className="text-[13px] text-slate-400 mt-2 font-medium">No near-expirations found</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="col-span-2 space-y-6">

          {/* Today's Business Circle Chart */}
          <div className="card shadow-sm pt-6 pb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-slate-800">Today's Revenue Overview</h3>
              <p className="text-sm font-black text-[#0b5ed7] bg-blue-50 px-3 py-1 rounded border border-blue-100">Total: Rs. {(dailyRevenue + walkinTotal + onlineTotal).toFixed(0)}</p>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              
              {/* Online Prescriptions Circle */}
              <div className="flex flex-col items-center">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-[#0b5ed7] mb-6 text-center">Online Prescriptions</h4>
                 <div className="flex items-center justify-center relative">
                   <svg className="w-32 h-32 transform -rotate-90">
                     <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                     <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={`${cardDashQueue} ${circ}`} strokeDashoffset={0} className="text-blue-600" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
                     <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={`${bankDashQueue} ${circ}`} strokeDashoffset={-cardDashQueue} className="text-indigo-500" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
                     <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={`${payHereDashQueue} ${circ}`} strokeDashoffset={-(cardDashQueue + bankDashQueue)} className="text-cyan-500" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
                     <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={`${codDashQueue} ${circ}`} strokeDashoffset={-(cardDashQueue + bankDashQueue + payHereDashQueue)} className="text-amber-500" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
                   </svg>
                   <div className="absolute flex flex-col items-center justify-center text-center px-2">
                     <span className="text-[15px] font-black text-slate-800">Rs.<br/>{dailyRevenue.toFixed(0)}</span>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-slate-100 w-full px-2">
                   <div className="text-center">
                     <div className="flex items-center justify-center gap-1 mb-1">
                       <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
                       <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Card</span>
                     </div>
                     <span className="font-bold text-slate-800 text-xs">Rs. {(onlineRevCard/1000).toFixed(1)}k</span>
                   </div>
                   <div className="text-center">
                     <div className="flex items-center justify-center gap-1 mb-1">
                       <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>
                       <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Bank</span>
                     </div>
                     <span className="font-bold text-slate-800 text-xs">Rs. {(onlineRevBank/1000).toFixed(1)}k</span>
                   </div>
                   <div className="text-center">
                     <div className="flex items-center justify-center gap-1 mb-1">
                       <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full"></div>
                       <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">PayHere</span>
                     </div>
                     <span className="font-bold text-slate-800 text-xs">Rs. {(onlineRevPayHere/1000).toFixed(1)}k</span>
                   </div>
                   <div className="text-center">
                     <div className="flex items-center justify-center gap-1 mb-1">
                       <div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
                       <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">COD</span>
                     </div>
                     <span className="font-bold text-slate-800 text-xs">Rs. {(onlineRevCod/1000).toFixed(1)}k</span>
                   </div>
                 </div>
              </div>

              {/* Walk-in POS Circle */}
              <div className="flex flex-col items-center border-l border-slate-100">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-6 text-center">Walk-in POS</h4>
                 <div className="flex items-center justify-center relative">
                   <svg className="w-32 h-32 transform -rotate-90">
                     <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                     <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={`${walkinRxDash} ${circ}`} strokeDashoffset={0} className="text-purple-600" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
                     <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={`${walkinOtcDash} ${circ}`} strokeDashoffset={-walkinRxDash} className="text-pink-400" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
                   </svg>
                   <div className="absolute flex flex-col items-center justify-center text-center px-2">
                     <span className="text-[15px] font-black text-slate-800">Rs.<br/>{walkinTotal.toFixed(0)}</span>
                   </div>
                 </div>
                 
                 <div className="flex justify-center gap-2 mt-6 pt-4 border-t border-slate-100 w-full px-2">
                   <div className="text-center w-1/2">
                     <div className="flex items-center justify-center gap-1.5 mb-1">
                       <div className="w-2.5 h-2.5 bg-purple-600 rounded-full"></div>
                       <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Rx Meds</span>
                     </div>
                     <span className="font-bold text-slate-800 text-xs">Rs. {(walkinRxRev/1000).toFixed(1)}k</span>
                   </div>
                   <div className="text-center w-1/2">
                     <div className="flex items-center justify-center gap-1.5 mb-1">
                       <div className="w-2.5 h-2.5 bg-pink-400 rounded-full"></div>
                       <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">OTC+Gen</span>
                     </div>
                     <span className="font-bold text-slate-800 text-xs">Rs. {(walkinOtcRev/1000).toFixed(1)}k</span>
                   </div>
                 </div>
              </div>

              {/* Online Hub Circle */}
              <div className="flex flex-col items-center border-l border-slate-100">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-6 text-center">Online Hub</h4>
                 <div className="flex items-center justify-center relative">
                   <svg className="w-32 h-32 transform -rotate-90">
                     <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                     {/* Paid Segment */}
                     <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={`${paidDash} ${circ}`} strokeDashoffset={0} className="text-emerald-500" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
                     {/* COD Segment */}
                     <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={`${codDash} ${circ}`} strokeDashoffset={-paidDash} className="text-amber-400" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
                   </svg>
                   <div className="absolute flex flex-col items-center justify-center text-center px-2">
                     <span className="text-[15px] font-black text-slate-800">Rs.<br/>{onlineTotal.toFixed(0)}</span>
                   </div>
                 </div>

                 <div className="flex justify-center gap-2 mt-6 pt-4 border-t border-slate-100 w-full px-2">
                   <div className="text-center w-1/2">
                     <div className="flex items-center justify-center gap-1.5 mb-1">
                       <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                       <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Paid</span>
                     </div>
                     <span className="font-bold text-slate-800 text-xs">Rs. {(onlinePaidRev/1000).toFixed(1)}k</span>
                   </div>
                   <div className="text-center w-1/2">
                     <div className="flex items-center justify-center gap-1.5 mb-1">
                       <div className="w-2.5 h-2.5 bg-amber-400 rounded-full"></div>
                       <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">COD</span>
                     </div>
                     <span className="font-bold text-slate-800 text-xs">Rs. {(onlineCodRev/1000).toFixed(1)}k</span>
                   </div>
                 </div>

              </div>

            </div>
          </div>
        </div>

        {/* Right Column (Recent Activity) */}
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
                <p className="text-sm text-slate-700 mt-0.5">Inventory Update: Amoxicillin batch #223 received.</p>
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
              
              <div className={`space-y-6 overflow-hidden transition-all duration-300 ${showAllLogs ? 'max-h-[500px] mt-6 opacity-100' : 'max-h-0 opacity-0 mt-0'}`}>
                <div className="relative pl-6">
                  <span className="absolute w-3 h-3 bg-red-400 rounded-full -left-[7px] top-1 border-2 border-white"></span>
                  <p className="text-xs text-slate-400 font-medium">08:45 AM</p>
                  <p className="text-sm text-slate-700 mt-0.5">Alert Flag: Severe interaction prevented.</p>
                </div>
              </div>
            </div>
            
            <button 
               onClick={() => setShowAllLogs(!showAllLogs)}
               className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-800 mt-4 py-2 border-t border-slate-100 transition-colors"
            >
               {showAllLogs ? 'View Less' : 'View All Log'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PharmacistDashboard;
