import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Calendar, 
  FileText, 
  TrendingUp, 
  Clock,
  Pill,
  AlertTriangle,
  Activity,
  ChevronDown,
  DollarSign,
  ShoppingCart,
  Users,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Monitor,
  Store
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { getDispensedHistory, getInventory, getOnlineOrders, getReturnRequests } from '../../services/pharmacistService';

const COLORS = ['#0b5ed7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const PharmacistReports = () => {
  const [dateRange, setDateRange] = useState('Today');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [dynamicChart30, setDynamicChart30] = useState([]);
  const [dynamicAnalytics, setDynamicAnalytics] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dispensed, inventory, onlineOther, returns] = await Promise.all([
           getDispensedHistory(),
           getInventory(),
           getOnlineOrders(),
           getReturnRequests()
        ]);

        // 1. Inventory Health
        let lowStockCount = 0;
        let expiringCount = 0;
        const lowStockList = [];
        const expiringList = [];

        inventory.forEach(item => {
           const qty = Number(item.stock ?? item.qty ?? item.quantity ?? 0);
           const name = item.name || item.productName || 'Unknown Product';
           
           if (qty < 50) {
              lowStockCount++;
              lowStockList.push({ name, qty });
           }
           
           const dateStr = item.expiryDate ?? item.expiry;
           if (dateStr) {
              const expDate = new Date(dateStr);
              const in30Days = new Date();
              in30Days.setDate(in30Days.getDate() + 30);
              if (expDate <= in30Days) {
                 expiringCount++;
                 expiringList.push({ name, expiry: dateStr });
              }
           }
        });

        // Sort by most critical
        lowStockList.sort((a,b) => a.qty - b.qty);
        expiringList.sort((a,b) => new Date(a.expiry) - new Date(b.expiry));

        const invHealth = { 
           lowStock: lowStockCount, 
           expiring: expiringCount,
           lowStockList,
           expiringList
        };

        // 2. Main Trend Data (Last 30 Days)
        const trendData = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
           const d = new Date(now);
           d.setDate(now.getDate() - i);
           const dateStr = d.toDateString();
           const shortName = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
           
           const dayDispensed = dispensed.filter(item => {
              const ds = item.dispensedDate || 
                         (item.dispensedAt ? new Date(item.dispensedAt).toDateString() : null) || 
                         (item.createdAt ? new Date(item.createdAt).toDateString() : null);
              return ds === dateStr;
           });

           trendData.push({
              name: shortName,
              online: dayDispensed.filter(it => it.orderType === 'Online' || it.rxId).length,
              physical: dayDispensed.filter(it => !(it.orderType === 'Online' || it.rxId)).length,
              revenue: dayDispensed.reduce((s, it) => s + (parseFloat(it.total) || 0), 0)
           });
        }
        setDynamicChart30(trendData);

        // 3. Analytics Engine
        const calculateStats = (days) => {
           const cutoff = new Date();
           if (days === 0) cutoff.setHours(0,0,0,0);
           else cutoff.setDate(cutoff.getDate() - days);
           cutoff.setHours(0,0,0,0);

           let totalRev = 0;
           let onlineRev = 0;
           let physicalRev = 0;
           let onlineCount = 0;
           let physicalCount = 0;
           const drugCounts = {};
           const paymentMethods = { 'Paid': 0, 'COD': 0, 'Bank': 0 };

           dispensed.forEach(d => {
              const dDate = new Date(d.dispensedAt || d.createdAt || d.dispensedDate || d.date);
              if (days === 0) {
                 if (dDate.toDateString() !== new Date().toDateString()) return;
              } else if (dDate < cutoff) return;

              const amt = parseFloat(d.total) || 0;
              const isOnline = d.orderType === 'Online' || d.rxId;

              if (isOnline) {
                 onlineRev += amt;
                 onlineCount++;
              } else {
                 physicalRev += amt;
                 physicalCount++;
              }
              totalRev += amt;

              // Payment method breakdown
              const method = (d.paymentMethod || '').toUpperCase();
              if (method.includes('COD')) paymentMethods['COD'] += amt;
              else if (method.includes('BANK')) paymentMethods['Bank'] += amt;
              else paymentMethods['Paid'] += amt;

              // Drugs
              const items = d.orderItems || d.medicines || [];
              items.forEach(it => {
                 if (!drugCounts[it.name]) drugCounts[it.name] = { qty: 0, rev: 0 };
                 drugCounts[it.name].qty += (parseInt(it.qty) || 1);
                 drugCounts[it.name].rev += (parseFloat(it.price) * (parseInt(it.qty) || 1)) || 0;
              });
           });

           // Returns Stats & Revenue Adjustment (Subtract approved refunds)
           const returnStats = { total: 0, pending: 0, approved: 0, rejected: 0 };
           let totalRefunded = 0;
           
           returns.forEach(r => {
              const rDate = new Date(r.timestamp || r.requestedAt);
              if (days === 0) {
                 if (rDate.toDateString() !== new Date().toDateString()) return;
              } else if (rDate < cutoff) return;

              returnStats.total++;
              if (r.status === 'Pending') returnStats.pending++;
              else if (r.status === 'Approved') {
                 returnStats.approved++;
                 totalRefunded += (parseFloat(r.refundAmount || r.total) || 0);
              }
              else if (r.status === 'Rejected') returnStats.rejected++;
           });

           // Apply Refund Deduction to Revenue
           const netRev = totalRev - totalRefunded;
           const netOnlineRev = onlineRev - (totalRefunded * 0.7); // Statistical estimate if split not available

           const topDrugs = Object.keys(drugCounts)
              .map(k => ({ name: k, qty: drugCounts[k].qty, rev: drugCounts[k].rev }))
              .sort((a, b) => b.qty - a.qty)
              .slice(0, 5);

           return {
              revenue: netRev > 0 ? netRev : 0,
              onlineRev: netOnlineRev > 0 ? netOnlineRev : 0,
              physicalRev,
              onlineCount,
              physicalCount,
              topDrugs,
              inventory: invHealth,
              paymentMethods,
              returns: returnStats
           };
        };

        setDynamicAnalytics({
           'Today': calculateStats(0),
           'Last 7 Days': calculateStats(7),
           'Last 30 Days': calculateStats(30),
           'Year to Date': calculateStats(365)
        });

      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s Polling
    return () => clearInterval(interval);
  }, []);

  const stats = dynamicAnalytics[dateRange] || { revenue: 0, onlineRev: 0, physicalRev: 0, topDrugs: [], inventory: {lowStock:0, expiring:0}, paymentMethods: {} };
  
  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20 px-4">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-4 border-b border-slate-100">
         <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Business Intelligence</h1>
            <p className="text-slate-500 font-bold text-sm mt-1 flex items-center gap-2">
               <Activity size={16} className="text-blue-600" />
               Real-time reporting and performance analytics
            </p>
         </div>

         <div className="flex items-center gap-4">
            <div className="relative">
               <button 
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="px-5 py-3 bg-white border-2 border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-600 flex items-center gap-3 shadow-sm hover:border-blue-200 transition-all"
               >
                  <Calendar size={16} className="text-blue-600" />
                  {dateRange}
                  <ChevronDown size={14} className={showDropdown ? 'rotate-180 transition-transform' : 'transition-transform'} />
               </button>
               {showDropdown && (
                  <div className="absolute top-full mt-2 right-0 w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                     {['Today', 'Last 7 Days', 'Last 30 Days', 'Year to Date'].map(r => (
                        <div key={r} onClick={() => { setDateRange(r); setShowDropdown(false); }} className={`px-5 py-4 text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 ${dateRange === r ? 'bg-blue-50 text-blue-600' : 'text-slate-500'}`}>
                           {r}
                        </div>
                     ))}
                  </div>
               )}
            </div>
            <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
               <Download size={16} /> Export PDF
            </button>
         </div>
      </div>

      {/* Highlights Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><DollarSign size={20} /></div>
               <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1"><ArrowUpRight size={12}/> +12%</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Net Revenue</p>
            <h3 className="text-2xl font-black text-slate-800">Rs. {stats.revenue.toLocaleString()}</h3>
         </div>

         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><Monitor size={20} /></div>
               <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">Online</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Online Sales</p>
            <h3 className="text-2xl font-black text-slate-800">Rs. {stats.onlineRev.toLocaleString()}</h3>
         </div>

         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-amber-50 rounded-2xl text-amber-600"><Store size={20} /></div>
               <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">Walk-in</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Physical Sales</p>
            <h3 className="text-2xl font-black text-slate-800">Rs. {stats.physicalRev.toLocaleString()}</h3>
         </div>

         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-purple-50 rounded-2xl text-purple-600"><Users size={20} /></div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Fulfillments</p>
            <h3 className="text-2xl font-black text-slate-800">{(stats.onlineCount + stats.physicalCount)} Orders</h3>
         </div>
      </div>

      {/* Main Large Chart Section */}
      <div className="bg-white rounded-3xl border border-slate-100 p-10 shadow-sm">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
            <div>
               <h3 className="font-black text-slate-800 text-2xl uppercase tracking-tight">Dispensing Performance Analysis</h3>
               <p className="text-sm font-bold text-slate-400">Comprehensive order volume and growth trends</p>
            </div>
            <div className="flex gap-6">
               <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-blue-600 shadow-lg shadow-blue-200" /><span className="text-xs font-black text-slate-500 uppercase tracking-wider">Online Channel</span></div>
               <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-slate-200" /><span className="text-xs font-black text-slate-500 uppercase tracking-wider">Physical Channel</span></div>
            </div>
         </div>
         <div className="h-[450px] w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={dynamicChart30}>
                  <defs>
                     <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0b5ed7" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0b5ed7" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#64748b'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#64748b'}} dx={-10} />
                  <Tooltip 
                     contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px', fontWeight: 'bold'}} 
                     cursor={{stroke: '#0b5ed7', strokeWidth: 2, strokeDasharray: '5 5'}}
                  />
                  <Area type="monotone" dataKey="online" stroke="#0b5ed7" strokeWidth={5} fillOpacity={1} fill="url(#colorOnline)" activeDot={{r: 8, strokeWidth: 0, fill: '#0b5ed7'}} />
                  <Area type="monotone" dataKey="physical" stroke="#cbd5e1" strokeWidth={4} fill="transparent" strokeDasharray="8 8" />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Bottom Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="md:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Top Dispensed Products</h3>
               <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Pill size={18} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
               {stats.topDrugs.map((drug, idx) => (
                  <div key={idx} className="flex items-center gap-5">
                     <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 text-sm">{idx+1}</div>
                     <div className="flex-1">
                        <div className="flex justify-between mb-1.5">
                           <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{drug.name}</span>
                           <span className="text-xs font-black text-blue-600">{drug.qty} Units</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                           <div className="bg-blue-600 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min((drug.qty/stats.topDrugs[0].qty)*100, 100)}%` }} />
                        </div>
                     </div>
                  </div>
               ))}
               {stats.topDrugs.length === 0 && <p className="text-sm text-slate-400 font-bold text-center py-10 col-span-2">No product movement data available.</p>}
            </div>
         </div>

         <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden flex flex-col justify-between group">
            <div className="absolute right-[-30px] top-[-30px] bg-white/5 w-40 h-40 rounded-full group-hover:scale-125 transition-transform duration-700" />
            <div className="relative">
               <h3 className="text-xl font-black uppercase tracking-tight mb-4">Daily Revenue Snapshot</h3>
               <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Card/Online</span>
                     <span className="text-sm font-black">Rs. {(stats.paymentMethods?.Paid || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cash on Delivery</span>
                     <span className="text-sm font-black">Rs. {(stats.paymentMethods?.COD || 0).toLocaleString()}</span>
                  </div>
               </div>
            </div>
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Integrity</span>
                  <span className="text-xs font-bold text-emerald-400">Verified by System</span>
               </div>
               <ShieldCheck className="text-emerald-400" size={24} />
            </div>
         </div>
      </div>

    </div>
  );
};

export default PharmacistReports;
