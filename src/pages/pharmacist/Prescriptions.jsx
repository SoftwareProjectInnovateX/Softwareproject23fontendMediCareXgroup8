import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, arrayUnion, Timestamp, getDocs, orderBy, limit, query } from "firebase/firestore";
import { 
  FileText, Phone, MapPin, ExternalLink, CheckCircle, XCircle, 
  ClipboardList, Plus, Trash2, Clock, Calendar, ChevronRight,
  User, Image as ImageIcon, ShoppingBag
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          "#f8fafc",
  surface:     "#ffffff",
  border:      "#e2e8f0",
  accent:      "#2563eb", // Royal Blue
  accentLight: "#dbeafe",
  success:     "#10b981",
  danger:      "#ef4444",
  warning:     "#f59e0b",
  textPrimary: "#1e293b",
  textMuted:   "#64748b",
  textSoft:    "#475569",
};

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedRx, setSelectedRx] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Form State for Medication Entry
  const [meds, setMeds] = useState([]);
  const [currentMed, setCurrentMed] = useState({ name: '', dosage: '', timing: '', qty: '', price: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch prescriptions - limit to 50 latest to save quota
  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "prescriptions"), orderBy("createdAt", "desc"), limit(50));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPrescriptions(data);
      
      if (selectedRx) {
        const updated = data.find(item => item.id === selectedRx.id);
        if (updated) setSelectedRx(updated);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const addMedication = () => {
    if (!currentMed.name || !currentMed.qty) return;
    setMeds([...meds, { ...currentMed, id: Date.now() }]);
    setCurrentMed({ name: '', dosage: '', timing: '', qty: '', price: '' });
  };

  const removeMed = (id) => {
    setMeds(meds.filter(m => m.id !== id));
  };

  const handleFinalize = async (status) => {
    if (!selectedRx) return;
    setIsSubmitting(true);
    try {
      const updateData = { 
        status,
        processedAt: Timestamp.now(),
        pharmacistNote: "Prescription processed by pharmacist."
      };
      
      if (status === 'Approved' && meds.length > 0) {
        updateData.medications = meds.map(({name, dosage, timing, qty, price}) => ({
          name, dosage, timing, qty: parseInt(qty), price: parseFloat(price) || 0
        }));
        updateData.totalAmount = meds.reduce((sum, m) => sum + (parseFloat(m.price) || 0) * (parseInt(m.qty) || 0), 0);
      }

      await updateDoc(doc(db, "prescriptions", selectedRx.id), updateData);
      alert(`Prescription ${status.toLowerCase()} successfully!`);
      if (status === 'Approved') {
         setSelectedRx(null);
         setMeds([]);
      }
    } catch (err) {
      alert(`Failed to update: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading prescriptions...</div>;

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 font-['Inter',sans-serif]">
      
      {/* ── Left Sidebar: Prescription List ── */}
      <div className="w-[380px] flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
        <div className="sticky top-0 bg-[#f8fafc] z-10 pb-2">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="text-blue-600" />
              Prescriptions
            </h1>
            <button 
              onClick={fetchPrescriptions}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
              title="Refresh List"
            >
              <Clock size={18} />
            </button>
          </div>
          <div className="flex gap-2 mt-4">
            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full uppercase tracking-wider">
              Pending: {prescriptions.filter(p => (p.status || 'Pending') === 'Pending').length}
            </span>
          </div>
        </div>

        {prescriptions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center mt-10">
            <ImageIcon size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium text-sm">No prescriptions found</p>
          </div>
        ) : (
          prescriptions.map(p => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedRx(p);
                setMeds(p.medications || []);
              }}
              className={`text-left p-4 rounded-2xl border transition-all duration-200 group relative ${
                selectedRx?.id === p.id 
                  ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-200' 
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <p className={`font-bold text-sm ${selectedRx?.id === p.id ? 'text-white' : 'text-slate-800'}`}>
                  {p.customerName || 'Anonymous User'}
                </p>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  p.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                  p.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {p.status || 'Pending'}
                </span>
              </div>
              <div className={`flex items-center gap-2 text-[11px] ${selectedRx?.id === p.id ? 'text-blue-100' : 'text-slate-500'}`}>
                <Clock size={12} />
                {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString() : 'Recent'}
              </div>
              <ChevronRight className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${
                selectedRx?.id === p.id ? 'text-white translate-x-1' : 'text-slate-300 group-hover:text-blue-400'
              }`} size={18} />
            </button>
          ))
        )}
      </div>

      {/* ── Right Content: Processing Form ── */}
      <div className="flex-1 bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden flex flex-col">
        {selectedRx ? (
          <div className="flex h-full overflow-hidden">
            
            {/* Left side: Image Viewer */}
            <div className="w-[45%] border-r border-slate-100 bg-slate-50/50 flex flex-col p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ImageIcon size={18} className="text-blue-600" />
                  Prescription Image
                </h3>
                {selectedRx.imageUrl && (
                  <a href={selectedRx.imageUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs font-semibold flex items-center gap-1">
                    <ExternalLink size={12} /> Open Full
                  </a>
                )}
              </div>
              <div className="flex-1 rounded-2xl border-2 border-slate-200 overflow-hidden bg-black flex items-center justify-center group relative">
                {selectedRx.imageUrl ? (
                  <img src={selectedRx.imageUrl} alt="Prescription" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-slate-500 text-sm">No image available</div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <p className="text-white text-xs font-bold px-4 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30">Click "Open Full" for HD view</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Name</p>
                    <p className="text-sm font-bold text-slate-800">{selectedRx.customerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</p>
                    <p className="text-sm font-bold text-slate-800">{selectedRx.customerPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</p>
                    <p className="text-sm font-bold text-slate-800">{selectedRx.customerAddress}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Medication Entry Form */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
               <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Process Prescription</h2>
                    <p className="text-xs text-slate-500 mt-1">Add medications as seen in the prescription.</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    selectedRx.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {selectedRx.status || 'Pending Review'}
                  </div>
               </div>

               {/* Add Medication Row */}
               <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6">
                 <div className="grid grid-cols-2 gap-3 mb-3">
                   <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Medication Name</label>
                     <input 
                       type="text" 
                       placeholder="e.g. Amoxicillin 500mg"
                       className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all"
                       value={currentMed.name}
                       onChange={e => setCurrentMed({...currentMed, name: e.target.value})}
                     />
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dosage</label>
                     <input 
                       type="text" 
                       placeholder="e.g. 1 capsule"
                       className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all"
                       value={currentMed.dosage}
                       onChange={e => setCurrentMed({...currentMed, dosage: e.target.value})}
                     />
                   </div>
                 </div>
                 <div className="grid grid-cols-3 gap-3">
                   <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Timing</label>
                     <input 
                       type="text" 
                       placeholder="e.g. BD (Twice daily)"
                       className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all"
                       value={currentMed.timing}
                       onChange={e => setCurrentMed({...currentMed, timing: e.target.value})}
                     />
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quantity</label>
                     <input 
                       type="number" 
                       placeholder="0"
                       className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all"
                       value={currentMed.qty}
                       onChange={e => setCurrentMed({...currentMed, qty: e.target.value})}
                     />
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Unit Price (Rs.)</label>
                     <input 
                       type="number" 
                       placeholder="0.00"
                       className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all"
                       value={currentMed.price}
                       onChange={e => setCurrentMed({...currentMed, price: e.target.value})}
                     />
                   </div>
                 </div>
                 <button 
                   onClick={addMedication}
                   className="w-full mt-4 bg-white border border-blue-200 text-blue-600 font-bold py-2 rounded-xl text-xs hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                 >
                   <Plus size={14} /> Add Medication to List
                 </button>
               </div>

               {/* Medication List */}
               <div className="flex-1 border border-slate-200 rounded-2xl overflow-hidden flex flex-col mb-6">
                 <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Added Medications</span>
                   <span className="text-[10px] font-bold text-slate-400">{meds.length} Items</span>
                 </div>
                 <div className="flex-1 overflow-y-auto">
                   {meds.length === 0 ? (
                     <div className="p-8 text-center text-slate-400 text-xs italic">No medications added yet</div>
                   ) : (
                     <table className="w-full text-sm">
                       <thead className="bg-slate-50/50 text-[10px] text-slate-400 uppercase">
                         <tr>
                           <th className="px-4 py-2 text-left font-bold">Medicine</th>
                           <th className="px-4 py-2 text-center font-bold">Qty</th>
                           <th className="px-4 py-2 text-right font-bold">Subtotal</th>
                           <th className="px-4 py-2 w-10"></th>
                         </tr>
                       </thead>
                       <tbody>
                         {meds.map(m => (
                           <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                             <td className="px-4 py-3">
                               <p className="font-bold text-slate-700">{m.name}</p>
                               <p className="text-[10px] text-slate-500">{m.dosage} • {m.timing}</p>
                             </td>
                             <td className="px-4 py-3 text-center font-medium">{m.qty}</td>
                             <td className="px-4 py-3 text-right font-bold text-blue-600">Rs. {(m.qty * m.price).toFixed(2)}</td>
                             <td className="px-4 py-3">
                               <button onClick={() => removeMed(m.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                 <Trash2 size={14} />
                               </button>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   )}
                 </div>
                 {meds.length > 0 && (
                   <div className="bg-blue-50/50 p-4 border-t border-blue-100 flex justify-between items-center">
                     <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Estimated Total</span>
                     <span className="text-xl font-black text-blue-700">
                       Rs. {meds.reduce((sum, m) => sum + (m.qty * m.price), 0).toFixed(2)}
                     </span>
                   </div>
                 )}
               </div>

               {/* Action Buttons */}
               <div className="flex gap-3">
                 <button 
                   onClick={() => handleFinalize('Rejected')}
                   disabled={isSubmitting}
                   className="flex-1 border-2 border-red-500 text-red-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-all disabled:opacity-50"
                 >
                   <XCircle size={18} /> Reject Prescription
                 </button>
                 <button 
                   onClick={() => handleFinalize('Approved')}
                   disabled={isSubmitting || meds.length === 0}
                   className="flex-[2] bg-emerald-600 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
                 >
                   <CheckCircle size={18} /> {isSubmitting ? 'Processing...' : 'Approve & Send Quote'}
                 </button>
               </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <ClipboardList size={40} className="text-slate-200" />
            </div>
            <h2 className="text-xl font-bold text-slate-600">No Selection</h2>
            <p className="max-w-[300px] mt-2 text-sm">Select a prescription from the left sidebar to start processing medications.</p>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}