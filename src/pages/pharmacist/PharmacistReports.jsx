import React, { useState, useMemo } from 'react';
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

const chartData30Days = [
  { name: 'Oct 01', verified: 60 }, { name: 'Oct 02', verified: 100 }, { name: 'Oct 03', verified: 210 },
  { name: 'Oct 04', verified: 240 }, { name: 'Oct 05', verified: 280 }, { name: 'Oct 06', verified: 320 },
  { name: 'Oct 07', verified: 290 }, { name: 'Oct 08', verified: 310 }, { name: 'Oct 09', verified: 250 },
  { name: 'Oct 10', verified: 320 }, { name: 'Oct 11', verified: 290 }, { name: 'Oct 12', verified: 340 },
  { name: 'Oct 13', verified: 360 }, { name: 'Oct 14', verified: 300 }, { name: 'Oct 15', verified: 330 },
  { name: 'Oct 16', verified: 250 }, { name: 'Oct 17', verified: 310 }, { name: 'Oct 18', verified: 280 },
  { name: 'Oct 19', verified: 340 }, { name: 'Oct 20', verified: 370 }, { name: 'Oct 21', verified: 360 },
  { name: 'Oct 22', verified: 350 }, { name: 'Oct 23', verified: 340 }, { name: 'Oct 24', verified: 330 },
];

const chartData7Days = chartData30Days.slice(-7);

const analyticsData = {
   'Last 7 Days': {
      revenue: '185,400.00',
      avgTime: '12m 45s',
      returnRate: '68%',
      topDrugs: [
         { name: 'Amoxicillin 500mg', qty: 245, unit: 'Capsules', percent: 85 },
         { name: 'Lisinopril 10mg', qty: 180, unit: 'Tablets', percent: 65 },
         { name: 'Metformin 500mg', qty: 156, unit: 'Tablets', percent: 55 },
         { name: 'Atorvastatin 20mg', qty: 142, unit: 'Tablets', percent: 45 },
         { name: 'Salbutamol Inhaler', qty: 94, unit: 'Inhalers', percent: 30 }
      ],
      inventory: { lowStock: 14, expiring: 3 }
   },
   'Last 30 Days': {
      revenue: '842,500.00',
      avgTime: '14m 10s',
      returnRate: '72%',
      topDrugs: [
         { name: 'Lisinopril 10mg', qty: 980, unit: 'Tablets', percent: 95 },
         { name: 'Amoxicillin 500mg', qty: 850, unit: 'Capsules', percent: 80 },
         { name: 'Metformin 500mg', qty: 720, unit: 'Tablets', percent: 70 },
         { name: 'Atorvastatin 20mg', qty: 650, unit: 'Tablets', percent: 60 },
         { name: 'Omeprazole 20mg', qty: 410, unit: 'Capsules', percent: 40 }
      ],
      inventory: { lowStock: 14, expiring: 8 }
   },
   'Year to Date': {
      revenue: '8,450,200.00',
      avgTime: '13m 30s',
      returnRate: '75%',
      topDrugs: [
         { name: 'Metformin 500mg', qty: '12.4k', unit: 'Tablets', percent: 95 },
         { name: 'Lisinopril 10mg', qty: '11.8k', unit: 'Tablets', percent: 90 },
         { name: 'Atorvastatin 20mg', qty: '9.5k', unit: 'Tablets', percent: 75 },
         { name: 'Amoxicillin 500mg', qty: '7.8k', unit: 'Capsules', percent: 60 },
         { name: 'Losartan 50mg', qty: '5.4k', unit: 'Tablets', percent: 45 }
      ],
      inventory: { lowStock: 14, expiring: 52 }
   }
};

const PharmacistReports = () => {
  const [dateRange, setDateRange] = useState('Last 7 Days');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const chartData = useMemo(() => {
    if (dateRange === 'Last 7 Days') return chartData7Days;
    return chartData30Days;
  }, [dateRange]);

  const currentStats = analyticsData[dateRange];

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
                   {['Last 7 Days', 'Last 30 Days', 'Year to Date'].map(range => (
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

      {/* Top Value Cards Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Revenue Card */}
         <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform">
               <DollarSign className="w-10 h-10 text-emerald-500" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Dispensing Revenue</p>
            <h2 className="text-4xl font-black text-slate-800">Rs. {currentStats.revenue}</h2>
            <p className="text-xs font-bold text-emerald-600 mt-3 flex items-center gap-1 bg-emerald-50 w-max px-2 py-1 rounded">
               <TrendingUp className="w-3 h-3" /> +12.5% vs previous period
            </p>
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
            <p className="text-xs font-bold text-purple-600 mt-3 flex items-center gap-1 bg-purple-50 w-max px-2 py-1 rounded">
               <TrendingUp className="w-3 h-3" /> Recurring chronic refills
            </p>
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
                  {currentStats.topDrugs.map((drug, idx) => (
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

    </div>
  );
};

export default PharmacistReports;
