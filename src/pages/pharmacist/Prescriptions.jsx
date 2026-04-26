import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, arrayUnion, Timestamp, getDocs, orderBy, limit, query } from "firebase/firestore";
import { 
  FileText, Phone, MapPin, ExternalLink, CheckCircle, XCircle, 
  ClipboardList, Plus, Trash2, Clock, Calendar, ChevronRight,
  User, Image as ImageIcon, ShoppingBag, Search, History, Pill
} from "lucide-react";
import { getInventory, updateInventoryItem } from "../../services/pharmacistService";

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
  
  // Inventory State
  const [inventoryMeds, setInventoryMeds] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  
  // Detailed Timing States
  const [selTimes, setSelTimes] = useState([]); 
  const [selFood, setSelFood] = useState('');
  const [duration, setDuration] = useState(1);
  const [showBillPreview, setShowBillPreview] = useState(false);

  // Helper to parse numeric dosage
  const parseDosage = (d) => {
    const match = d.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[0]) : 1;
  };

  // Auto-calculate quantity
  useEffect(() => {
    if (selTimes.length > 0) {
      const dosageVal = parseDosage(currentMed.dosage);
      const total = Math.ceil(selTimes.length * dosageVal * duration);
      setCurrentMed(prev => ({...prev, qty: total}));
    }
  }, [selTimes, currentMed.dosage, duration]);

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

  const loadInventory = async (attempt = 1) => {
    try {
      const inv = await getInventory();
      if (Array.isArray(inv)) {
        const mapped = inv.map(item => ({
          id: item.id,
          name: item.name || item.productName || item.itemName || 'Unknown',
          category: item.category || 'other',
          stock: Number(item.stock ?? item.qty ?? item.quantity ?? item.totalStock ?? item.currentStock ?? 0),
          unitPrice: Number(item.retailPrice || item.price || item.unitPrice || item.sellingPrice || item.cost || item.amount || 0),
        })).filter(m => m.name !== 'Unknown' && m.category.toLowerCase() === 'medicine');
        setInventoryMeds(mapped);
      }
    } catch (err) {
      console.error(`Inventory load attempt ${attempt} failed:`, err);
      if (attempt < 3) setTimeout(() => loadInventory(attempt + 1), 2000 * attempt);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
    loadInventory();
  }, []);

  const addMedication = async () => {
    if (!currentMed.name || !currentMed.qty) return;
    const qty = parseInt(currentMed.qty);
    const price = parseFloat(currentMed.price) || 0;
    
    const combinedTiming = [...selTimes, selFood, currentMed.timing].filter(Boolean).join(' - ');
    const newItem = { 
      ...currentMed, 
      timing: combinedTiming,
      id: Date.now(), 
      inventoryId: selectedInventoryItem?.id || null 
    };
    
    setMeds([...meds, newItem]);

    // Real-time stock deduction
    if (selectedInventoryItem) {
       const updatedStock = Math.max(0, selectedInventoryItem.stock - qty);
       setInventoryMeds(inventoryMeds.map(m => m.id === selectedInventoryItem.id ? { ...m, stock: updatedStock } : m));
       try {
          await updateInventoryItem(selectedInventoryItem.id, { stock: updatedStock, qty: updatedStock, quantity: updatedStock });
       } catch (e) { console.error("Inventory update error", e); }
    }

    setCurrentMed({ name: '', dosage: '', timing: '', qty: '', price: '' });
    setSelTimes([]);
    setSelFood('');
    setDuration(1);
    setSelectedInventoryItem(null);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const removeMed = async (id) => {
    const itemToRemove = meds.find(m => m.id === id);
    if (itemToRemove && itemToRemove.inventoryId) {
       const invItem = inventoryMeds.find(m => m.id === itemToRemove.inventoryId);
       if (invItem) {
          const restoredStock = invItem.stock + parseInt(itemToRemove.qty);
          setInventoryMeds(inventoryMeds.map(m => m.id === itemToRemove.inventoryId ? { ...m, stock: restoredStock } : m));
          try {
             await updateInventoryItem(itemToRemove.inventoryId, { stock: restoredStock, qty: restoredStock, quantity: restoredStock });
          } catch (e) { console.error("Inventory restore error", e); }
       }
    }
    setMeds(meds.filter(m => m.id !== id));
  };

  const handleApprove = async () => {
    if (!selectedRx || meds.length === 0) return;
    setIsSubmitting(true);
    try {
      const totalAmount = meds.reduce((sum, m) => sum + (parseFloat(m.price) || 0) * (parseInt(m.qty) || 0), 0);
      const rxRef = doc(db, "prescriptions", selectedRx.id);
      
      const billData = {
        status: "Approved",
        medications: meds.map(({name, dosage, timing, qty, price}) => ({
          name, dosage, timing, qty: parseInt(qty), price: parseFloat(price) || 0, total: parseInt(qty) * parseFloat(price)
        })),
        orderItems: meds.map(({name, dosage, timing, qty, price}) => ({
          name, form: dosage, timing, qty: parseInt(qty), price: parseFloat(price) || 0, total: parseInt(qty) * parseFloat(price)
        })),
        totalAmount: totalAmount,
        total: totalAmount,
        processedAt: Timestamp.now(),
        pharmacistProcessed: true,
        paymentStatus: "Pending"
      };

      await updateDoc(rxRef, billData);
      
      alert(`Bill for Rs. ${totalAmount.toFixed(2)} has been sent to ${selectedRx.customerName}!`);
      setShowBillPreview(false);
      setSelectedRx(null);
      setMeds([]);
      fetchPrescriptions();
    } catch (err) {
      alert(`Failed to approve: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRx) return;
    if (!confirm("Are you sure you want to reject this prescription?")) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "prescriptions", selectedRx.id), {
        status: "Rejected",
        processedAt: Timestamp.now(),
        pharmacistProcessed: true
      });
      alert("Prescription rejected.");
      setSelectedRx(null);
      fetchPrescriptions();
    } catch (err) {
      alert(`Failed to reject: ${err.message}`);
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
              <div className={`flex items-center justify-between gap-2 text-[11px] ${selectedRx?.id === p.id ? 'text-blue-100' : 'text-slate-500'}`}>
                <div className="flex items-center gap-2">
                  <Clock size={12} />
                  {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString() : 'Recent'}
                </div>
                {p.status === 'Approved' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRx(p);
                      setMeds(p.medications || []);
                      setShowBillPreview(true);
                    }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-black uppercase text-[9px] border ${
                      selectedRx?.id === p.id ? 'bg-white/20 border-white/30 text-white' : 'bg-blue-50 border-blue-100 text-blue-600'
                    }`}
                  >
                    <FileText size={10} /> View Bill
                  </button>
                )}
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

               {/* Medication Entry Terminal */}
               <div className="bg-slate-50 border border-slate-200 rounded-[28px] p-6 mb-6 space-y-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                     <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                     <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Medication Entry</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Medication Name</label>
                      <div className="relative group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${showSuggestions ? 'text-blue-500' : 'text-slate-400'}`} />
                        <input 
                          type="text" 
                          placeholder="Search pharmaceutical name..."
                          className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-[18px] text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm placeholder:text-slate-300"
                          value={currentMed.name}
                          onChange={e => {
                            const val = e.target.value;
                            setCurrentMed({...currentMed, name: val});
                            setSearchQuery(val);
                            setShowSuggestions(true);
                            
                            const exact = inventoryMeds.find(m => m.name.toLowerCase() === val.toLowerCase());
                            if (exact) {
                               setCurrentMed(prev => ({...prev, price: exact.unitPrice}));
                               setSelectedInventoryItem(exact);
                            } else {
                               setSelectedInventoryItem(null);
                            }
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        />
                        {showSuggestions && (searchQuery || inventoryMeds.length > 0) && (
                          <div className="absolute top-full left-0 z-[100] w-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden max-h-64 overflow-y-auto border-t-0">
                            {inventoryMeds.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).map((m, i) => (
                              <div 
                                key={i}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setCurrentMed(prev => ({ ...prev, name: m.name, price: m.unitPrice }));
                                  setSelectedInventoryItem(m);
                                  setShowSuggestions(false);
                                }}
                                className="px-5 py-3.5 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0 transition-colors group"
                              >
                                <div>
                                   <span className="font-bold text-[13px] text-slate-800 block group-hover:text-blue-600 transition-colors">{m.name}</span>
                                   <span className="text-[9px] text-blue-500 font-black uppercase tracking-tighter">Rs. {m.unitPrice.toFixed(2)}</span>
                                </div>
                                <div className="text-right">
                                   <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-md uppercase tracking-widest">{m.stock} Units</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Dosage Unit</label>
                        <select 
                          value={currentMed.dosage} 
                          onChange={e => setCurrentMed({...currentMed, dosage: e.target.value})}
                          className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-[18px] text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all shadow-sm cursor-pointer appearance-none"
                        >
                          <option value="">Select unit...</option>
                          <option>1 Tablet</option>
                          <option>2 Tablets</option>
                          <option>1 Capsule</option>
                          <option>5ml (1 tsp)</option>
                          <option>10ml (2 tsp)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Days (Duration)</label>
                        <input 
                          type="number" 
                          min="1"
                          value={duration}
                          onChange={e => setDuration(parseInt(e.target.value) || 1)}
                          className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-[18px] text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all shadow-sm text-center"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Timing & Relation to Food</label>
                       <div className="flex flex-wrap gap-2.5 mb-4">
                         {['Morning', 'Afternoon', 'Night'].map(t => (
                           <button
                             key={t}
                             type="button"
                             onClick={() => {
                               if (selTimes.includes(t)) setSelTimes(selTimes.filter(x => x !== t));
                               else setSelTimes([...selTimes, t]);
                             }}
                             className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all border ${
                               selTimes.includes(t) 
                                 ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 translate-y-[-1px]' 
                                 : 'bg-white border-slate-200 text-slate-500 hover:border-blue-200'
                             }`}
                           >
                             {t}
                           </button>
                         ))}
                         <div className="w-full md:w-auto flex gap-2">
                           {['Before Food', 'After Food'].map(f => (
                             <button
                               key={f}
                               type="button"
                               onClick={() => setSelFood(selFood === f ? '' : f)}
                               className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all border flex-1 md:flex-none ${
                                 selFood === f 
                                   ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200 translate-y-[-1px]' 
                                   : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-200'
                               }`}
                             >
                               {f}
                             </button>
                           ))}
                         </div>
                       </div>
                       <input 
                         type="text" 
                         placeholder="Additional clinical remarks or instructions..."
                         className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-[18px] text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all shadow-sm italic placeholder:text-slate-300"
                         value={currentMed.timing}
                         onChange={e => setCurrentMed({...currentMed, timing: e.target.value})}
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Total Quantity</label>
                        <input 
                          type="number" 
                          placeholder="0"
                          className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-[18px] text-sm font-bold text-slate-800 outline-none focus:border-blue-500 shadow-sm"
                          value={currentMed.qty}
                          onChange={e => setCurrentMed({...currentMed, qty: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Price / Unit</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rs.</span>
                          <input 
                            type="number" 
                            className={`w-full pl-10 pr-4 py-3.5 border border-slate-200 rounded-[18px] text-sm font-bold text-slate-800 outline-none transition-all shadow-sm ${selectedInventoryItem ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:border-blue-500'}`}
                            value={currentMed.price}
                            readOnly={!!selectedInventoryItem}
                            onChange={e => setCurrentMed({...currentMed, price: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {currentMed.qty && currentMed.price && (
                    <div className="py-3 px-5 bg-blue-100/50 rounded-2xl border border-blue-200 flex justify-between items-center animate-in fade-in slide-in-from-top-2 duration-300">
                       <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">Live Subtotal</span>
                       <span className="text-[16px] font-black text-blue-700">Rs. {(parseFloat(currentMed.qty) * parseFloat(currentMed.price)).toFixed(2)}</span>
                    </div>
                  )}

                  <button 
                    onClick={addMedication}
                    className="w-full py-4 bg-blue-600 text-white font-black rounded-[18px] text-[11px] uppercase tracking-[0.25em] hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Plus size={18} /> Add to Prescription
                  </button>
               </div>

                {/* Medication List Tray */}
                <div className="flex-1 border border-slate-200 rounded-[28px] overflow-hidden flex flex-col mb-4 bg-white shadow-sm">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                       <History className="w-3.5 h-3.5" /> Added Items ({meds.length})
                    </h4>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar max-h-[300px]">
                    {meds.length === 0 ? (
                      <div className="p-10 text-center flex flex-col items-center gap-2">
                         <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                            <Plus size={24} />
                         </div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Terminal Empty</p>
                      </div>
                    ) : (
                      meds.map(m => (
                        <div key={m.id} className="group bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:bg-white hover:border-blue-100 hover:shadow-md transition-all flex items-center gap-4 relative overflow-hidden">
                           <div className="w-10 h-10 rounded-xl bg-white text-slate-400 flex items-center justify-center shrink-0 group-hover:text-blue-500 transition-colors">
                              <Pill className="w-5 h-5" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-black text-slate-800 truncate leading-tight mb-1">{m.name}</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                                 {m.dosage} • {m.timing} • {m.qty} Units
                              </p>
                           </div>
                           <div className="text-right shrink-0">
                              <p className="text-sm font-black text-slate-800">Rs. {(m.qty * m.price).toFixed(2)}</p>
                              <button 
                                onClick={() => removeMed(m.id)}
                                className="text-[8px] font-black text-red-400 hover:text-red-600 uppercase tracking-[0.2em] mt-1"
                              >
                                Delete
                              </button>
                           </div>
                           <div className="absolute left-0 top-0 h-full w-1 bg-slate-200 group-hover:bg-blue-500 transition-all"></div>
                        </div>
                      ))
                    )}
                  </div>

                  {meds.length > 0 && (
                    <div className="bg-[#020b2d] p-5 text-white flex justify-between items-center shadow-inner">
                      <div>
                         <p className="text-[8px] font-black text-blue-200 uppercase tracking-widest mb-1">Final Estimated Total</p>
                         <p className="text-[11px] text-white/50 font-bold leading-none">Incl. dispensing fee</p>
                      </div>
                      <p className="text-2xl font-black text-white">
                        Rs. {meds.reduce((sum, m) => sum + (m.qty * m.price), 0).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>

               {/* Action Buttons */}
               <div className="flex gap-3">
                 <button 
                   onClick={handleReject}
                   disabled={isSubmitting}
                   className="flex-1 border-2 border-slate-200 text-slate-400 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all disabled:opacity-50"
                 >
                   <XCircle size={18} /> Reject
                 </button>
                 <button 
                   onClick={() => setShowBillPreview(true)}
                   className="flex-1 flex flex-col items-center justify-center gap-1 p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
                 >
                   <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">Preview<br/>Bill</span>
                 </button>
                  <button 
                    onClick={handleApprove}
                    disabled={isSubmitting || meds.length === 0}
                    className="flex-[1.5] bg-blue-600 text-white py-3 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 active:scale-95"
                  >
                    {isSubmitting ? 'Processing...' : 'Approve & Send'}
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

      {/* Bill Preview Modal */}
      {showBillPreview && selectedRx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-white/20">
            {/* Elegant Header */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShoppingBag size={80} />
              </div>
              <h1 className="text-2xl font-black tracking-[0.2em] uppercase mb-1">MediCareX</h1>
              <p className="text-[10px] text-blue-100 opacity-80 uppercase tracking-[0.3em] font-bold">Official Digital Invoice</p>
            </div>
            
            <div className="p-8">
              <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Customer Details</p>
                  <p className="text-sm font-black text-slate-800">{selectedRx.customerName}</p>
                  <p className="text-xs font-bold text-blue-600 mt-1">{selectedRx.customerPhone}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date Issued</p>
                  <p className="text-sm font-black text-slate-800">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-4 mb-8 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Prescribed Items</p>
                {meds.map((m, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <div className="flex-1">
                      <p className="text-xs font-black text-slate-800">{m.name}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">{m.dosage} • {m.timing}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-800">Rs. {(m.qty * m.price).toFixed(2)}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{m.qty} Units @ {m.price}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              <div className="bg-blue-600 rounded-2xl p-5 text-white shadow-xl shadow-blue-200 mb-8 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Total Amount to Pay</p>
                  <p className="text-xs text-blue-100/60 font-bold italic">Inc. all pharmacy taxes</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black">Rs. {meds.reduce((sum, m) => sum + (m.qty * m.price), 0).toFixed(2)}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowBillPreview(false)}
                  className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="flex-[1.5] py-3.5 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Clock className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                  Approve & Send
                </button>
              </div>
            </div>
            
            <div className="bg-slate-900 p-4 text-center">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                <FileText size={12} className="text-blue-500" />
                Secured by MediCareX Cloud
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}