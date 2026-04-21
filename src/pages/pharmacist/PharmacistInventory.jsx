import React from 'react';
import { 
  AlertTriangle, 
  Hourglass, 
  Receipt,
  Search,
  ScanBarcode,
  Plus,
  Shield,
  ShoppingCart,
  Printer
} from 'lucide-react';

const PharmacistInventory = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      
      {/* Page PharmacistHeader (replaces standard header actions conceptually for this view) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-slate-100 pb-6">
        <h1 className="text-3xl font-black text-slate-800">PharmacistInventory</h1>
        <div className="flex items-center gap-4">
           <div className="relative w-80">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input type="text" placeholder="Search medications, SKUs, or batches..." className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border-none rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
           </div>
           <button className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors">
              <ScanBarcode className="w-4 h-4" /> Scan Batch
           </button>
           <button className="flex items-center gap-2 bg-[#020b2d] hover:bg-[#0a192f] text-white px-4 py-2.5 rounded-lg font-bold text-sm transition-colors">
              <Plus className="w-4 h-4" /> Receive Stock
           </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* Left Area: 2/3 Width */}
         <div className="lg:col-span-2 space-y-8">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
               {/* Critical Card */}
               <div className="bg-red-50 rounded-xl p-5 border border-red-100 flex items-start gap-4 shadow-sm relative">
                 <div className="bg-red-100 text-red-500 p-2 rounded-lg">
                   <AlertTriangle className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="text-xs font-bold text-red-800 tracking-wider uppercase">Critical PharmacistAlerts</h3>
                   <h2 className="text-3xl font-black text-red-600 mt-2 leading-none">12 <span className="text-sm font-bold text-red-500">Items</span></h2>
                   <p className="text-[10px] text-red-400 font-bold uppercase mt-2">Below safety threshold</p>
                 </div>
                 <div className="absolute top-4 right-4 bg-red-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded">Reorder</div>
               </div>
               
               {/* Expire Card */}
               <div className="bg-amber-50 rounded-xl p-5 border border-amber-100 flex items-start gap-4 shadow-sm relative">
                 <div className="bg-amber-100 text-amber-600 p-2 rounded-lg border border-amber-200">
                   <Hourglass className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="text-xs font-bold text-amber-900 tracking-wider uppercase">Soon to Expire</h3>
                   <h2 className="text-3xl font-black text-amber-600 mt-2 leading-none">08 <span className="text-sm font-bold text-amber-500">Items</span></h2>
                   <p className="text-[10px] text-amber-500 font-bold uppercase mt-2">Expiring within 30 days</p>
                 </div>
               </div>

               {/* Recent Orders Card */}
               <div className="bg-slate-100 rounded-xl p-5 border border-slate-200 flex items-start gap-4 shadow-sm relative">
                 <div className="bg-slate-200 text-slate-500 p-2 rounded-lg border border-slate-300">
                   <Receipt className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase">Recent Orders</h3>
                   <h2 className="text-3xl font-black text-[#020b2d] mt-2 leading-none">24 <span className="text-sm font-bold text-slate-500">Batches</span></h2>
                   <p className="text-[10px] text-emerald-600 font-bold uppercase mt-2">Received this month</p>
                 </div>
               </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 flex gap-8">
               <button className="pb-3 border-b-2 border-blue-600 text-slate-800 font-bold text-sm">All Items</button>
               <button className="pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 font-bold text-sm flex gap-2 items-center">
                 Low Stock <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">12</span>
               </button>
               <button className="pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 font-bold text-sm flex gap-2 items-center">
                 Soon to Expire <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">8</span>
               </button>
               <button className="pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 font-bold text-sm">Controlled Substances</button>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden shadow-sm border border-slate-200">
               <table className="w-full">
                 <thead>
                   <tr>
                     <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">Product Name</th>
                     <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">SKU</th>
                     <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">Available Stock</th>
                     <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">Reserved</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   
                   <tr className="hover:bg-slate-50/50">
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
                           <div>
                             <div className="font-bold text-slate-800">Amoxicillin 500mg</div>
                             <div className="text-[10px] font-bold text-slate-400 mt-0.5">Broad-spectrum Antibiotic</div>
                           </div>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-[11px] font-mono text-slate-500 font-bold">AMX-500-2824</td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
                              <div className="w-4/5 h-full bg-[#020b2d]"></div>
                           </div>
                           <span className="font-bold text-slate-800 text-sm">850</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-xs font-semibold text-slate-500">45 units</td>
                   </tr>

                   <tr className="hover:bg-slate-50/50">
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className="w-4 h-4 flex-shrink-0" />
                           <div>
                             <div className="font-bold text-slate-800">Lisinopril 10mg</div>
                             <div className="text-[10px] font-bold text-slate-400 mt-0.5">ACE Inhibitor</div>
                           </div>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-[11px] font-mono text-slate-500 font-bold">LIS-18-882</td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
                              <div className="w-[5%] h-full bg-red-500"></div>
                           </div>
                           <span className="font-bold text-red-600 text-sm">12</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-xs font-semibold text-slate-500">8 units</td>
                   </tr>

                   <tr className="hover:bg-slate-50/50">
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className="w-4 h-4 flex-shrink-0" />
                           <div>
                             <div className="font-bold text-slate-800">Atorvastatin 20mg</div>
                             <div className="text-[10px] font-bold text-slate-400 mt-0.5">Statin Medication</div>
                           </div>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-[11px] font-mono text-slate-500 font-bold">ATR-20-X1</td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
                              <div className="w-[30%] h-full bg-amber-500"></div>
                           </div>
                           <span className="font-bold text-slate-800 text-sm">220</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-xs font-semibold text-slate-500">102 units</td>
                   </tr>

                   <tr className="hover:bg-slate-50/50">
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <Shield className="w-4 h-4 text-blue-400 flex-shrink-0" />
                           <div>
                             <div className="font-bold text-slate-800">Hydrocodone 5mg</div>
                             <div className="text-[10px] font-bold text-blue-500 mt-0.5 uppercase">Opioid Analgesic</div>
                           </div>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-[11px] font-mono text-slate-500 font-bold">HYD-05-992</td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
                              <div className="w-2/3 h-full bg-[#020b2d]"></div>
                           </div>
                           <span className="font-bold text-slate-800 text-sm">310</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-xs font-semibold text-slate-500">0 units</td>
                   </tr>

                   <tr className="hover:bg-slate-50/50">
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className="w-4 h-4 flex-shrink-0" />
                           <div>
                             <div className="font-bold text-slate-800">Metformin 850mg</div>
                             <div className="text-[10px] font-bold text-slate-400 mt-0.5">Antidiabetic Agent</div>
                           </div>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-[11px] font-mono text-slate-500 font-bold">MET-850-99</td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
                              <div className="w-[85%] h-full bg-[#020b2d]"></div>
                           </div>
                           <span className="font-bold text-slate-800 text-sm">1100</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-xs font-semibold text-slate-500">12 units</td>
                   </tr>

                 </tbody>
               </table>
               
               {/* Pagination footer */}
               <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                 <span>Showing 5 of 1,284 medications</span>
                 <div className="flex items-center gap-4">
                   <button className="text-slate-400 hover:text-slate-600">&lt;</button>
                   <span className="font-bold text-slate-800">1</span>
                   <button className="text-slate-400 hover:text-slate-600">&gt;</button>
                 </div>
               </div>
            </div>

         </div>

         {/* Right PharmacistSidebar Area: 1/3 Width */}
         <div className="space-y-6">
            
            <div className="flex items-center gap-2 text-red-600 border-b border-slate-200 pb-3">
               <AlertTriangle className="w-5 h-5 flex-shrink-0" />
               <div>
                  <h3 className="font-bold text-slate-800">Low Stock Alert</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Items requiring immediate reorder</p>
               </div>
            </div>

            {/* Alert Items */}
            <div className="card shadow-sm border-red-100 relative pt-4 hover:-translate-y-1 transition-transform">
               <div className="absolute top-0 right-0 bg-red-100 text-red-600 text-[9px] font-bold uppercase px-2 py-1 rounded-bl-lg rounded-tr-xl">Critical</div>
               <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">SKU: LIS-10</div>
               <h4 className="font-black text-slate-800 text-lg mt-1 mb-4">Lisinopril 10mg</h4>
               <div className="flex justify-between items-end">
                 <div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Available</span>
                   <span className="font-black text-red-600 text-xl">12 units</span>
                 </div>
                 <button className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-lg shadow-sm transition-colors">
                   <ShoppingCart className="w-4 h-4" />
                 </button>
               </div>
            </div>

            <div className="card shadow-sm border-amber-100 relative pt-4 hover:-translate-y-1 transition-transform">
               <div className="absolute top-0 right-0 bg-amber-100 text-amber-600 text-[9px] font-bold uppercase px-2 py-1 rounded-bl-lg rounded-tr-xl">Low Stock</div>
               <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">SKU: INS-H-1</div>
               <h4 className="font-black text-slate-800 text-lg mt-1 mb-4">Insulin Humalog 10ml</h4>
               <div className="flex justify-between items-end">
                 <div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Available</span>
                   <span className="font-black text-amber-500 text-xl">5 vials</span>
                 </div>
                 <button className="bg-amber-500 hover:bg-amber-600 text-white p-2.5 rounded-lg shadow-sm transition-colors">
                   <ShoppingCart className="w-4 h-4" />
                 </button>
               </div>
            </div>

            {/* Recent Receipts */}
            <div className="pt-4 border-t border-slate-200">
               <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Recent Receipts</h3>
               <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                     <div className="bg-slate-100 text-slate-500 p-1.5 rounded text-xs mt-1 border border-slate-200">
                       <Receipt className="w-3.5 h-3.5" />
                     </div>
                     <div>
                       <h4 className="text-xs font-bold text-slate-800">Batch #B-8829</h4>
                       <p className="text-[10px] font-medium text-slate-400 mt-0.5">Received 2 hours ago by Sarah</p>
                       <p className="text-[10px] font-bold text-[#020b2d] mt-1">12 items added</p>
                     </div>
                  </div>
                  <div className="flex gap-3 items-start">
                     <div className="bg-slate-100 text-slate-500 p-1.5 rounded text-xs mt-1 border border-slate-200">
                       <Receipt className="w-3.5 h-3.5" />
                     </div>
                     <div>
                       <h4 className="text-xs font-bold text-slate-800">Batch #B-8828</h4>
                       <p className="text-[10px] font-medium text-slate-400 mt-0.5">Received Yesterday by Mike</p>
                       <p className="text-[10px] font-bold text-[#020b2d] mt-1">45 items added</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Report Button */}
            <div className="pt-4">
              <button className="w-full bg-[#020b2d] hover:bg-[#0a192f] text-white py-3.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm">
                <Printer className="w-4 h-4" /> PharmacistInventory Report
              </button>
            </div>

         </div>

      </div>
    </div>
  );
};

export default PharmacistInventory;

