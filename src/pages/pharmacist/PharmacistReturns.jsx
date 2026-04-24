import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getReturnRequests, updateReturnRequest, getInventory, addReturnRequest, updateInventoryItem } from '../../services/pharmacistService';
import { RotateCcw, AlertTriangle, CheckCircle, Clock, Search, Filter, ShieldAlert, PackagePlus, Plus } from 'lucide-react';

export default function PharmacistReturns() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'physical' ? 'physical' : 'online');
  
  const [returnRequests, setReturnRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Walk-in Returns State
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggest, setShowSuggest] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [returnQty, setReturnQty] = useState('');
  const [returnReason, setReturnReason] = useState('Customer Return');
  const [restoreStock, setRestoreStock] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReturnsAndInventory = async () => {
    setIsLoading(true);
    try {
      const [reqs, inv] = await Promise.all([
        getReturnRequests(),
        getInventory()
      ]);
      setReturnRequests(reqs || []);
      setInventory(inv || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturnsAndInventory();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateReturnRequest(id, { status: newStatus });
      setReturnRequests(prev => prev.map(req => req.firebaseId === id ? { ...req, status: newStatus } : req));
    } catch (error) {
      alert("Failed to update return status.");
    }
  };

  const handlePhysicalReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem || !returnQty || isNaN(returnQty) || parseInt(returnQty) <= 0) {
      alert("Please select a valid item and enter a quantity.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Record Return Request
      const newReturn = {
        orderId: `WALKIN-${Math.floor(Date.now() / 1000)}`,
        customerName: 'Walk-in Customer',
        itemName: selectedItem.itemName || selectedItem.name,
        reason: returnReason,
        note: 'Processed directly at POS counter.',
        date: new Date().toLocaleDateString(),
        status: 'Approved', // Auto-approved
        timestamp: Date.now()
      };
      
      await addReturnRequest(newReturn);

      // 2. Restore Stock if requested
      if (restoreStock && selectedItem.firebaseId) {
        const currentQty = parseInt(selectedItem.stockQuantity || selectedItem.quantity || 0);
        await updateInventoryItem(selectedItem.firebaseId, {
           stockQuantity: currentQty + parseInt(returnQty)
        });
      }

      alert("Physical Return Processed Successfully!");
      
      // Reset Form & Refresh
      setSelectedItem(null);
      setSearchTerm('');
      setReturnQty('');
      fetchReturnsAndInventory();

    } catch (err) {
      console.error("Error submitting physical return:", err);
      alert("Failed to process return.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = returnRequests.filter(r => r.status === 'Pending').length;
  const approvedCount = returnRequests.filter(r => r.status === 'Approved').length;

  const filteredInventory = inventory.filter(item => {
    const name = (item.itemName || item.name || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-2">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            Returns Management
            {pendingCount > 0 && activeTab === 'online' && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{pendingCount} New</span>
            )}
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Review online requests and process physical walk-in returns.</p>
        </div>
        
        <div className="flex gap-3">
          <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Pending</p>
              <p className="text-lg font-black text-amber-800 leading-none">{pendingCount}</p>
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Processed</p>
              <p className="text-lg font-black text-emerald-800 leading-none">{approvedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('online')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'online' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <RotateCcw className="w-4 h-4" /> Online Requests
        </button>
        <button 
          onClick={() => setActiveTab('physical')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'physical' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <PackagePlus className="w-4 h-4" /> Process Walk-in Return
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {activeTab === 'online' ? (
          <>
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-4 border-b border-slate-100 gap-4">
               <div className="relative w-full md:w-96">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input type="text" placeholder="Search by Order ID or Customer..." className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" />
               </div>
               
               <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors">
                     <Filter className="w-3.5 h-3.5" /> All Statuses
                  </button>
               </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Order & Customer</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Returned Item</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Reason / Notes</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr><td colSpan="5" className="py-10 text-center text-slate-400 font-bold">Loading requests...</td></tr>
                  ) : returnRequests.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <RotateCcw className="w-12 h-12 mb-3 text-slate-300" />
                          <p className="font-bold">No Return Requests</p>
                          <p className="text-sm">There are no customer returns to process at the moment.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    returnRequests.sort((a,b) => b.timestamp - a.timestamp).map((req, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-800">{req.customerName}</div>
                          <div className="text-xs font-black text-slate-400 mt-0.5">Order #{req.orderId}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-700">{req.itemName}</div>
                          <div className="text-[10px] text-slate-500 mt-1">Requested: {req.date}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 mb-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> {req.reason}
                          </div>
                          <p className="text-xs text-slate-500 max-w-xs truncate" title={req.note}>"{req.note}"</p>
                        </td>
                        <td className="py-4 px-6">
                          {req.status === 'Pending' && <span className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-black uppercase px-2.5 py-1 rounded flex items-center w-max gap-1"><Clock className="w-3 h-3"/> Pending</span>}
                          {req.status === 'Approved' && <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase px-2.5 py-1 rounded flex items-center w-max gap-1"><CheckCircle className="w-3 h-3"/> Approved</span>}
                          {req.status === 'Rejected' && <span className="bg-red-100 text-red-700 border border-red-200 text-[10px] font-black uppercase px-2.5 py-1 rounded flex items-center w-max gap-1"><ShieldAlert className="w-3 h-3"/> Rejected</span>}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {req.status === 'Pending' ? (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleUpdateStatus(req.firebaseId, 'Rejected')}
                                className="px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-colors"
                              >
                                Reject
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(req.firebaseId, 'Approved')}
                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                              >
                                Approve
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-400">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Walk-in Returns Interface */
          <div className="p-8 max-w-2xl">
             <h2 className="text-xl font-bold text-slate-800 mb-6">Process Walk-in Return</h2>
             
             <form onSubmit={handlePhysicalReturnSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Search Returned Item</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setSelectedItem(null);
                        setShowSuggest(true);
                      }}
                      onFocus={() => setShowSuggest(true)}
                      onBlur={() => setTimeout(() => setShowSuggest(false), 200)}
                      placeholder="Type medicine or item name..."
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-blue-500 outline-none transition-colors"
                    />
                    {showSuggest && searchTerm && filteredInventory.length > 0 && (
                      <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {filteredInventory.slice(0, 20).map(item => (
                          <li 
                            key={item.firebaseId || item.id} 
                            onClick={() => {
                              setSelectedItem(item);
                              setSearchTerm(item.itemName || item.name);
                              setShowSuggest(false);
                            }}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 flex flex-col"
                          >
                            <span className="font-bold text-slate-800">{item.itemName || item.name}</span>
                            <span className="text-xs text-slate-500 mt-1">Current Stock: {item.stockQuantity || item.quantity || 0} | Rs. {item.price}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="flex gap-6">
                   <div className="flex-1">
                     <label className="block text-sm font-semibold text-slate-700 mb-2">Quantity Returned</label>
                     <input 
                       type="number"
                       min="1"
                       value={returnQty}
                       onChange={(e) => setReturnQty(e.target.value)}
                       placeholder="e.g. 5"
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-blue-500 outline-none"
                     />
                   </div>
                   <div className="flex-1">
                     <label className="block text-sm font-semibold text-slate-700 mb-2">Reason</label>
                     <select 
                       value={returnReason}
                       onChange={(e) => setReturnReason(e.target.value)}
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-blue-500 outline-none"
                     >
                       <option>Customer Return</option>
                       <option>Defective / Damaged</option>
                       <option>Expired Item</option>
                       <option>Wrong Item Sold</option>
                     </select>
                   </div>
                </div>

                <div className="pt-4 flex items-center gap-3">
                   <input 
                     type="checkbox" 
                     id="restoreStock"
                     checked={restoreStock}
                     onChange={(e) => setRestoreStock(e.target.checked)}
                     className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                   />
                   <label htmlFor="restoreStock" className="text-sm font-semibold text-slate-700">Add quantity back to inventory stock</label>
                </div>

                <div className="pt-6 border-t border-slate-100">
                   <button 
                     type="submit"
                     disabled={isSubmitting || !selectedItem || !returnQty}
                     className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold flex justify-center items-center gap-2 transition-colors"
                   >
                     {isSubmitting ? 'Processing...' : <><CheckCircle className="w-5 h-5"/> Process Return & Add to History</>}
                   </button>
                </div>
             </form>
          </div>
        )}
      </div>
    </div>
  );
}
