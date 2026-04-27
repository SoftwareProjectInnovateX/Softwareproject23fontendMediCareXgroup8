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
  Banknote,
  Truck,
  MapPin,
  ChevronRight,
  Package
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const PharmacistDispensing = () => {
  const [dispOrders, setDispOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
      try {
          const h = await getDispensedHistory();
          const todayStr = new Date().toDateString();
          const todayRecords = h.filter(d => {
            const ds = d.dispensedDate || (d.dispensedAt ? new Date(d.dispensedAt).toDateString() : null) || (d.createdAt ? new Date(d.createdAt).toDateString() : null);
            // Count Paid, COD, or already finalized Successful orders in today's revenue
            const isRevenue = d.paymentStatus === 'Paid' || d.paymentStatus === 'COD' || d.status === 'Successful' || d.finalized === true;
            return ds === todayStr && isRevenue;
          });
          setDailyRevenue(todayRecords.reduce((sum, d) => sum + (parseFloat(d.total) || 0), 0));

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
      } catch (e) { console.error(e); setIsLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const poller = setInterval(fetchData, 3000); 
    return () => clearInterval(poller);
  }, []);

  const markAsPaid = async (orderId) => {
    const order = dispOrders.find(o => o.rxId === orderId);
    if (!order) return;
    await updateDispensedRecord(order.firebaseId || order.id, { paymentStatus: 'Paid' }).catch(console.error);
    window.dispatchEvent(new Event('revenue_updated'));
    fetchData();
  };

  const handleOpenDispenseModal = async (orderId) => {
    const orderToDispense = dispOrders.find(o => o.rxId === orderId);
    if (orderToDispense) {
        setSelectedOrder(orderToDispense);
        
        // Notify customer: "Packing"
        try {
            const rxRef = doc(db, 'prescriptions', orderId);
            await updateDoc(rxRef, { status: 'Packing' });
        } catch (e) { console.error(e); }
    }
  };

  const finalizeDispense = async () => {
    if (!selectedOrder) return;
    const orderId = selectedOrder.rxId;

    try {
        // Notify customer: "Delivered"
        const rxRef = doc(db, 'prescriptions', orderId);
        await updateDoc(rxRef, {
            status: 'Delivered',
            deliveredAt: new Date().toISOString()
        });
        
        // Update local backend queue (Archive it)
        await updateDispensedRecord(selectedOrder.firebaseId || selectedOrder.id, { 
            finalized: true,
            dispensedTime: new Date().toLocaleTimeString(),
            status: 'Successful',
            orderType: 'Online' // Explicitly mark for revenue tracking
        });

        // Trigger real-time UI refresh on Dashboard
        window.dispatchEvent(new Event('dispensed_updated'));
        window.dispatchEvent(new Event('revenue_updated'));
    } catch(e) { console.error('Failed to finalize:', e); }
    
    setSelectedOrder(null);
    fetchData();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Pharmacy Dispensing Queue</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Real-time synchronization with customer payments active.
          </p>
        </div>
        
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm min-w-[240px] flex items-center justify-between">
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Today's Revenue</p>
              <h3 className="text-2xl font-black text-emerald-600">Rs. {dailyRevenue.toFixed(2)}</h3>
           </div>
           <div className="bg-emerald-50 p-3 rounded-full flex items-center justify-center shrink-0 ml-4">
              <Banknote className="w-6 h-6 text-emerald-600" />
           </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden pt-4 mt-6 border border-slate-200 shadow-sm bg-white rounded-2xl">
        <div className="table-container shadow-none border-0 rounded-none overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="th-header text-left pl-6">Status</th>
                <th className="th-header">Order Info</th>
                <th className="th-header">Delivery Details</th>
                <th className="th-header">Medications</th>
                <th className="th-header text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dispOrders.map((order, index) => (
                <tr key={index} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="td-cell pl-6">
                     <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter border ${
                        order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                     }`}>
                        {order.paymentStatus}
                     </span>
                  </td>
                  <td className="td-cell">
                    <div className="font-black text-slate-800 text-sm">#{order.rxId.slice(-6).toUpperCase()}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{order.verifiedPatient}</div>
                  </td>
                  <td className="td-cell">
                    <div className="flex flex-col gap-0.5 max-w-[200px]">
                       <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0b5ed7]">
                          <MapPin size={10} /> {order.address || 'N/A'}
                       </div>
                       <div className="text-[10px] text-slate-400 font-medium">Contact: {order.phone || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="td-cell">
                    <div className="flex flex-wrap gap-1">
                       {order.orderItems.slice(0, 2).map((i, idx) => (
                          <span key={idx} className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-500 border border-slate-200">
                             {i.name} ({i.qty})
                          </span>
                       ))}
                       {order.orderItems.length > 2 && <span className="text-[9px] text-slate-400 font-bold">+{order.orderItems.length - 2}</span>}
                    </div>
                  </td>
                  <td className="td-cell text-right pr-6">
                    {order.paymentStatus === 'Pending Payment' ? (
                       <button onClick={() => markAsPaid(order.rxId)} className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all shadow-sm mx-auto" title="Confirm Payment">
                          <Banknote size={18} />
                       </button>
                    ) : (
                       <button onClick={() => handleOpenDispenseModal(order.rxId)} className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all shadow-md ml-auto" title="Dispensing & Stickers">
                          <Package size={20} />
                       </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPENSING MODAL */}
      {selectedOrder && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}></div>
            <div className="bg-[#f8faff] w-full max-w-4xl rounded-3xl shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
               
               <div className="bg-blue-600 px-8 py-6 flex justify-between items-center text-white">
                  <div className="flex items-center gap-4">
                     <Package size={28} />
                     <div>
                        <h2 className="font-black text-xl uppercase tracking-tight">Dispensing Fulfillment</h2>
                        <p className="text-blue-100 text-xs font-bold">Order #{selectedOrder.rxId.toUpperCase()}</p>
                     </div>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X /></button>
               </div>

               <div className="p-8 space-y-6 overflow-y-auto">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                     <div className="flex items-center gap-3 text-blue-800 font-black text-xs uppercase tracking-widest">
                        <MapPin size={16} /> Delivery Address
                     </div>
                     <p className="text-sm font-bold text-slate-600 mt-2 ml-7">{selectedOrder.address}</p>
                  </div>

                  <h3 className="font-black text-slate-700 text-xs uppercase tracking-[0.2em] mb-4">Medication Stickers</h3>
                  
                  <div className="grid grid-cols-1 gap-6">
                  {selectedOrder.orderItems.map((item, index) => (
                     <div key={index} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-8 hover:border-blue-200 transition-colors">
                        <div className="flex-1 border-2 border-slate-800 rounded-lg p-5 bg-white font-mono text-[10px] relative overflow-hidden">
                           <div className="absolute top-0 left-0 w-full h-1 bg-slate-800"></div>
                           <div className="flex justify-between items-start mb-4">
                              <div className="font-black text-[12px] uppercase tracking-tighter">MediCareX Pharmacy</div>
                              <div className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded font-black">RX #{selectedOrder.rxId.slice(-4)}</div>
                           </div>
                           <div className="mb-4">
                              <p className="text-[8px] text-slate-400 uppercase font-black mb-0.5">Medication Name</p>
                              <p className="font-black text-[14px] text-slate-900 uppercase leading-none">{item.name}</p>
                           </div>
                           <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                 <p className="text-[8px] text-slate-400 uppercase font-black mb-0.5">Dosage / Qty</p>
                                 <p className="font-black text-slate-800 text-[11px]">{item.form || item.dosage || 'Tablet'} x {item.qty}</p>
                              </div>
                           </div>
                           <div className="bg-slate-900 text-white p-3 rounded-lg">
                              <p className="text-[7px] text-slate-400 uppercase font-black mb-1">Pharmacist Instructions</p>
                              <p className="font-black text-[10px] uppercase tracking-wider leading-tight">{item.timing || 'As directed.'}</p>
                           </div>
                        </div>
                        <div className="flex flex-col justify-center items-center gap-3 shrink-0 px-4">
                           <button onClick={() => window.print()} className="w-full bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-sm">
                              <Printer size={14} /> Print Sticker
                           </button>
                           <p className="text-[9px] text-slate-400 font-bold uppercase">Medication #{index+1}</p>
                        </div>
                     </div>
                  ))}
                  </div>
               </div>

               <div className="p-8 bg-white border-t border-slate-100 flex justify-between items-center">
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Total</span>
                     <span className="text-2xl font-black text-slate-800">Rs. {selectedOrder.total.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-4">
                     <button onClick={() => setSelectedOrder(null)} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                     <button onClick={finalizeDispense} className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-200 flex items-center gap-3 transition-all transform hover:-translate-y-1">
                        <Truck size={20} /> Mark for Delivery
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
