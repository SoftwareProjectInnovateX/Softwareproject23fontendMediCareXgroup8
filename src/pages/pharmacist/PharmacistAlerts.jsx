import React, { useState, useEffect, useContext } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  PackagePlus, 
  Tags,
  ShoppingCart,
  ArrowRight,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AlertContext } from '../../layouts/PharmacistLayout';

const PharmacistAlerts = () => {
  const navigate = useNavigate();
  const { setUnreadAlerts } = useContext(AlertContext);
  const [activeAlerts, setActiveAlerts] = useState([1, 2, 3, 4]);

  useEffect(() => {
    setUnreadAlerts(activeAlerts.length);
  }, [activeAlerts, setUnreadAlerts]);

  const dismissAlert = (id) => {
    setActiveAlerts(activeAlerts.filter(alertId => alertId !== id));
  };

  const handlePlaceOrder = () => {
    navigate('/pharmacist/inventory');
  };

  const handleCheckSuppliers = () => {
    navigate('/pharmacist/inventory');
  };

  const handleTrackOrder = () => {
    alert("Tracking integration with MediPharma logistic system is pending.");
  };

  const handleOpenDirectory = () => {
    alert("Supplier Directory features will be available in the next update.");
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] -m-6 relative overflow-hidden">
      
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-8 py-8 h-full">
        <div className="max-w-[1400px] mx-auto">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-800">Inventory Alerts</h1>
              <p className="text-slate-500 font-medium mt-1">Monitor stock levels, arrivals, and supply warnings.</p>
            </div>
            <div className="flex items-center gap-3">
              {activeAlerts.includes(1) && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-xs font-bold shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> 1 Low Stock
                </span>
              )}
              {activeAlerts.includes(2) && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-xs font-bold shadow-sm">
                   Recent Arrivals
                </span>
              )}
            </div>
          </div>

          {/* Filter & Sort Bar */}
          <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
            <div className="flex gap-6 text-sm font-bold">
              <button className="text-slate-800 border-b-2 border-slate-800 pb-4 -mb-[18px]">All Alerts</button>
            </div>
            <button className="flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-slate-800">
               Sort by Date <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Left Column: Alerts List */}
            <div className="xl:col-span-2 space-y-4">
              
              {activeAlerts.length === 0 && (
                <div className="bg-emerald-50 text-emerald-600 p-8 rounded-2xl text-center border border-emerald-100">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <h3 className="font-bold text-lg">All caught up!</h3>
                  <p className="text-sm font-medium opacity-80 mt-1">There are no pending inventory alerts requiring your attention.</p>
                </div>
              )}

              {/* Alert Card 1 - Low Stock Critical */}
              {activeAlerts.includes(1) && (
                <div className="card !border-l-red-500 p-5 shadow-sm hover:shadow-md transition-shadow">
                   <div className="flex justify-between items-start mb-4">
                     <div className="flex gap-4 items-start">
                       <div className="bg-red-50 text-red-500 p-2 rounded-lg mt-0.5">
                         <AlertTriangle className="w-5 h-5" />
                       </div>
                       <div>
                         <h3 className="font-bold text-slate-800 text-lg">Critical Low Stock</h3>
                         <p className="text-xs font-medium text-slate-400 mt-0.5 tracking-wide">Category: Antibiotics • Just now</p>
                       </div>
                     </div>
                     <span className="bg-red-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded tracking-wider shadow-sm">Urgent</span>
                   </div>

                   <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 ml-14 mb-4">
                      <p className="text-sm text-slate-600 font-medium"><span className="font-bold text-slate-800">Amoxicillin 500mg Caps</span> stock has fallen to <span className="font-bold text-red-500">12 strips</span>. This is below the minimum threshold of 30 strips.</p>
                   </div>

                   <div className="flex items-center gap-3 ml-14">
                      <button onClick={handlePlaceOrder} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2 rounded-md flex items-center gap-2 transition-colors shadow-sm">
                        <ShoppingCart className="w-4 h-4" /> Place Order
                      </button>
                      <button onClick={() => dismissAlert(1)} className="bg-white border border-slate-200 text-slate-600 font-bold text-sm px-5 py-2 rounded-md hover:bg-slate-50 transition-colors shadow-sm">
                        Acknowledge
                      </button>
                   </div>
                </div>
              )}

              {/* Alert Card 2 - New Arrival */}
              {activeAlerts.includes(2) && (
                <div className="card !border-l-emerald-500 p-5 shadow-sm hover:shadow-md transition-shadow">
                   <div className="flex justify-between items-start mb-4">
                     <div className="flex gap-4 items-start">
                       <div className="bg-emerald-50 text-emerald-500 p-2 rounded-lg mt-0.5">
                         <PackagePlus className="w-5 h-5" />
                       </div>
                       <div>
                         <h3 className="font-bold text-slate-800 text-lg">New Stock Arrived</h3>
                         <p className="text-xs font-medium text-slate-400 mt-0.5 tracking-wide">Supplier: MediPharma • 2 hours ago</p>
                       </div>
                     </div>
                     <span className="bg-emerald-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded tracking-wider shadow-sm">Received</span>
                   </div>

                   <div className="ml-14 mb-4">
                      <p className="text-sm text-slate-600 font-medium">Batch <span className="font-bold text-slate-800">#BATCH-99A</span> containing <span className="font-bold text-emerald-600">200 boxes</span> of <span className="font-bold text-slate-800">Metformin 500mg</span> has been successfully added to inventory.</p>
                   </div>
                   
                   <div className="flex items-center gap-3 ml-14">
                      <button onClick={() => dismissAlert(2)} className="bg-white border border-slate-200 text-slate-600 font-bold text-sm px-5 py-2 rounded-md hover:bg-slate-50 transition-colors shadow-sm">
                        Mark as Read
                      </button>
                   </div>
                </div>
              )}

              {/* Alert Card 3 - Low Stock Warning */}
              {activeAlerts.includes(3) && (
                <div className="card !border-l-amber-500 p-5 shadow-sm hover:shadow-md transition-shadow">
                   <div className="flex justify-between items-start mb-3">
                     <div className="flex gap-4 items-start">
                       <div className="bg-amber-50 text-amber-500 p-2 rounded-lg mt-0.5">
                         <Clock className="w-5 h-5" />
                       </div>
                       <div>
                         <h3 className="font-bold text-slate-800 text-lg">Stock Reorder Warning</h3>
                         <p className="text-xs font-medium text-slate-400 mt-0.5 tracking-wide">Category: Antacids • 4 hours ago</p>
                       </div>
                     </div>
                     <span className="bg-amber-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded tracking-wider shadow-sm">Warning</span>
                   </div>
                   
                   <div className="ml-14 mb-4">
                      <p className="text-sm text-slate-600 font-medium"><span className="font-bold text-slate-800">Pantoprazole 40mg</span> is nearing its minimum threshold with only <span className="font-bold text-amber-600">5 boxes</span> remaining.</p>
                   </div>

                   <div className="ml-14 flex items-center gap-3">
                      <button onClick={handleCheckSuppliers} className="bg-white border border-slate-200 text-slate-600 font-bold text-sm px-5 py-2 rounded-md hover:bg-slate-50 transition-colors shadow-sm">
                        Check Suppliers
                      </button>
                      <button onClick={() => dismissAlert(3)} className="bg-white border border-transparent text-slate-400 font-bold text-sm px-3 py-2 rounded-md hover:text-slate-600 transition-colors">
                        Hide
                      </button>
                   </div>
                </div>
              )}

              {/* Alert Card 4 - New Brand Added */}
              {activeAlerts.includes(4) && (
                <div className="card !border-l-blue-500 p-5 shadow-sm hover:shadow-md transition-shadow">
                   <div className="flex justify-between items-start mb-4">
                     <div className="flex gap-4 items-start">
                       <div className="bg-blue-50 text-blue-500 p-2 rounded-lg mt-0.5">
                         <Tags className="w-5 h-5" />
                       </div>
                       <div>
                         <h3 className="font-bold text-slate-800 text-lg">New Brand Added</h3>
                         <p className="text-xs font-medium text-slate-400 mt-0.5 tracking-wide">System Update • Yesterday</p>
                       </div>
                     </div>
                     <span className="bg-blue-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded tracking-wider shadow-sm">Info</span>
                   </div>
                   
                   <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 ml-14 mb-4">
                      <p className="text-sm text-slate-600 font-medium">A new over-the-counter brand <span className="font-bold text-slate-800">Panadol Extra Advance</span> has been registered in the system inventory catalogue.</p>
                   </div>

                   <div className="flex items-center gap-3 ml-14">
                      <button onClick={() => dismissAlert(4)} className="bg-white border border-slate-200 text-slate-600 font-bold text-sm px-5 py-2 rounded-md hover:bg-slate-50 transition-colors shadow-sm">
                        Dismiss
                      </button>
                   </div>
                </div>
              )}

            </div>

            {/* Right Column: Inventory Quick Actions */}
            <div className="space-y-6">
               
               <div>
                 <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                   <ShoppingCart className="w-5 h-5 text-blue-600" /> Procurement Actions
                 </h2>
                 <p className="text-xs font-medium text-slate-400 mt-1">Manage orders and supplier communication.</p>
               </div>

               {/* Tasks Container */}
               <div className="space-y-4">
                 
                 <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Orders</span>
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    </div>
                    <h3 className="font-bold text-slate-800 mt-2">MediPharma Delivery</h3>
                    <p className="text-xs font-medium text-slate-400">Status: En Route</p>
                    
                    <button onClick={handleTrackOrder} className="w-full mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-md font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2">
                      Track Order <ArrowRight className="w-4 h-4" />
                    </button>
                 </div>

                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Supplier Connect</span>
                    </div>
                    <h3 className="font-bold text-slate-800 mt-2">Contact Suppliers</h3>
                    <p className="text-xs font-medium text-slate-400">Negotiate rates or request emergency restock.</p>

                    <button onClick={handleOpenDirectory} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-bold text-sm transition-colors shadow-sm">Open Directory</button>
                 </div>
               </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacistAlerts;
