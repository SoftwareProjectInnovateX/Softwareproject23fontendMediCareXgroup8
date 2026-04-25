import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  RotateCw, 
  Download, 
  Printer,
  User,
  AlertTriangle,
  FileBox,
  Info,
  X,
  Flag,
  CheckCircle,
  FileSignature,
  Pill,
  ArrowRight,
  Search,
  History,
  Send,
  BriefcaseMedical
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertContext } from '../../layouts/PharmacistLayout';
import { useContext } from 'react';
import { getPatients, updatePatient, addPatient, getPrescriptions, updatePrescription, addDispensedRecord, getDispensedHistory } from '../../services/pharmacistService';

const inventoryMeds = [
  { name: 'Lisinopril 10mg Tablets', stock: 1200, unitPrice: 15.50 },
  { name: 'Metformin 500mg ER Tablets', stock: 850, unitPrice: 8.25 },
  { name: 'Atorvastatin 20mg Tablets', stock: 500, unitPrice: 22.00 },
  { name: 'Amoxicillin 500mg Capsules', stock: 320, unitPrice: 12.00 },
  { name: 'Ibuprofen 400mg Tablets', stock: 2100, unitPrice: 4.50 },
  { name: 'Omeprazole 20mg Capsules', stock: 450, unitPrice: 18.75 },
  { name: 'Losartan 50mg Tablets', stock: 650, unitPrice: 16.00 },
  { name: 'Panadol 500mg', stock: 3000, unitPrice: 3.50 }
];

const PharmacistVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateQueueCount } = useContext(AlertContext);
  const [isVerified, setIsVerified] = useState(false);
  const [patients, setPatients] = useState([]);
  
  useEffect(() => {
     getPatients().then(setPatients).catch(console.error);
  }, []);

  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  
  const [showRegModal, setShowRegModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [isFlagSent, setIsFlagSent] = useState(false);
  const [flagLog, setFlagLog] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isRejectSent, setIsRejectSent] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLog, setRejectLog] = useState('');
  const [newPatient, setNewPatient] = useState({ firstName: '', lastName: '', dob: '', phone: '', address: '', email: '' });
  const [showApproveSuccess, setShowApproveSuccess] = useState(false);
  const [dispenseRecordId, setDispenseRecordId] = useState(null);

  const [orderItems, setOrderItems] = useState([
    { id: 1, name: 'Lisinopril 10mg Tablets', form: 'Oral Tablet', freq: 'Once daily', qty: 30, refills: 3, unitPrice: 15.50, total: 465.00 },
    { id: 2, name: 'Atorvastatin 20mg Tablets', form: 'Oral Tablet', freq: 'At bedtime', qty: 30, refills: 3, unitPrice: 22.00, total: 660.00 }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentDrug, setCurrentDrug] = useState('');
  const [currentDosage, setCurrentDosage] = useState('Oral Tablet');
  const [currentFreq, setCurrentFreq] = useState('');
  const [currentQty, setCurrentQty] = useState(1);
  const [currentRefills, setCurrentRefills] = useState(0);
  const [clinicalNote, setClinicalNote] = useState('');

  // removed localstorage patients sync

  const [activePrescription, setActivePrescription] = useState(null);

  useEffect(() => {
    const rxIdFromUrl = location.pathname.split('/').pop();
    const activeRxId = (rxIdFromUrl && rxIdFromUrl !== 'verification') ? rxIdFromUrl : '88291';
    
    getPrescriptions().then(queueList => {
       const match = queueList.find(q => q.id === activeRxId || q.queueId === activeRxId);
       if (match) {
           setActivePrescription(match);
       }
    }).catch(console.error);

    if (location.state?.rxPatientName) {
      const match = patients.find(p => p.name.toLowerCase() === location.state.rxPatientName.toLowerCase());
      if (match) {
        setSelectedPatient(match);
      } else {
        const newTempPatient = {
          id: '#' + Math.floor(Math.random() * 900000 + 100000),
          name: location.state.rxPatientName,
          dob: location.state.rxDob || 'Unknown',
          phone: '(000) 000-0000',
          age: 45,
          gender: 'Not Specified',
          avatarBg: 'e0e7ff',
          avatarColor: '4338ca',
          address: 'System Generated Entry',
          notes: []
        };
        setPatients(prev => [newTempPatient, ...prev]);
        setSelectedPatient(newTempPatient);
      }
      
      // Clean up routing state so manual refresh doesn't trigger loop
      if (!location.state.flagMessage) {
         window.history.replaceState({}, document.title);
      }
    }
  }, [location.state?.rxPatientName, location.pathname, patients]);

  const flagContextMessage = location.state?.flagMessage;

  const handlePatientSearch = (e) => {
    setPatientSearch(e.target.value);
    setShowPatientSuggestions(true);
  };

  const handleApprove = async () => {
    if (!selectedPatient) {
      alert("Please assign a patient to this prescription before approving.");
      return;
    }
    if (orderItems.length === 0) {
      alert("Please add at least one medication to generate the bill before approving.");
      return;
    }

    const rxIdFromUrl = location.pathname.split('/').pop();
    const activeRxId = (rxIdFromUrl && rxIdFromUrl !== 'verification') ? rxIdFromUrl : '88291';

    try {
      let activeIsDigital = false;
      const queueList = await getPrescriptions();
      const match = queueList.find(q => String(q.id) === String(activeRxId) || String(q.queueId) === String(activeRxId)); 
      // Actually, our custom IDs are mostly inside `id` or `queueId`.

      if (match) {
         activeIsDigital = match.isDigital || false;
         await updatePrescription(match.firebaseId || match.id, {
            status: 'Completed',
            patientId: selectedPatient?.id,
            statusStyle: 'bg-emerald-100 text-emerald-700',
            actionLabel: 'Verified',
            rowStyle: ''
         });
         // Delay queue update slightly to allow Firebase index to catch up
         setTimeout(() => updateQueueCount(), 600);
      }

      // Check if an ACTIVE dispensing record already exists for this Rx
      const existingDispQ = await getDispensedHistory();
      const existingDisp = existingDispQ.find(d => d.rxId === activeRxId && !d.finalized);
      
      let dispenseDocId;
      if (existingDisp) {
         dispenseDocId = existingDisp.firebaseId || existingDisp.id;
         // Optionally update it if needed, but we don't need to duplicate it.
      } else {
         const newDispenseRec = await addDispensedRecord({
               rxId: activeRxId,
               isDigital: activeIsDigital,
               orderItems: orderItems,
               verifiedPatient: selectedPatient?.name,
               patientId: selectedPatient?.id,
               total: orderItems.reduce((a,b)=>a+b.total,0),
               paymentStatus: 'Pending Payment',
               timestamp: Date.now(),
               dispensedDate: new Date().toDateString(),
               patientEmail: selectedPatient?.email || 'N/A'
         });
         dispenseDocId = newDispenseRec.id;
      }

      setDispenseRecordId(dispenseDocId);
    } catch(e) { 
      console.error(e); 
      alert("Database Error: " + e.message);
      return; // Stop the success modal from showing
    }

    setShowApproveSuccess(true);
    setTimeout(() => {
       setShowApproveSuccess(false);
       navigate('/pharmacist/dispensing', { 
         state: { 
            approved: true,
            rxId: activeRxId,
            orderItems: orderItems,
            verifiedPatient: selectedPatient?.name,
            patientId: selectedPatient?.id,
            total: orderItems.reduce((a,b)=>a+b.total,0),
            paymentStatus: 'Pending Payment'
         }
       });
    }, 1500); // Quick turnaround
  };

  const handleAddPatient = () => {
    if (!newPatient.firstName) return;
    const newId = '#' + Math.floor(Math.random() * 900000 + 100000);
    const dobObj = new Date(newPatient.dob);
    const dobString = isNaN(dobObj) ? 'Jan 01, 1990' : dobObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const age = isNaN(dobObj) ? 34 : new Date().getFullYear() - dobObj.getFullYear();
    
    const p = {
      id: newId,
      name: `${newPatient.firstName} ${newPatient.lastName}`,
      dob: dobString,
      age: age,
      gender: 'Unknown',
      phone: newPatient.phone || 'N/A',
      email: newPatient.email || 'N/A',
      address: newPatient.address || 'N/A',
      insurance: 'N/A',
      insuranceId: 'N/A',
      physician: 'N/A',
      activeCount: 0,
      fading: false,
      avatarColor: '0ea5e9',
      avatarBg: 'e0f2fe',
      timestamp: Date.now(),
      medications: [],
      notes: []
    };
    setPatients([p, ...patients]);
    setSelectedPatient(p);
    setShowRegModal(false);
    setNewPatient({ firstName: '', lastName: '', dob: '', phone: '', address: '', email: '' });
    addPatient(p).catch(console.error);
  };

  const handleRejectSubmit = () => {
    setIsRejectSent(true);
    setTimeout(async () => {
      const rxIdFromUrl = location.pathname.split('/').pop();
      const activeRxId = (rxIdFromUrl && rxIdFromUrl !== 'verification') ? rxIdFromUrl : '88291';
      
      try {
         const queueList = await getPrescriptions();
         const match = queueList.find(q => String(q.id) === String(activeRxId) || String(q.queueId) === String(activeRxId));
         if (match) {
            // we could either delete it or mark as rejected. The UI simulated delete.
            await updatePrescription(match.firebaseId || match.id, {
               status: 'Rejected',
               statusStyle: 'bg-red-100 text-red-700',
               actionLabel: 'Archived',
               rowStyle: 'bg-red-50 opacity-60'
            });
            updateQueueCount();
         }
      } catch(e) {}
      
      setIsRejectSent(false);
      setShowRejectModal(false);
      navigate('/pharmacist/prescriptions', { state: { flagMessage: "System: Rejected" } });
    }, 2500);
  };

  const handleFlagSubmit = () => {
    setIsFlagSent(true);
    setTimeout(async () => {
      const rxIdFromUrl = location.pathname.split('/').pop();
      const activeRxId = (rxIdFromUrl && rxIdFromUrl !== 'verification') ? rxIdFromUrl : '88291';
      
      try {
         const queueList = await getPrescriptions();
         const match = queueList.find(q => String(q.id) === String(activeRxId) || String(q.queueId) === String(activeRxId));
         if (match) {
            await updatePrescription(match.firebaseId || match.id, {
               status: 'Flagged',
               statusStyle: 'bg-amber-100 text-amber-700',
               actionLabel: 'Review',
               rowStyle: 'bg-amber-50 border-l-4 border-amber-500'
            });
            updateQueueCount();
         }
      } catch(e) {}

      setIsFlagSent(false);
      setShowFlagModal(false);
      navigate('/pharmacist/prescriptions', { state: { flaggedId: activeRxId, flaggedPatient: selectedPatient || { name: 'Unknown Patient' }, flagMessage: flagLog } });
    }, 2500);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10 relative">
      
      {/* Approval Success Overlay */}
      {showApproveSuccess && (
        <div className="fixed inset-0 z-[110] flex justify-center items-center backdrop-blur-sm" style={{backgroundColor: 'rgba(15, 23, 42, 0.4)'}}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[450px] p-8 text-center animate-in zoom-in-95 duration-300">
             <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 mx-auto">
               <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg">
                 <CheckCircle className="w-8 h-8 animate-in spin-in duration-500" />
               </div>
             </div>
             <h2 className="text-2xl font-black text-slate-800 mb-2">Approved & Bill Sent!</h2>
             <p className="text-sm text-slate-500 mb-6">The prescription has been formally verified. An email containing the final bill of <strong className="text-slate-800">Rs. {orderItems.reduce((a,b)=>a+b.total,0).toFixed(2)}</strong> and order approval has been dispatched to {selectedPatient?.name}.</p>
             <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between shadow-inner">
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Status</p>
                  <p className="font-bold text-emerald-700 text-sm">Dispatched directly to patient</p>
                </div>
                <FileSignature className="w-6 h-6 text-emerald-300" />
             </div>
             

          </div>
        </div>
      )}

      {/* PharmacistHeader section */}
      <div>
        <button 
          onClick={() => navigate('/pharmacist/prescriptions')} 
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Queue
        </button>

        <p className="text-sm font-bold text-slate-500 tracking-wider">PRESCRIPTION / VERIFICATION WORKSPACE</p>
        <h1 className="text-3xl font-black text-slate-800 mt-1">RX-{activePrescription?.id || location.pathname.split('/').pop()}</h1>
        <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span> In Progress
        </p>
      </div>

      {/* Two Column PharmacistLayout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Document Viewer */}
        <div className="card bg-slate-50 border-slate-200 shadow-inner flex flex-col items-center justify-center p-8 relative min-h-[600px]">
          
          {/* Floating Toolbar */}
          <div className="bg-white rounded-full shadow-lg border border-slate-200 px-4 py-2 flex gap-4 items-center absolute top-6 z-10">
            <button className="text-slate-500 hover:text-blue-600 transition-colors p-1"><ZoomIn className="w-5 h-5" /></button>
            <button className="text-slate-500 hover:text-blue-600 transition-colors p-1"><ZoomOut className="w-5 h-5" /></button>
            <div className="w-px h-5 bg-slate-200"></div>
            <button className="text-slate-500 hover:text-blue-600 transition-colors p-1"><RotateCcw className="w-5 h-5" /></button>
            <button className="text-slate-500 hover:text-blue-600 transition-colors p-1"><RotateCw className="w-5 h-5" /></button>
            <div className="w-px h-5 bg-slate-200"></div>
            <button className="text-slate-500 hover:text-blue-600 transition-colors p-1"><Download className="w-5 h-5" /></button>
            <button className="text-slate-500 hover:text-blue-600 transition-colors p-1"><Printer className="w-5 h-5" /></button>
          </div>

          {/* Prescription Image */}
          <div className="bg-white p-2 rounded-xl shadow-md border border-slate-200 mt-10 max-w-full overflow-hidden">
             {activePrescription?.imageUrl ? (
                <img src={activePrescription.imageUrl} alt="Scanned Prescription" className="w-full h-auto object-contain rounded-lg border border-slate-100" />
             ) : (
                <img src="/prescription.png" alt="Demo Prescription" className="w-full h-auto object-contain rounded-lg border border-slate-100" />
             )}
          </div>
        </div>

        {/* Right Column: PharmacistVerification Tools */}
        <div className="space-y-6">
          
          {/* Patient Selection block */}
          <div className="card py-5 h-auto">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
               <User className="w-4 h-4" /> Patient Selection
             </h3>
             {!selectedPatient ? (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={patientSearch}
                      onChange={(e) => {
                         setPatientSearch(e.target.value);
                         setShowPatientSuggestions(true);
                      }}
                      placeholder="Search patient by name, phone or ID..." 
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  
                  {showPatientSuggestions && patientSearch && (
                    <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                       {patients.filter(p => 
                          p.name.toLowerCase().includes(patientSearch.toLowerCase()) || 
                          p.id.toLowerCase().includes(patientSearch.toLowerCase()) ||
                          p.phone.includes(patientSearch)
                       ).map(p => (
                         <div 
                           key={p.id}
                           onClick={() => {
                              setSelectedPatient(p);
                              setShowPatientSuggestions(false);
                              setPatientSearch('');
                           }}
                           className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0"
                         >
                           <div>
                             <span className="font-bold text-sm text-slate-800">{p.name} <span className="text-xs font-normal text-slate-500 ml-1">({p.age}y)</span></span>
                             <div className="text-xs text-slate-500 mt-0.5">{p.phone} • {p.dob}</div>
                           </div>
                           <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{p.id}</span>
                         </div>
                       ))}
                       
                       {/* Not found / Register button */}
                       {patients.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.id.toLowerCase().includes(patientSearch.toLowerCase()) || p.phone.includes(patientSearch)).length === 0 && (
                          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                             <p className="text-xs text-slate-500 mb-2">Patient not found?</p>
                             <button 
                               onClick={() => {
                                  setShowPatientSuggestions(false);
                                  setShowRegModal(true);
                               }}
                               className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-bold py-2 px-4 rounded-md transition-colors shadow-sm w-full"
                             >
                                Register New Patient
                             </button>
                          </div>
                       )}
                    </div>
                  )}
                </div>
             ) : (
                <div className="flex items-center gap-4 p-4 border border-blue-100 bg-blue-50/30 rounded-xl relative">
                   <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center border-2 border-white shadow-sm" style={{backgroundColor: `#${selectedPatient.avatarBg}` }}>
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPatient.name)}&background=${selectedPatient.avatarBg}&color=${selectedPatient.avatarColor}`} alt={selectedPatient.name} className="w-full h-full object-cover" />
                   </div>
                   <div className="flex-1 pr-6">
                     <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                       {selectedPatient.name}
                       <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{selectedPatient.id}</span>
                     </h2>
                     <p className="text-xs text-slate-500 font-medium mt-1">DOB: {selectedPatient.dob} ({selectedPatient.age}y) | Phone: {selectedPatient.phone} | Email: {selectedPatient.email || 'N/A'}</p>
                   </div>
                   <button 
                     onClick={() => setSelectedPatient(null)}
                     className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 bg-white rounded-full border border-slate-200 shadow-sm"
                     title="Change Patient"
                   >
                     <X className="w-3.5 h-3.5" />
                   </button>
                </div>
             )}
          </div>

          {/* Order Details */}
          <div className="card py-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
              <FileBox className="w-4 h-4" /> Order Details
            </h3>
            
            {/* Added Items List with Billing */}
            {orderItems.length > 0 ? (
              <div className="mb-6 space-y-4">
                 <div className="flex flex-col gap-2 p-1">
                 {orderItems.map((item, idx) => (
                   <div key={idx} className="flex flex-col p-4 border border-slate-200 rounded-xl bg-slate-50 shadow-sm relative group overflow-hidden">
                     <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded bg-[#020b2d] text-white flex justify-center items-center shrink-0">
                           <Pill className="w-4 h-4" />
                         </div>
                         <div>
                           <p className="text-sm font-bold text-slate-800 leading-tight">{item.name}</p>
                           <p className="text-[11px] text-slate-500 font-medium mt-0.5">{item.form} • {item.freq}</p>
                         </div>
                       </div>
                       <button 
                         onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                         className="text-slate-400 hover:text-red-500 transition-colors bg-white rounded-full p-1 border border-slate-200 shadow-sm"
                       >
                         <X className="w-3.5 h-3.5" />
                       </button>
                     </div>
                     <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 mt-2">
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
                           <label className="flex items-center gap-2">Qty:
                             <input type="number" min="1" className="w-16 border border-slate-200 p-1.5 rounded-md focus:border-emerald-500 focus:outline-none" value={item.qty} onChange={(e) => {
                                const newQty = parseInt(e.target.value) || 0;
                                setOrderItems(orderItems.map((o, i) => i === idx ? {...o, qty: newQty, total: newQty * o.unitPrice} : o));
                             }} />
                           </label>
                           <span className="text-slate-400 font-medium whitespace-nowrap">@ Rs. {item.unitPrice.toFixed(2)}</span>
                        </div>
                        <span className="text-sm">Rs. <strong className="text-emerald-700 text-lg">{item.total.toFixed(2)}</strong></span>
                     </div>
                   </div>
                 ))}
                 </div>
                 
                 <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100 flex justify-between items-center shadow-inner mt-4 mx-1">
                    <div>
                      <span className="font-black text-slate-800 text-sm block">Total Bill Amount</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{orderItems.length} Medications</span>
                    </div>
                    <span className="text-3xl font-black text-emerald-800">Rs. {orderItems.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}</span>
                 </div>
              </div>
            ) : (
               <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center mb-6">
                 <p className="text-sm font-bold text-slate-500">No medications added to the bill yet.</p>
               </div>
            )}
            
            <div className={`space-y-4 ${orderItems.length > 0 ? 'border-t border-slate-100 pt-5' : ''}`}>
               <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Add Item to Bill & Prescription</h4>
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Search PharmacistInventory (Auto-prices applied)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => {
                       setSearchQuery(e.target.value);
                       setCurrentDrug(e.target.value);
                       setShowSuggestions(true);
                    }}
                    placeholder="Type drug name..." 
                    className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all font-bold" 
                  />
                  {showSuggestions && searchQuery && (
                    <div className="absolute bottom-full mb-1 left-0 z-50 w-full mt-1 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                      {inventoryMeds.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).map((m, i) => (
                         <div 
                          key={i}
                          onClick={() => {
                            setSearchQuery('');
                            setCurrentDrug('');
                            setOrderItems([...orderItems, { 
                               id: Date.now(), 
                               name: m.name, 
                               qty: currentQty || 10, 
                               form: currentDosage || 'Oral Tablet', 
                               freq: currentFreq || 'Once Daily', 
                               refills: currentRefills || 0,
                               unitPrice: m.unitPrice,
                               total: (currentQty || 10) * m.unitPrice
                            }]);
                            setShowSuggestions(false);
                          }}
                          className="px-4 py-3 hover:bg-emerald-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0 transition-colors"
                        >
                          <div>
                             <span className="font-black text-sm text-slate-800 block">{m.name}</span>
                             <span className="text-xs text-emerald-600 font-bold mt-0.5 block">Rs. {m.unitPrice.toFixed(2)} per unit</span>
                          </div>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider">{m.stock} In Stock</span>
                        </div>
                      ))}
                      {inventoryMeds.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <div className="px-4 py-3 text-sm text-slate-500 font-medium text-center">No results in inventory.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Dosage Form</label>
                  <select 
                    value={currentDosage}
                    onChange={(e) => setCurrentDosage(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                     <option>Oral Tablet</option>
                     <option>Oral Capsule</option>
                     <option>Liquid</option>
                     <option>Topical Cream</option>
                     <option>Inhaler</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Default Frequency</label>
                  <input type="text" value={currentFreq} onChange={e => setCurrentFreq(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Once Daily" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Default Quantity</label>
                  <input type="number" value={currentQty} onChange={e => setCurrentQty(parseInt(e.target.value) || 1)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Refills</label>
                  <input type="number" value={currentRefills} onChange={e => setCurrentRefills(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Conditional Sections based on Selected Patient */}
          {selectedPatient && (
            <>
              {/* Past Clinical Notes */}
              <div className="card py-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <History className="w-4 h-4" /> Past Clinical Notes
                </h3>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                   {selectedPatient.notes && selectedPatient.notes.length > 0 ? (
                     selectedPatient.notes.map((note, idx) => (
                       <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-3 shadow-sm">
                         <div className="flex justify-between items-start mb-1.5">
                           <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{note.type}</span>
                           <span className="text-[10px] font-bold text-slate-400">{note.date}</span>
                         </div>
                         <p className="text-xs font-medium text-slate-700 mb-2 leading-relaxed">{note.content}</p>
                         <div className="flex items-center gap-1.5">
                           <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[7px] font-bold uppercase">{note.authorInitials}</div>
                           <span className="text-[9px] text-slate-500 font-bold uppercase">{note.author}</span>
                         </div>
                       </div>
                     ))
                   ) : (
                     <p className="text-sm text-slate-500 italic py-2">No past clinical notes found for this patient.</p>
                   )}
                </div>
              </div>

              {/* Add New Clinical Note */}
              <div className="card py-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <FileSignature className="w-4 h-4" /> Add PharmacistVerification Note
                </h3>
                <textarea 
                  value={clinicalNote}
                  onChange={e => setClinicalNote(e.target.value)}
                  className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Add internal verification notes or instructions for the technician..."
                ></textarea>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="bg-white border flex justify-between gap-4 p-4 rounded-2xl shadow-sm border-slate-200 mt-2">
             <button 
               onClick={() => {
                 if (!selectedPatient) {
                   alert("Please assign a patient to this prescription before rejecting. An email needs to be sent to the assigned patient.");
                   return;
                 }
                 setShowRejectModal(true);
               }}
               className="flex items-center justify-center gap-2 flex-1 border border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-full font-bold text-sm transition-colors"
             >
               <X className="w-4 h-4" /> Reject
             </button>
             <button 
               onClick={() => {
                 if (!selectedPatient) {
                   alert("Please assign a patient to this prescription before flagging. An email needs to be sent to the assigned patient.");
                   return;
                 }
                 setShowFlagModal(true);
               }}
               className="flex items-center justify-center flex-1 border border-amber-300 text-amber-600 hover:bg-amber-50 py-3 px-4 rounded-full font-bold text-sm transition-colors text-center leading-tight"
             >
               Flag for Clarification
             </button>
             <button 
               onClick={handleApprove}
               className="flex items-center justify-center gap-2 flex-[1.5] bg-[#020b2d] hover:bg-[#0a192f] text-white py-3 rounded-full font-bold text-sm transition-colors shadow-md"
             >
               <CheckCircle className="w-4 h-4 text-blue-300" /> Approve & Send Bill
             </button>
          </div>

        </div>
      </div>

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            <div className="bg-amber-50 px-6 py-4 flex items-center gap-3 border-b border-amber-100">
              <Flag className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-slate-800">Flag for Clarification</h2>
              <button 
                onClick={() => setShowFlagModal(false)}
                className="ml-auto text-slate-400 hover:text-slate-600"
              ><X className="w-5 h-5" /></button>
            </div>
            
            {isFlagSent ? (
              <div className="p-8 text-center bg-white flex flex-col items-center">
                <CheckCircle className="w-16 h-16 text-emerald-500 mb-4 animate-in zoom-in duration-300" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Clarification Sent</h3>
                <p className="text-slate-500 text-sm">An email has been sent to {selectedPatient?.name || 'the patient'} addressing the clarifications.</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Message to Prescriber/Patient</label>
                  <textarea
                    value={flagLog}
                    onChange={(e) => setFlagLog(e.target.value)}
                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    placeholder="E.g. Dosage seems unusually high. Please confirm..."
                  ></textarea>
                </div>
                <div className="flex gap-3 justify-end mt-6">
                  <button onClick={() => setShowFlagModal(false)} className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                  <button 
                    onClick={handleFlagSubmit} 
                    className="px-5 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-md flex items-center gap-2 transition-colors"
                    disabled={!flagLog}
                  >
                    <Send className="w-4 h-4" /> Send Request
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Filter/Registration Modals */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex justify-center items-center backdrop-blur-sm" style={{backgroundColor: 'rgba(15, 23, 42, 0.4)'}}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Add New Patient</h2>
              <button 
                onClick={() => setShowRegModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">First Name</label>
                <input type="text" value={newPatient.firstName} onChange={e => setNewPatient({...newPatient, firstName: e.target.value})} placeholder="John" className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm mt-1 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Last Name</label>
                <input type="text" value={newPatient.lastName} onChange={e => setNewPatient({...newPatient, lastName: e.target.value})} placeholder="Doe" className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm mt-1 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Date of Birth</label>
                <input type="date" value={newPatient.dob} onChange={e => setNewPatient({...newPatient, dob: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm mt-1 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                <input type="tel" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} placeholder="(555) 000-0000" className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm mt-1 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                <input type="email" value={newPatient.email} onChange={e => setNewPatient({...newPatient, email: e.target.value})} placeholder="patient@example.com" className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm mt-1 outline-none focus:border-blue-500" />
              </div>
              <div className="col-span-2">
                 <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
                 <input type="text" value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} placeholder="123 Main St, City, ST" className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm mt-1 outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setShowRegModal(false)}
                className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors text-sm"
              >Cancel</button>
              <button 
                onClick={handleAddPatient}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg transition-colors shadow-sm text-sm"
              >Save Patient</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            <div className="bg-red-50 px-6 py-4 flex items-center gap-3 border-b border-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-bold text-slate-800">Reject Prescription</h2>
              <button 
                onClick={() => setShowRejectModal(false)}
                className="ml-auto text-slate-400 hover:text-slate-600"
              ><X className="w-5 h-5" /></button>
            </div>
            
            {isRejectSent ? (
               <div className="p-8 text-center bg-white flex flex-col items-center">
                 <CheckCircle className="w-16 h-16 text-red-500 mb-4 animate-in zoom-in duration-300" />
                 <h3 className="text-xl font-bold text-slate-800 mb-2">Prescription Rejected</h3>
                 <p className="text-slate-500 text-sm">An email outlining the reason for rejection has been sent to {selectedPatient?.name || 'the patient'}.</p>
               </div>
            ) : (
                <div className="p-6">
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Reason for Rejection</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                    >
                      <option>Invalid Prescription Date</option>
                      <option>Medication Interactions Detected</option>
                      <option>Missing Physician Signature</option>
                      <option>Other / Custom Reason</option>
                    </select>
                    
                    <textarea
                      value={rejectLog}
                      onChange={(e) => setRejectLog(e.target.value)}
                      className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                      placeholder="Add specific details to include in the notification to the patient..."
                    ></textarea>
                  </div>
                  <div className="flex gap-3 justify-end mt-6">
                    <button onClick={() => setShowRejectModal(false)} className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                    <button 
                      onClick={handleRejectSubmit} 
                      className="px-5 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center gap-2 transition-colors"
                      disabled={!rejectLog}
                    >
                      <Send className="w-4 h-4" /> Reject & Notify
                    </button>
                  </div>
                </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default PharmacistVerification;

