import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDispensedHistory, updateDispensedRecord, updatePatient, getPatients, getPrescriptions, updatePrescription } from '../../services/pharmacistService';
import { 
  ClipboardCheck, 
  Hourglass, 
  CheckCircle, 
  AlertTriangle,
  Search,
  Filter,
  Snowflake,
  ShieldAlert,
  Clock,
  Printer,
  X,
  PackageCheck,
  Banknote
} from 'lucide-react';

const PharmacistDispensing = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [dispOrders, setDispOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null); // High-level object for the Modal
  const [dailyRevenue, setDailyRevenue] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const h = await getDispensedHistory();
            const todayStr = new Date().toDateString();

            // Compute today's revenue from backend — no localStorage
            const todayRecords = h.filter(d => {
              const ds = d.dispensedDate || (d.dispensedAt ? new Date(d.dispensedAt).toDateString() : null) || (d.createdAt ? new Date(d.createdAt).toDateString() : null);
              return ds === todayStr && d.paymentStatus === 'Paid';
            });
            const totalToday = todayRecords.reduce((sum, d) => sum + (parseFloat(d.total) || 0), 0);
            setDailyRevenue(totalToday);

            // Active dispensing queue: not finalized, not walk-in
            const activeQueue = h
                .filter(d => !d.finalized && !(d.id && d.id.toString().startsWith('WALKIN')))
                .map(order => ({
                    ...order,
                    rxId: (order.rxId || order.id || '').toString(),
                    verifiedPatient: order.verifiedPatient || order.patientName || 'Unknown Patient',
                    orderItems: order.orderItems || order.medicines || [],
                    total: order.total || order.totalAmount || 0
                }));
            setDispOrders(activeQueue);
            setIsLoading(false);
        } catch (e) {
            console.error(e);
            setIsLoading(false);
        }
    };
    
    fetchData();
    const poller = setInterval(fetchData, 30000); 
    return () => clearInterval(poller);
  }, []);

  const markAsPaid = async (orderId) => {
    const order = dispOrders.find(o => o.rxId === orderId);
    if (!order) return;
    
    // update local state
    const updated = dispOrders.map(o => o.rxId === orderId ? { ...o, paymentStatus: 'Paid' } : o);
    setDispOrders(updated);
    
    // update backend
    await updateDispensedRecord(order.firebaseId || order.id, { paymentStatus: 'Paid' }).catch(console.error);
    
    // Update daily revenue total from payment
    if (order.total) {
      setDailyRevenue(prev => prev + parseFloat(order.total));
    }
  };

  const handleOpenDispenseModal = (orderId) => {
    const orderToDispense = dispOrders.find(o => o.rxId === orderId);
    if (orderToDispense) {
      setSelectedOrder(orderToDispense);
    }
  };

  const handlePrintLabel = (item) => {
    window.print();
  };

  const finalizeDispense = async () => {
    if (!selectedOrder) return;
    const orderId = selectedOrder.rxId;

    // 1. Update Patient's Medication List in Firebase
    try {
        const pts = await getPatients();
        const pt = pts.find(p => p.name === selectedOrder.verifiedPatient || p.id === selectedOrder.patientId);
         const now = new Date();
         const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
         const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
         
         const newMeds = selectedOrder.orderItems.map(item => ({
            name: item.name,
            form: `Qty: ${item.qty} | ${item.form || 'Standard'}`,
            sig: item.freq || 'Take as directed by physician',
            date: `${dateStr} at ${timeStr}`,
            timestamp: now.getTime(),
            prescriber: 'Verified Pharmacist',
            status: 'Active'
         }));

        if (pt) {
             const updatedMeds = [...newMeds, ...(pt.medications || [])];
             await updatePatient(pt.firebaseId || pt.id, {
                 medications: updatedMeds,
                 activeCount: updatedMeds.filter(m => m.status === 'Active').length
             });
        } else {
             // Register missing dummy patients from test data
             const { addPatient } = await import('../../services/pharmacistService');
             const newId = selectedOrder.patientId || `#PT-${Date.now().toString().slice(-6)}`;
             const newPatient = {
                 id: newId,
                 name: selectedOrder.verifiedPatient || 'Unknown Patient',
                 dob: 'Unknown',
                 age: 30,
                 gender: 'Unknown',
                 phone: 'N/A',
                 email: 'N/A',
                 address: 'Online Order Auto-Reg',
                 insurance: 'N/A',
                 insuranceId: 'N/A',
                 physician: 'N/A',
                 activeCount: newMeds.length,
                 fading: false,
                 avatarColor: '0ea5e9',
                 avatarBg: 'e0f2fe',
                 timestamp: Date.now(),
                 medications: newMeds,
                 notes: []
             };
             await addPatient(newPatient).catch(console.error);
        }
    } catch(e) { console.error('Failed to update patient profile:', e); }

    // 2. Clear from Verification Queue Context (if it still exists in Queue)
    try {
        const qs = await getPrescriptions();
        const rx = qs.find(q => q.id === orderId || q.queueId === orderId);
        if (rx) {
             await updatePrescription(rx.firebaseId || rx.id, {
                 status: 'Completed',
                 statusStyle: 'bg-slate-100 text-slate-500',
                 actionLabel: 'Archived',
                 rowStyle: 'opacity-50'
             });
        }
    } catch(e) { console.error('Failed to update queue:', e); }

    // 3. Mark as Finalized in Dispensed History
    try {
        const h = await getDispensedHistory();
        const dispRecs = h.filter(d => d.rxId === orderId);
        if (dispRecs.length > 0) {
             for (const dispRec of dispRecs) {
                 await updateDispensedRecord(dispRec.firebaseId || dispRec.id, { 
                     finalized: true,
                     dispensedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                 });
             }
             window.dispatchEvent(new Event('dispensed_updated'));
        }
    } catch(e) { console.error('Failed to update dispensed history:', e); }
    
    // Update local state by removing from active
    const filtered = dispOrders.filter(o => o.rxId !== orderId);
    setDispOrders(filtered);
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pharmacy Dispensing</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Queue automatically updates when prescriptions are verified.
          </p>
        </div>
        
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl shadow-sm min-w-[220px] flex items-center justify-between">
           <div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Today's Collection</p>
              <h3 className="text-2xl font-black text-emerald-800">Rs. {dailyRevenue.toFixed(2)}</h3>
           </div>
           <div className="bg-emerald-200/50 p-3 rounded-full flex items-center justify-center shrink-0 ml-4">
              <Banknote className="w-6 h-6 text-emerald-700" />
           </div>
        </div>
      </div>

      {/* Main Table Interface */}
      <div className="card p-0 overflow-hidden pt-4 mt-6 border border-slate-200 shadow-sm">
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 pb-4 border-b border-slate-100">
           <div className="relative w-full md:w-96 mb-4 md:mb-0">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input type="text" placeholder="Search verified prescriptions..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0b5ed7] focus:bg-white transition-colors" />
           </div>
           
           <div className="flex flex-wrap items-center gap-3">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 text-red-600 text-xs font-bold border border-red-100 hover:bg-red-100 transition-colors">
                 <AlertTriangle className="w-3.5 h-3.5" /> Urgent
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 text-amber-600 text-xs font-bold border border-amber-100 hover:bg-amber-100 transition-colors">
                 <Snowflake className="w-3.5 h-3.5" /> Fridge
              </button>
           </div>
        </div>

        {/* Table Component */}
        <div className="table-container shadow-none border-x-0 border-b-0 rounded-none bg-white">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th-header">Status</th>
                <th className="th-header">Order ID</th>
                <th className="th-header">Patient Name</th>
                <th className="th-header">Medications Prepared</th>
                <th className="th-header">Time In Queue</th>
                <th className="th-header text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              
              {dispOrders.map((order, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="td-cell pt-4">
                     {order.paymentStatus === 'Pending Payment' ? (
                       <span className="bg-amber-50 text-amber-600 border border-amber-100 font-black text-[10px] uppercase px-2 py-1 rounded w-max flex items-center gap-1"><Hourglass className="w-3 h-3"/> Pending Payment</span>
                     ) : (
                       <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[10px] uppercase px-2 py-1 rounded w-max flex items-center gap-1">
                         <CheckCircle className="w-3 h-3"/> {order.paymentMethod ? `Paid (${order.paymentMethod})` : 'Paid'}
                       </span>
                     )}
                  </td>
                  <td className="td-cell text-slate-500 font-medium">
                     <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold text-slate-600 tracking-wider">#{order.rxId.toUpperCase()}</span>
                  </td>
                  <td className="td-cell">
                    <div className="font-bold text-slate-800 flex items-center flex-wrap gap-2">
                       {order.verifiedPatient}
                       {order.patientId && <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded tracking-wider">{order.patientId}</span>}
                    </div>
                    <div className="text-xs font-black text-[#0b5ed7] mt-1 bg-blue-50 px-2 py-0.5 rounded w-max">Rs. {order.total?.toFixed(2)}</div>
                  </td>
                  <td className="td-cell">
                    <div className="font-medium text-slate-600 leading-tight space-y-1">
                      {order.orderItems.map((i, idx) => (
                         <div key={idx} className="flex gap-2 items-center text-xs border border-slate-100 bg-slate-50 rounded px-2 py-1 w-max">
                            <span className="font-bold">{i.name}</span>
                            <span className="text-slate-400">|</span>
                            <span className="text-[#0b5ed7] font-black">Qty {i.qty}</span>
                         </div>
                      ))}
                    </div>
                  </td>
                  <td className="td-cell text-emerald-600 font-bold flex items-center gap-1 mt-4">
                    <Clock className="w-4 h-4 text-emerald-500" /> Active
                  </td>
                  <td className="td-cell text-right pr-6">
                    {order.paymentStatus === 'Pending Payment' ? (
                       <div className="flex items-center justify-end gap-2">
                          <button onClick={() => markAsPaid(order.rxId)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors shadow">Mark as Paid</button>
                       </div>
                    ) : (
                       <button onClick={() => handleOpenDispenseModal(order.rxId)} className="bg-[#0b5ed7] hover:bg-[#084298] text-white font-bold text-sm px-4 py-2.5 rounded-lg transition-colors shadow flex items-center justify-end gap-2 ml-auto">
                          Dispense Items <CheckCircle className="w-4 h-4" />
                       </button>
                    )}
                  </td>
                </tr>
              ))}

              {dispOrders.length === 0 && (
                <tr>
                   <td colSpan="6" className="py-16 text-center text-slate-400">
                     <div className="flex flex-col items-center">
                        <ClipboardCheck className="w-12 h-12 mb-3 text-slate-300" />
                        <h3 className="font-bold text-slate-500">No Orders in Dispensing</h3>
                        <p className="text-sm mt-1">Orders verified from the queue will appear here.</p>
                     </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPENSING LABEL & FULFILLMENT MODAL */}
      {selectedOrder && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}></div>
            
            {/* Modal Content */}
            <div className="bg-[#f5f9ff] w-full max-w-4xl rounded-2xl shadow-xl z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               
               {/* Header */}
               <div className="bg-[#0b5ed7] px-6 py-4 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                     <div className="bg-white/20 p-2 rounded-lg">
                        <PackageCheck className="w-6 h-6 text-white" />
                     </div>
                     <div>
                        <h2 className="text-white font-black text-xl leading-none">Dispensing Fulfillment</h2>
                        <p className="text-blue-100 font-medium text-xs mt-1">Order #{selectedOrder.rxId}</p>
                     </div>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"><X className="w-5 h-5"/></button>
               </div>

               {/* Patient Info Bar */}
               <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shrink-0 shadow-sm z-10">
                  <div>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Dispensing To</span>
                     <div className="font-bold text-slate-800 text-base flex items-center gap-2">
                       {selectedOrder.verifiedPatient}
                       {selectedOrder.patientId && <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded uppercase tracking-wider">{selectedOrder.patientId}</span>}
                     </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                     <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded text-xs font-black flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Payment Verified
                     </span>
                  </div>
               </div>

               {/* Scrollable Medication List for Packing */}
               <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f5f9ff]">
                  
                  <div className="flex items-center gap-2 mb-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-[#0b5ed7]"></span>
                     <h3 className="font-black text-slate-700 text-sm tracking-wide uppercase">Print Labels & Pack Covers</h3>
                  </div>

                  {selectedOrder.orderItems.map((item, index) => (
                     <div key={index} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row">
                        {/* Label Preview Area */}
                        <div className="p-5 flex-1 relative print-section bg-[url('https://www.transparenttextures.com/patterns/clean-textile.png')]">
                           {/* Simulated Medication Label Design */}
                           <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 bg-white relative max-w-sm mx-auto shadow-sm">
                              <div className="flex justify-between border-b-2 border-slate-800 pb-2 mb-3">
                                 <h4 className="font-black text-slate-800">MediCareX Pharmacy</h4>
                                 <span className="font-bold text-slate-500 text-xs text-right">RX#{selectedOrder.rxId}</span>
                              </div>
                              <p className="font-black text-xs uppercase tracking-widest text-slate-500 mb-1">Patient</p>
                              <div className="font-bold text-slate-800 text-sm mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                                {selectedOrder.verifiedPatient}
                                {selectedOrder.patientId && <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">{selectedOrder.patientId}</span>}
                              </div>
                              
                              <p className="font-bold text-xs uppercase text-slate-500 bg-slate-100 px-2 py-0.5 w-max mb-1">Take {item.freq}</p>
                              <p className="font-medium text-slate-700 leading-snug mb-4">Take {item.qty} {item.form} as directed regularly.</p>
                              
                              <div className="bg-slate-800 text-white p-3 rounded flex justify-between items-center">
                                 <span className="font-black truncate block pr-2" title={item.name}>{item.name.split(' ')[0]} {item.name.split(' ')[1]}</span>
                                 <span className="text-xs font-black bg-white text-slate-800 px-2 py-1 rounded">Qty {item.qty}</span>
                              </div>
                              <div className="text-[9px] font-bold text-slate-400 mt-3 text-center">Date: {new Date().toLocaleDateString()} | Pharmacist: Verified</div>
                           </div>
                        </div>
                        
                        {/* Action Area */}
                        <div className="bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 w-full md:w-56 p-5 flex flex-col justify-center items-center shrink-0">
                           <button 
                              onClick={() => handlePrintLabel(item)}
                              className="w-full bg-white border border-[#0b5ed7] text-[#0b5ed7] hover:bg-blue-50 py-3 rounded-lg font-black text-sm flex items-center justify-center gap-2 transition-colors mb-3 shadow-sm"
                           >
                              <Printer className="w-4 h-4" /> Print Label
                           </button>
                           <p className="text-[10px] text-slate-500 text-center font-bold">Print and fix to cover {index + 1}</p>
                        </div>
                     </div>
                  ))}

               </div>

               {/* Footer / Finalize Button */}
               <div className="bg-white border-t border-slate-200 p-6 flex justify-between items-center shrink-0 rounded-b-2xl">
                  <p className="text-xs font-bold text-slate-400 max-w-sm">By clicking Finish, you confirm medications are packed according to labels and handed to the patient.</p>
                  <div className="flex gap-3">
                     <button onClick={() => setSelectedOrder(null)} className="px-6 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                     <button 
                        onClick={finalizeDispense} 
                        className="px-8 py-3 font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-md flex items-center gap-2"
                     >
                        <CheckCircle className="w-5 h-5 text-emerald-200" /> Finish Dispensing
                     </button>
                  </div>
               </div>

            </div>
         </div>
      )}

    </div>
  );
};

export default PharmacistDispensing;
