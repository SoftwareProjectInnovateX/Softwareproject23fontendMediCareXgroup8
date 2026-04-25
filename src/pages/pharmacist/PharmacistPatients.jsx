import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPatients, addPatient, updatePatient } from '../../services/pharmacistService';
import { 
  Search, 
  UserPlus, 
  AlertTriangle, 
  Plus,
  Pill,
  ClipboardList
} from 'lucide-react';

// initialPatients removed to ensure pure Firebase data

const PharmacistPatients = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [activePatientId, setActivePatientId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
     const initData = async () => {
         try {
             let pts = await getPatients();

             // Auto-delete medications older than 6 months locally or just filter them visually
             const sixMonthsAgo = new Date();
             sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
             const cutoffTime = sixMonthsAgo.getTime();

             const processed = pts.map(p => {
                if (p.medications) {
                   p.medications = p.medications.filter(med => {
                      let medTime = med.timestamp;
                      if (!medTime && med.date) {
                          const dateStr = med.date.includes(' at ') ? med.date.split(' at ')[0] : med.date;
                          medTime = new Date(dateStr).getTime();
                      }
                      return isNaN(medTime) ? true : medTime >= cutoffTime;
                   });
                   p.activeCount = p.medications.filter(m => m.status === 'Active').length;
                }
                return p;
             });

             setPatients(processed);
             setIsLoading(false);
         } catch(e) {
             console.error(e);
             setIsLoading(false);
         }
     };
     initData();
  }, []);
  const [sortBy, setSortBy] = useState('Recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [medFilter, setMedFilter] = useState('Active PharmacistPrescriptions');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedPatient, setEditedPatient] = useState(null);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ firstName: '', lastName: '', dob: '', phone: '', email: '', address: '' });
  const [newNote, setNewNote] = useState({ type: 'Counseling', content: '' });

  useEffect(() => {
    if (location.state?.searchTarget) {
      setSearchQuery(location.state.searchTarget);
      
      const matched = patients.find(p => 
        p.name.toLowerCase() === location.state.searchTarget.toLowerCase() || 
        p.id.toLowerCase() === location.state.searchTarget.toLowerCase()
      );
      if (matched) setActivePatientId(matched.id);
      
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const activePatient = patients.find(p => p.id === activePatientId) || null;

  const processedPatients = [...patients]
    .filter((patient, index, self) => 
      index === self.findIndex((p) => p.name.toLowerCase() === patient.name.toLowerCase())
    )
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'Recent') return b.timestamp - a.timestamp;
      if (sortBy === 'Name (A-Z)') return a.name.localeCompare(b.name);
      return 0;
    });

  const handleAddPatient = () => {
    if (!newPatient.firstName) return;
    const newId = '#' + Math.floor(Math.random() * 900000 + 100000);
    const p = {
      id: newId,
      name: `${newPatient.firstName} ${newPatient.lastName}`,
      dob: newPatient.dob || 'Jan 01, 1990',
      age: 34,
      gender: 'Unknown',
      phone: newPatient.phone,
      email: newPatient.email,
      address: newPatient.address,
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
    
    // Optimistic update
    setPatients([p, ...patients]);
    setActivePatientId(newId);
    setIsAddingPatient(false);
    setNewPatient({ firstName: '', lastName: '', dob: '', phone: '', email: '', address: '' });
    
    // Save to Firebase
    addPatient(p).then(savedP => {
      // replace mock with real ID if necessary, but we used custom ID `#XXXXX` so it's fine.
    }).catch(console.error);
  };

  const handleAddNote = () => {
    if (!newNote.content) return;
    const n = {
      type: newNote.type,
      date: new Date().toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: '2-digit'}),
      content: newNote.content,
      author: 'Pharm. User',
      authorInitials: 'ME'
    };
    const updatedPatients = patients.map(p => p.id === activePatientId ? { ...p, notes: [n, ...p.notes] } : p);
    setPatients(updatedPatients);
    setIsAddingNote(false);
    setNewNote({ type: 'Counseling', content: '' });

    // Save to Firebase
    const target = updatedPatients.find(p => p.id === activePatientId);
    if(target && target.firebaseId) {
        updatePatient(target.firebaseId, { notes: target.notes }).catch(console.error);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading patients from Firebase...</div>;

  return (
    <div className="flex -m-6 h-[calc(100vh-80px)] overflow-hidden relative">
      {/* Add Patient Modal */}
      {isAddingPatient && (
        <div className="fixed inset-0 z-50 flex justify-center items-center backdrop-blur-sm" style={{backgroundColor: 'rgba(15, 23, 42, 0.4)'}}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Add New Patient</h2>
              <button 
                onClick={() => setIsAddingPatient(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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
                <input type="email" value={newPatient.email} onChange={e => setNewPatient({...newPatient, email: e.target.value})} placeholder="john@example.com" className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm mt-1 outline-none focus:border-blue-500" />
              </div>
              <div className="col-span-2">
                 <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
                 <input type="text" value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} placeholder="123 Main St, City, ST" className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm mt-1 outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setIsAddingPatient(false)}
                className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors text-sm"
              >Cancel</button>
              <button 
                onClick={handleAddPatient}
                className="px-6 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm text-sm"
              >Add Patient</button>
            </div>
          </div>
        </div>
      )}

      {/* Left PharmacistSidebar: PharmacistPatients List */}
      <div className="w-1/3 border-r border-slate-200 bg-white flex flex-col min-w-[320px]">
        
        {/* List PharmacistHeader */}
        <div className="p-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-slate-800">PharmacistPatients</h1>
            <button 
              onClick={() => setIsAddingPatient(true)}
              className="bg-slate-100 p-2 rounded-md hover:bg-slate-200 transition-colors text-slate-600"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID or DOB..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
          </div>
          
          <div className="flex justify-between items-center text-xs text-slate-500 font-medium whitespace-nowrap overflow-hidden">
            <span>Showing {processedPatients.length} patients</span>
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              className="bg-transparent font-medium cursor-pointer hover:text-slate-800 outline-none text-right shrink-0"
            >
              <option>Recent</option>
              <option>Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Scrollable Patient List */}
        <div className="flex-1 overflow-y-auto w-full p-4 space-y-2">
          {processedPatients.map((patient) => {
            const isActive = patient.id === activePatientId;
            return (
              <div 
                key={patient.id} 
                onClick={() => setActivePatientId(patient.id)}
                className={`${isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-white hover:bg-slate-50 border border-transparent hover:border-slate-200'} p-4 rounded-xl transition-all cursor-pointer relative`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`font-bold leading-tight text-lg ${isActive ? 'text-white' : 'text-slate-800'}`}>{patient.name}</h3>
                    <p className={`text-lg mt-0.5 font-medium ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>ID: {patient.id}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                    isActive ? 'bg-blue-700 text-blue-100' : 
                    patient.fading ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {patient.activeCount} Active
                  </span>
                </div>
                <div className="flex justify-between items-end mt-4">
                   <p className={`text-xs font-medium flex items-center gap-1 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                     <span className={`text-[10px] ${isActive ? '' : 'text-slate-400'}`}>🎂</span> {patient.dob} ({patient.age}y)
                   </p>
                   {isActive && <span className="text-xs font-bold text-white hover:underline cursor-pointer">View Profile</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Content: Patient Profile Workspace */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 lg:p-8 space-y-6">
        {!activePatient ? (
           <div className="h-full min-h-[600px] flex flex-col items-center justify-center text-slate-400 animate-in fade-in duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <h2 className="text-xl font-bold text-slate-600 mb-2">Select a patient</h2>
              <p className="text-sm">Choose a patient from the list or add a new one to view their medical profile.</p>
           </div>
        ) : (
          <>
        {/* Top Actions */}
        <div className="flex justify-end">
          <button 
            onClick={() => {
              if (!isEditingProfile) {
                setEditedPatient({...activePatient});
              }
              setIsEditingProfile(!isEditingProfile);
            }}
            className="bg-white border border-slate-200 text-slate-600 font-bold text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            {isEditingProfile ? 'Cancel Editing' : 'Edit Profile'}
          </button>
        </div>

        {/* Global Info Box */}
        <div className="card shadow-sm border-slate-200">
          {isEditingProfile ? (
            <div className="space-y-4 animate-in fade-in duration-300">
               <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Edit Patient Information</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                   <input type="text" value={editedPatient?.name || ''} onChange={e => setEditedPatient({...editedPatient, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm outline-none focus:border-blue-500 font-semibold text-slate-700" />
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date of Birth</label>
                   <input type="text" value={editedPatient?.dob || ''} onChange={e => setEditedPatient({...editedPatient, dob: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm outline-none focus:border-blue-500 font-semibold text-slate-700" />
                 </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone</label>
                    <input type="text" value={editedPatient?.phone || ''} onChange={e => setEditedPatient({...editedPatient, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm outline-none focus:border-blue-500 font-semibold text-slate-700" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email</label>
                    <input type="text" value={editedPatient?.email || ''} onChange={e => setEditedPatient({...editedPatient, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm outline-none focus:border-blue-500 font-semibold text-slate-700" />
                  </div>
                 <div>
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Gender</label>
                   <input type="text" value={editedPatient?.gender || ''} onChange={e => setEditedPatient({...editedPatient, gender: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm outline-none focus:border-blue-500 font-semibold text-slate-700" />
                 </div>
                 <div className="md:col-span-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Address</label>
                   <input type="text" value={editedPatient?.address || ''} onChange={e => setEditedPatient({...editedPatient, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm outline-none focus:border-blue-500 font-semibold text-slate-700" />
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Insurance</label>
                   <input type="text" value={editedPatient?.insurance || ''} onChange={e => setEditedPatient({...editedPatient, insurance: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm outline-none focus:border-blue-500 font-semibold text-slate-700" />
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Primary Physician</label>
                   <input type="text" value={editedPatient?.physician || ''} onChange={e => setEditedPatient({...editedPatient, physician: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm outline-none focus:border-blue-500 font-semibold text-slate-700" />
                 </div>
               </div>
               <div className="flex justify-end gap-3 pt-2">
                 <button 
                   onClick={() => setIsEditingProfile(false)}
                   className="text-slate-500 hover:bg-slate-100 font-bold text-sm px-4 py-2 rounded-lg transition-colors"
                 >Cancel</button>
                 <button 
                   onClick={async () => {
                     if (!editedPatient) return;
                     const updatedPatients = patients.map(p => p.id === activePatient.id ? editedPatient : p);
                     setPatients(updatedPatients);
                     setIsEditingProfile(false);
                     if (activePatient.firebaseId) {
                       try {
                         await updatePatient(activePatient.firebaseId, editedPatient);
                       } catch (e) {
                         console.error("Error updating patient in Firebase:", e);
                       }
                     }
                   }}
                   className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-2 rounded-lg transition-colors shadow-sm"
                 >Save Changes</button>
               </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-8 items-start">
               
               {/* Avatar & Name */}
               <div className="flex gap-5 items-center md:border-r border-slate-100 md:pr-8 min-w-max">
                  <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 flex items-center justify-center" style={{backgroundColor: `#${activePatient.avatarBg}`, border: `2px solid #${activePatient.avatarBg}` }}>
                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(activePatient.name)}&background=${activePatient.avatarBg}&color=${activePatient.avatarColor}`} alt={activePatient.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                     <h2 className="text-3xl font-black text-slate-800">{activePatient.name}</h2>
                     <div className="flex gap-2 mt-2">
                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">{activePatient.gender}</span>
                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">{activePatient.age} Years Old</span>
                     </div>
                  </div>
               </div>

               <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-sm">
                  <div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date of Birth</span>
                     <span className="font-semibold text-slate-700">{activePatient.dob}</span>
                  </div>
                  <div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone</span>
                     <span className="font-semibold text-slate-700">{activePatient.phone}</span>
                  </div>
                  <div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email</span>
                     <span className="font-semibold text-slate-700 break-all">{activePatient.email || 'N/A'}</span>
                  </div>
                  <div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Address</span>
                     <span className="font-semibold text-slate-700 whitespace-pre-wrap">{activePatient.address}</span>
                  </div>
                  <div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Insurance</span>
                     <span className="font-semibold text-slate-700">{activePatient.insurance}<br/><span className="text-slate-400 text-xs font-medium">{activePatient.insuranceId}</span></span>
                  </div>
                  <div className="md:col-span-2">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Primary Physician</span>
                     <span className="font-bold text-blue-600 cursor-pointer hover:underline">{activePatient.physician}</span>
                  </div>
               </div>

            </div>
          )}
        </div>



        {/* Lower Split Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           {/* Medication Profile Table (Takes 2 columns on wide screens) */}
           <div className="lg:col-span-2 space-y-4">
             <div className="flex justify-between items-end">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <div className="bg-blue-100 text-blue-600 p-1 rounded-sm"><Pill className="w-4 h-4" /></div>
                 Medication Profile
               </h3>
               <select 
                 value={medFilter}
                 onChange={(e) => setMedFilter(e.target.value)}
                 className="border border-slate-200 bg-white text-xs font-bold text-slate-500 p-1.5 rounded outline-none"
               >
                 <option>Active PharmacistPrescriptions</option>
                 <option>Past PharmacistPrescriptions</option>
                 <option>All PharmacistPrescriptions</option>
               </select>
             </div>
             
             <div className="card p-0 overflow-hidden border-slate-200 shadow-sm">
               <div className="table-container shadow-none border-x-0 border-b-0 rounded-none border-t-0">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 border-b text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white">Drug Name</th>
                        <th className="px-4 py-3 border-b text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white">Instructions / Qty</th>
                        <th className="px-4 py-3 border-b text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white">Date Filled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(activePatient.medications || [])
                        .filter(med => medFilter === 'All PharmacistPrescriptions' || (medFilter === 'Active PharmacistPrescriptions' && med.status === 'Active') || (medFilter === 'Past PharmacistPrescriptions' && med.status === 'Past'))
                        .map((med, idx) => (
                          <tr key={idx} className={med.status === 'Past' ? "opacity-50" : ""}>
                            <td className="px-4 py-4 text-sm align-top">
                              <div className={`font-bold ${med.status === 'Past' ? 'text-slate-500' : 'text-slate-800'}`}>{med.name}</div>
                              <div className="text-[10px] text-slate-400 font-bold mt-1">{med.form}</div>
                            </td>
                            <td className={`px-4 py-4 text-sm font-medium align-top ${med.status === 'Past' ? 'text-slate-400' : 'text-slate-600'}`}>{med.sig}</td>
                            <td className={`px-4 py-4 text-sm align-top ${med.status === 'Past' ? 'text-slate-400' : 'text-slate-500'}`}>{med.date}</td>
                          </tr>
                      ))}
                      {(activePatient.medications || [])
                        .filter(med => medFilter === 'All PharmacistPrescriptions' || (medFilter === 'Active PharmacistPrescriptions' && med.status === 'Active') || (medFilter === 'Past PharmacistPrescriptions' && med.status === 'Past'))
                        .length === 0 && (
                          <tr><td colSpan="3" className="text-center text-slate-400 text-sm py-8 font-medium">No {medFilter.toLowerCase()} found for this patient.</td></tr>
                      )}
                    </tbody>
                  </table>
               </div>
               <button 
                 onClick={() => setMedFilter(medFilter === 'All PharmacistPrescriptions' ? 'Active PharmacistPrescriptions' : 'All PharmacistPrescriptions')}
                 className="w-full py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 border-t border-slate-100 transition-colors"
               >
                  {medFilter === 'All PharmacistPrescriptions' ? 'Hide Medication History' : 'View All Medication History'}
               </button>
             </div>
           </div>

           {/* Clinical Notes (Takes 1 column) */}
           <div className="space-y-4">
             <div className="flex justify-between items-end">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <div className="text-blue-600"><ClipboardList className="w-5 h-5" /></div>
                 Clinical Notes
               </h3>
               <button 
                 onClick={() => setIsAddingNote(!isAddingNote)}
                 className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-full transition-colors shadow-sm"
               >
                 <Plus className="w-4 h-4" />
               </button>
             </div>

             <div className="space-y-3">
               
               {isAddingNote && (
                 <div className="card bg-slate-50 border border-slate-200 p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Add New Note</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <select 
                          value={newNote.type}
                          onChange={e => setNewNote({...newNote, type: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded-md py-2 px-3 text-sm text-slate-600 outline-none focus:border-blue-500"
                        >
                          <option>Counseling</option>
                          <option>PharmacistVerification</option>
                          <option>General Note</option>
                        </select>
                      </div>
                      <div>
                        <textarea 
                          value={newNote.content}
                          onChange={e => setNewNote({...newNote, content: e.target.value})}
                          placeholder="Type note details here..."
                          className="w-full bg-white border border-slate-200 rounded-md py-2 px-3 text-sm outline-none focus:border-blue-500 min-h-[80px]"
                        ></textarea>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button 
                          onClick={() => setIsAddingNote(false)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-md transition-colors"
                        >Cancel</button>
                        <button 
                          onClick={handleAddNote}
                          className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                        >Save Note</button>
                      </div>
                    </div>
                 </div>
               )}

               {/* Note Cards */}
               {(activePatient.notes || []).map((note, idx) => {
                 const isCounsel = note.type === 'Counseling';
                 return (
                  <div key={idx} className={`card border ${isCounsel ? 'bg-[#ffffeb] border-amber-200' : 'bg-white border-slate-200'} p-4 shadow-sm`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isCounsel ? 'text-amber-700' : 'text-slate-500'}`}>{note.type}</span>
                      <span className={`text-[10px] font-bold ${isCounsel ? 'text-amber-600/70' : 'text-slate-400'}`}>{note.date}</span>
                    </div>
                    <p className={`text-sm font-medium leading-relaxed mb-3 ${isCounsel ? 'text-slate-800' : 'text-slate-600'}`}>
                      {note.content}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[8px] font-black uppercase ${isCounsel ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-slate-200 border-slate-300 text-slate-600'}`}>
                        {note.authorInitials}
                      </div>
                      <span className={`text-[10px] font-bold ${isCounsel ? 'text-emerald-800' : 'text-slate-500'}`}>{note.author}</span>
                    </div>
                  </div>
                 )
               })}
               {(activePatient.notes || []).length === 0 && (
                  <div className="text-center text-slate-400 text-sm py-8 border border-slate-200 rounded-xl bg-slate-50/50 card shadow-sm font-medium">No clinical notes available.</div>
               )}

             </div>
           </div>

        </div>

          </>
        )}
      </div>
    </div>
  );
};

export default PharmacistPatients;

