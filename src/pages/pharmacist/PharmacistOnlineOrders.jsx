import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  ArrowLeft,
  Clock,
  CheckCircle,
  Truck,
  Box,
  CreditCard,
  X,
  ClipboardCheck,
  CheckCircle2,
  ListRestart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getOnlineOrders, updateOnlineOrder, addOnlineOrder } from '../../services/pharmacistService';

// initialVerifiedOrders removed to ensure pure Firebase data

const PharmacistOnlineOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
     const fetchOrders = async () => {
         try {
             let fetched = await getOnlineOrders();
             const mappedOrders = fetched.map(order => ({
                 ...order,
                 id: (order.id || order.orderId || order.firebaseId || '').toString(),
                 patient: order.patient || order.customerName || 'Unknown',
                 paymentStatus: order.paymentStatus || 'Pending',
                 items: order.items || order.types || [],
                 date: order.date || (order.createdAt ? new Date(order.createdAt._seconds * 1000).toLocaleDateString() : 'N/A'),
                 status: order.status || (order.orderStatus === 'approved' ? 'Confirmed' : (order.orderStatus === 'pending' ? 'Reviewing' : (order.orderStatus === 'delivered' ? 'Dispatched' : 'Reviewing'))),
                 phone: order.phone || 'N/A',
                 address: order.address || 'N/A',
                 total: order.total || order.totalAmount || 0
             }));
             setOrders(mappedOrders);
             setIsLoading(false);
         } catch(e) {
             console.error(e);
             setIsLoading(false);
         }
     };
     fetchOrders();
  }, []);

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Reviewing': return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'Confirmed': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'Packed': return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'Dispatched': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const getActionText = (status) => {
    switch(status) {
      case 'Reviewing': return 'Review Order';
      case 'Confirmed': return 'Pack Items';
      case 'Packed': return 'Dispatch Order';
      case 'Dispatched': return 'View Details';
      default: return 'View';
    }
  };

  const handleProcessOrder = async () => {
    if (!selectedOrder) return;
    
    let nextStatus = selectedOrder.status;
    if (selectedOrder.status === 'Reviewing') nextStatus = 'Confirmed';
    else if (selectedOrder.status === 'Confirmed') nextStatus = 'Packed';
    else if (selectedOrder.status === 'Packed') nextStatus = 'Dispatched';

    try {
        await updateOnlineOrder(selectedOrder.id || selectedOrder.docId, { status: nextStatus });
    } catch(e) { console.error('Failed to update online order', e); }

    const updatedOrders = orders.map(o => 
      o.id === selectedOrder.id ? { ...o, status: nextStatus } : o
    );
    
    // Event dispatch to inform dashboard of status change
    if (selectedOrder.status === 'Packed' && nextStatus === 'Dispatched') {
       try {
          window.dispatchEvent(new Event('revenue_updated'));
       } catch(e) {}
    }

    setOrders(updatedOrders);
    setSelectedOrder({ ...selectedOrder, status: nextStatus });

    // Optional: Close modal automatically if dispatched
    if (nextStatus === 'Dispatched') {
       setTimeout(() => setSelectedOrder(null), 1500);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.patient.toLowerCase().includes(searchTerm.toLowerCase()) || order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/pharmacist/dashboard')}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-6 h-6 text-[#0b5ed7]" />
              Online Orders Hub
            </h1>
            <p className="text-slate-500 mt-1">Review, confirm, pack, and dispatch Paid and Cash on Delivery orders.</p>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl flex items-center gap-2">
           <CheckCircle2 className="w-5 h-5 text-blue-600" />
           <span className="text-sm font-bold text-blue-800">Verified Paid & COD Orders</span>
        </div>
      </div>

      <div className="card shadow-sm p-0 overflow-hidden bg-white border border-slate-200 rounded-xl mt-6">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-80">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input 
               type="text" 
               placeholder="Search by Order ID or Customer Name..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-[#0b5ed7] transition-all font-medium shadow-sm"
             />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
             {['All', 'Reviewing', 'Confirmed', 'Packed', 'Dispatched'].map(status => (
                <button 
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${filterStatus === status ? 'bg-[#0b5ed7] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {status}
                </button>
             ))}
          </div>
        </div>

        {/* Dynamic Table Area */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Order ID</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Payment</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Items</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date Received</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                     <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded text-xs">{order.id}</span>
                  </td>
                  <td className="px-6 py-4">
                     <div className="font-bold text-slate-800">{order.patient}</div>
                  </td>
                  <td className="px-6 py-4">
                     {order.paymentStatus === 'Paid' ? (
                       <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-max border border-emerald-100">
                         <CreditCard className="w-3 h-3" /> Paid
                       </span>
                     ) : (
                       <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded w-max border border-amber-100">
                         <CreditCard className="w-3 h-3" /> COD
                       </span>
                     )}
                  </td>
                  <td className="px-6 py-4">
                     <p className="text-sm font-bold text-slate-700">{order.items?.length || 0} Items</p>
                     <p className="text-xs font-medium text-slate-500 truncate max-w-[150px]">{(order.items || []).map(i=>i.name).join(', ')}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> {order.date}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap ${getStatusStyle(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                     {order.status === 'Dispatched' ? (
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm"
                        >View</button>
                     ) : (
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="text-white font-bold text-sm hover:bg-[#084298] transition-colors bg-[#0b5ed7] px-4 py-1.5 rounded-lg shadow-sm whitespace-nowrap"
                        >{getActionText(order.status)}</button>
                     )}
                  </td>
                </tr>
              )) : (
                <tr>
                   <td colSpan="7" className="px-6 py-16 text-center text-slate-400">
                     <Package className="w-12 h-12 mx-auto mb-3 text-slate-300 opacity-50" />
                     <p className="font-medium">No verified orders found matching the filter.</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}></div>
            
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               
               {/* Header */}
               <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                     <div className="bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
                        <Box className="w-5 h-5 text-[#0b5ed7]" />
                     </div>
                     <div>
                        <h2 className="text-slate-800 font-black text-lg leading-none">Order Details</h2>
                        <p className="text-slate-500 font-bold text-xs mt-1 tracking-widest uppercase">{selectedOrder.id}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     {selectedOrder.paymentStatus === 'Paid' ? (
                       <span className="flex items-center gap-1.5 text-xs font-black uppercase text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4" /> Payment Verified
                       </span>
                     ) : (
                       <span className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200">
                          <CheckCircle2 className="w-4 h-4" /> Cash on Delivery
                       </span>
                     )}
                     <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:bg-slate-200 p-2 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                  </div>
               </div>

               {/* Content */}
               <div className="p-6 overflow-y-auto bg-white">
                  
                  {/* Customer Info */}
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-6">
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0b5ed7] mb-3">Customer Information</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <p className="text-xs text-slate-500 font-bold mb-1">Name</p>
                           <p className="text-sm font-bold text-slate-800">{selectedOrder.patient}</p>
                        </div>
                        <div>
                           <p className="text-xs text-slate-500 font-bold mb-1">Phone</p>
                           <p className="text-sm font-bold text-slate-800">{selectedOrder.phone}</p>
                        </div>
                        <div className="col-span-2">
                           <p className="text-xs text-slate-500 font-bold mb-1">Delivery Address</p>
                           <p className="text-sm font-bold text-slate-800">{selectedOrder.address}</p>
                        </div>
                     </div>
                  </div>

                  {/* Items validation List */}
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Ordered Items ({selectedOrder.items?.length || 0})</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2 font-bold text-slate-600">Item Description</th>
                            <th className="px-4 py-2 font-bold text-slate-600">Type</th>
                            <th className="px-4 py-2 font-bold text-slate-600 text-center">Qty</th>
                            <th className="px-4 py-2 font-bold text-slate-600 text-right">Price</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {(selectedOrder.items || []).map((item, idx) => (
                             <tr key={idx} className="bg-white">
                                <td className="px-4 py-3 font-bold text-slate-800">{item.name}</td>
                                <td className="px-4 py-3">
                                  <span className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wide">{item.type}</span>
                                </td>
                                <td className="px-4 py-3 font-black text-slate-700 text-center">{item.qty}</td>
                                <td className="px-4 py-3 font-bold text-slate-700 text-right">Rs. {(item.price || 0).toFixed(2)}</td>
                             </tr>
                          ))}
                       </tbody>
                       <tfoot className="bg-slate-50 border-t border-slate-200">
                          <tr>
                            <td colSpan="3" className="px-4 py-3 font-black text-slate-600 text-right uppercase tracking-widest text-[10px]">Total {selectedOrder.paymentStatus === 'Paid' ? 'Paid' : 'Due'} Amount</td>
                            <td className={`px-4 py-3 font-black text-right text-base ${selectedOrder.paymentStatus === 'Paid' ? 'text-emerald-700' : 'text-amber-700'}`}>Rs. {(selectedOrder.total || 0).toFixed(2)}</td>
                          </tr>
                       </tfoot>
                     </table>
                  </div>

               </div>

               {/* Footer / Workflow Actions */}
               <div className="bg-slate-50 border-t border-slate-200 p-6 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Current Status</span>
                     <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${getStatusStyle(selectedOrder.status)}`}>
                       {selectedOrder.status}
                     </span>
                  </div>
                  
                  <div className="flex gap-3">
                     <button onClick={() => setSelectedOrder(null)} className="px-5 py-2.5 font-bold text-slate-500 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors text-sm">Close</button>
                     
                     {selectedOrder.status !== 'Dispatched' && (
                        <button 
                           onClick={handleProcessOrder} 
                           className="px-6 py-2.5 font-black text-white bg-[#0b5ed7] hover:bg-[#084298] rounded-lg transition-colors shadow-md flex items-center gap-2 text-sm"
                        >
                           {selectedOrder.status === 'Reviewing' && <><ClipboardCheck className="w-4 h-4"/> Confirm Order</>}
                           {selectedOrder.status === 'Confirmed' && <><Package className="w-4 h-4"/> Mark as Packed</>}
                           {selectedOrder.status === 'Packed' && <><Truck className="w-4 h-4"/> Dispatch Order</>}
                        </button>
                     )}
                  </div>
               </div>

            </div>
          </div>
      )}

    </div>
  );
};

export default PharmacistOnlineOrders;
