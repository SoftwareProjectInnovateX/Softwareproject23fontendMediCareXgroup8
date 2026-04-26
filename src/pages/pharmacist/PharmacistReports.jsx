import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Calendar, 
  FileText, 
  TrendingUp, 
  Clock,
  Pill,
  AlertTriangle,
  Snowflake,
  Activity,
  ChevronDown,
  DollarSign
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { getDispensedHistory, getInventory, getOnlineOrders, getReturnRequests, addDispensedRecord } from '../../services/pharmacistService';

const blankAnalytics = {
  revenue: '0.00',
  avgTime: '0m 0s',
  returnRate: '0%',
  topDrugs: [],
  inventory: { lowStock: 0, expiring: 0 }
};

const PharmacistReports = () => {
  const [dateRange, setDateRange] = useState('Today');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [dynamicChart30, setDynamicChart30] = useState([]);
  const [dynamicChart7, setDynamicChart7] = useState([]);
  const [dynamicAnalytics, setDynamicAnalytics] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dispensed = await getDispensedHistory();
        const inventory = await getInventory();
        const onlineOrders = await getOnlineOrders();
        const returns = await getReturnRequests();

        // 1. Calculate Inventory Health
        let lowStock = 0;
        let expiring = 0;
        inventory.forEach(item => {
           const qty = item.stock ?? item.qty ?? item.quantity ?? 0;
           if (qty < 50) lowStock++;
           
           const dateStr = item.expiryDate ?? item.expiry;
           if (dateStr) {
              const expDate = new Date(dateStr);
              const in30Days = new Date();
              in30Days.setDate(in30Days.getDate() + 30);
              if (expDate <= in30Days) expiring++;
           }
        });

        const invHealth = { lowStock, expiring };

        // 2. Generate Chart Data
        // Group dispensed records by date
        const countsByDate = {};
        const now = new Date();
        // prefill last 30 days
        for(let i=29; i>=0; i--) {
           const d = new Date(now);
           d.setDate(now.getDate() - i);
           countsByDate[d.toDateString()] = 0;
        }

        dispensed.forEach(d => {
           if (d.dispensedDate && countsByDate[d.dispensedDate] !== undefined) {
               countsByDate[d.dispensedDate]++;
           }
        });

        const newChart30 = Object.keys(countsByDate).map(dateStr => {
           const d = new Date(dateStr);
           const shortName = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
           return { name: shortName, verified: countsByDate[dateStr] };
        });

        const newChart7 = newChart30.slice(-7);

        // 3. Analytics Aggregation (Revenue, Drugs)
        const filterByDays = (days) => {
           const cutoff = new Date();
           if (days === 0) {
              cutoff.setHours(0,0,0,0); // Today from midnight
           } else {
              cutoff.setDate(cutoff.getDate() - days);
              cutoff.setHours(0,0,0,0);
           }
           
           let rev = 0;
           const drugCounts = {};

           // Helper to process revenue and drugs
           const processItem = (d, dateField, isOnlineHub) => {
              const rDate = new Date(d[dateField] || d.timestamp);
              
              if (days === 0) {
                  // Must exactly match the logic in Dashboard for 'Today'
                  const todayStr = new Date().toDateString();
                  const itemDateStr = isOnlineHub 
                      ? new Date(d.orderDate || d.timestamp).toDateString() 
                      : d.dispensedDate;
                      
                  if (itemDateStr !== todayStr) return;
              } else {
                  if (rDate < cutoff) return;
              }

              // Only sum paid items exactly like the Dashboard
              const isPaid = isOnlineHub ? (d.paymentStatus === 'Paid' || d.paymentMethod === 'COD') : (d.paymentStatus === 'Paid');

              if (isPaid) {
                  rev += parseFloat(d.total) || 0;
              }
              
              // Count Drugs
              if (d.orderItems && Array.isArray(d.orderItems)) {
                 d.orderItems.forEach(item => {
                    if (!drugCounts[item.name]) drugCounts[item.name] = { count: 0, form: item.form || 'Units' };
                    drugCounts[item.name].count += (parseInt(item.qty) || 1);
                 });
              }
           };

           // Process standard dispensed items
           dispensed.forEach(d => processItem(d, 'dispensedDate', false));
           
           // Process online hub orders
           onlineOrders.filter(o => o.status === 'Dispatched').forEach(o => processItem(o, 'orderDate', true));

           // Sort top 5 drugs
           const topDrugsList = Object.keys(drugCounts)
             .map(k => ({ name: k, qty: drugCounts[k].count, unit: drugCounts[k].form }))
             .sort((a,b) => b.qty - a.qty)
             .slice(0, 5)
             .map((drug, idx, arr) => {
                const max = arr[0].qty || 1;
                return { ...drug, percent: Math.round((drug.qty / max) * 100) };
             });

           // Calculate Return Rate
           let totalOrdersPeriod = 0;
           let returnsPeriod = 0;
           
           const processReturnRate = () => {
              returns.forEach(r => {
                 const rDate = new Date(r.timestamp);
                 if (days === 0) {
                     if (rDate.toDateString() === new Date().toDateString()) returnsPeriod++;
                 } else {
                     if (rDate >= cutoff) returnsPeriod++;
                 }
              });
              
              dispensed.forEach(d => {
                 const dDate = new Date(d.dispensedDate || d.timestamp);
                 if (days === 0) {
                     if (dDate.toDateString() === new Date().toDateString()) totalOrdersPeriod++;
                 } else {
                     if (dDate >= cutoff) totalOrdersPeriod++;
                 }
              });
              onlineOrders.forEach(o => {
                 const oDate = new Date(o.orderDate || o.timestamp);
                 if (days === 0) {
                     if (oDate.toDateString() === new Date().toDateString()) totalOrdersPeriod++;
                 } else {
                     if (oDate >= cutoff) totalOrdersPeriod++;
                 }
              });
           };
           processReturnRate();

           const rRate = totalOrdersPeriod > 0 ? ((returnsPeriod / totalOrdersPeriod) * 100).toFixed(1) + '%' : '0%';

           return {
              revenue: rev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              avgTime: '0m 0s', // No tracking mechanism for this yet
              returnRate: rRate,
              topDrugs: topDrugsList,
              inventory: invHealth
           };
        };

        const newAnalytics = {
           'Today': filterByDays(0),
           'Last 7 Days': filterByDays(7),
           'Last 30 Days': filterByDays(30),
           'Year to Date': filterByDays(365)
        };

        setDynamicChart30(newChart30);
        setDynamicChart7(newChart7);
        setDynamicAnalytics(newAnalytics);

      } catch (e) {
        console.error("Failed to load reporting data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const chartData = useMemo(() => {
    if (dateRange === 'Last 7 Days') return dynamicChart7;
    return dynamicChart30;
  }, [dateRange, dynamicChart7, dynamicChart30]);

  const currentStats = dynamicAnalytics[dateRange] || blankAnalytics;

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10 print:m-0 print:p-0 print:max-w-full">
      
      {/* Top PharmacistHeader */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-slate-100 pb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Operational Analytics</h1>
          <p className="text-slate-500 font-medium text-sm mt-1 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#0b5ed7]" /> Live Pharmacist Reporting Dashboard
          </p>
        </div>
        
        <div className="flex items-center gap-3 relative">
          
          <div className="relative">
             <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-lg flex items-center gap-2 shadow-sm relative cursor-pointer hover:bg-slate-50 transition-colors"
             >
               <Calendar className="w-4 h-4 text-[#0b5ed7]" />
               {dateRange}
               <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
             </button>
             {showDropdown && (
                <div className="absolute top-full mt-1 right-0 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                   {['Today', 'Last 7 Days', 'Last 30 Days', 'Year to Date'].map(range => (
                      <div 
                        key={range}
                        onClick={() => { setDateRange(range); setShowDropdown(false); }}
                        className={`px-4 py-3 text-sm font-bold cursor-pointer hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0 ${dateRange === range ? 'text-[#0b5ed7] bg-blue-50' : 'text-slate-600'}`}
                      >
                         {range}
                      </div>
                   ))}
                </div>
             )}
          </div>

          <button onClick={exportPDF} className="px-4 py-2 bg-[#0b5ed7] hover:bg-[#084298] text-white font-bold text-sm rounded-lg flex items-center gap-2 transition-colors shadow-sm">
            <FileText className="w-4 h-4" /> Export Report (PDF)
          </button>
        </div>
      </div>

      {/* Print Header Visible Only on Print */}
      <div className="hidden print:block text-center mb-8 border-b-2 border-slate-800 pb-4">
         <h1 className="text-2xl font-black text-slate-800 uppercase">MediCareX Pharmacy Analytics Report</h1>
         <p className="text-sm font-bold text-slate-500 mt-1">Generated: {new Date().toLocaleString()} | Period: {dateRange}</p>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b5ed7]"></div>
        </div>
      ) : (
      <>
        {/* Top Value Cards Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Revenue Card */}
         <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform">
               <DollarSign className="w-10 h-10 text-emerald-500" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Dispensing Revenue</p>
            <h2 className="text-4xl font-black text-slate-800">Rs. {currentStats.revenue}</h2>
         </div>

         {/* Efficiency Card */}
         <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform">
               <Clock className="w-10 h-10 text-[#0b5ed7]" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Avg. Fulfillment Time</p>
            <h2 className="text-4xl font-black text-slate-800">{currentStats.avgTime}</h2>
            <p className="text-xs font-bold text-slate-500 mt-3 flex items-center gap-1 bg-slate-100 w-max px-2 py-1 rounded">
               From verification to dispense
            </p>
         </div>

         {/* Retention Card */}
         <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 bg-purple-50 w-24 h-24 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform">
               <ShieldCheck className="w-10 h-10 text-purple-500" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Patient Return Rate</p>
            <h2 className="text-4xl font-black text-slate-800">{currentStats.returnRate}</h2>
         </div>
      </div>

      {/* Grid Layout for Chart and Lower Widgets */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
         
         {/* Main Chart Column (Takes up 2/3 space) */}
         <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden print:shadow-none print:border print:mb-8">
               <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-wide flex items-center gap-2">
                       <span className="w-1.5 h-6 bg-[#0b5ed7] rounded-full inline-block"></span> 
                       Prescription Output Trend
                    </h3>
                    <p className="text-sm font-medium text-slate-500 ext-ml-3">Daily completed and verified transactions for {dateRange.toLowerCase()}.</p>
                  </div>
               </div>

               <div className="h-[300px] w-full -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0b5ed7" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#0b5ed7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 600}} 
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 600}} 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="verified" 
                        stroke="#0b5ed7" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorVerified)" 
                        activeDot={{ r: 6, fill: '#fff', stroke: '#0b5ed7', strokeWidth: 3 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Inventory Health Warning Banner */}
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 flex flex-col sm:flex-row justify-between items-center gap-4">
               <div className="flex items-center gap-4">
                  <div className="bg-amber-100 p-3 rounded-full shrink-0">
                     <AlertTriangle className="w-8 h-8 text-amber-600" />
                  </div>
                  <div>
                     <h3 className="font-black text-amber-900 text-lg">Inventory Health Notice</h3>
                     <p className="text-amber-700 text-sm font-medium">There are items requiring immediate logistical attention.</p>
                  </div>
               </div>
               <div className="flex gap-4">
                  <div className="bg-white border border-amber-200 rounded-xl py-3 px-5 text-center shadow-sm">
                     <span className="block text-2xl font-black text-amber-600 leading-none">{currentStats.inventory.expiring}</span>
                     <span className="text-[10px] uppercase font-bold text-amber-600/70 tracking-wider">Expiring &lt;30d</span>
                  </div>
                  <div className="bg-white border border-amber-200 rounded-xl py-3 px-5 text-center shadow-sm">
                     <span className="block text-2xl font-black text-amber-600 leading-none">{currentStats.inventory.lowStock}</span>
                     <span className="text-[10px] uppercase font-bold text-amber-600/70 tracking-wider">Low Stock</span>
                  </div>
               </div>
            </div>
         </div>

         {/* Right Sidebar Column (Takes up 1/3 space) */}
         <div className="space-y-6">
            {/* Top Drugs Widget */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print:border print:shadow-none h-full max-h-[500px] flex flex-col">
               <h3 className="text-lg font-black text-slate-800 tracking-wide flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-6 bg-purple-500 rounded-full inline-block"></span> 
                  Top Dispensed Drugs
               </h3>
               <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider border-b border-slate-100 pb-3">By Output Volume</p>

               <div className="space-y-5 flex-1 overflow-y-auto pr-2">
                  {currentStats.topDrugs.length === 0 ? (
                     <div className="text-center py-6">
                       <p className="text-slate-400 font-bold text-sm">No data available for this period.</p>
                     </div>
                  ) : currentStats.topDrugs.map((drug, idx) => (
                     <div key={idx}>
                        <div className="flex justify-between items-end mb-1">
                           <div className="flex items-center gap-2">
                              <span className="font-black text-slate-300 text-sm">0{idx + 1}</span>
                              <span className="font-bold text-slate-700 text-sm">{drug.name}</span>
                           </div>
                           <div className="text-right">
                              <span className="font-black text-[#0b5ed7] block leading-none">{drug.qty}</span>
                              <span className="text-[10px] font-bold text-slate-400">{drug.unit}</span>
                           </div>
                        </div>
                        {/* Custom Progress Bar */}
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                           <div 
                              className={`h-full rounded-full ${idx === 0 ? 'bg-[#0b5ed7]' : idx === 1 ? 'bg-blue-400' : idx === 2 ? 'bg-purple-400' : 'bg-slate-300'}`} 
                              style={{ width: `${drug.percent}%` }}
                           ></div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>

      </div>
      </>
      )}

    </div>
  );
};

export default PharmacistReports;
