import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { updatePatient, getDispensedHistory } from '../../services/pharmacistService';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
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
  const [dispensedHistory, setDispensedHistory] = useState([]);
  const [activePatientId, setActivePatientId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDispensedHistory().then(setDispensedHistory).catch(console.error);

    setIsLoading(true);
    const q = query(collection(db, 'users'), where('role', '==', 'customer'));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const d2 = d.data();
        return {
          id: d.id,
          customerId: d2.customerId || d2.walkinId || d.id,
          name: d2.fullName || d2.name || 'Walk-in Guest',
          email: d2.email || '',
          phone: d2.phone || 'N/A',
          dob: d2.dob || '—',
          age: d2.age || '—',
          address: d2.address || '—',
          gender: d2.gender || '—',
          physician: 'Walk-in POS',
          status: d2.isOnline ? 'active' : 'inactive',
          registrationSource: d2.registrationSource || 'app',
          lastVisit: d2.lastVisit || null,
          lastLogin: d2.lastLogin && typeof d2.lastLogin.toDate === 'function' ? d2.lastLogin.toDate().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : (d2.lastLogin || 'Unknown'),
          lastVisit: d2.lastVisit || null,
          fading: false,
          avatarColor: d2.registrationSource === 'walkin' ? '047857' : '1d4ed8',
          avatarBg:    d2.registrationSource === 'walkin' ? 'd1fae5' : 'dbeafe',
          timestamp: d2.createdAt?.toMillis?.() || 0,
          notes: d2.notes || [],
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

      setPatients(data);
      setIsLoading(false);
    }, (error) => {
      console.error('Real-time patients sync error:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
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

  let activePatientMeds = [];
  if (activePatient) {
    const records = dispensedHistory.filter(r => r.patientId === activePatient.id || r.patientId === activePatient.customerId);
    activePatientMeds = records.flatMap(r => {
      const meds = r.medicines || r.orderItems || [];
      return meds.map(m => ({
        name: m.name || 'Unknown',
        form: r.type === 'prescription' ? `Qty: ${m.qty}` : 'OTC/General',
        sig: `Qty: ${m.qty} · Rs. ${Number(m.price || 0).toFixed(2)} each`,
        date: r.dispensedDate || r.date || '—',
        timestamp: r.timestamp || 0,
        prescriber: r.dispensedAt || 'Walk-in POS',
        status: r.paymentStatus === 'Paid' ? 'Active' : 'Past',
        paymentMethod: r.paymentMethod || '—'
      }));
    }).sort((a, b) => b.timestamp - a.timestamp);
  }

  const processedPatients = patients.map(p => {
    const records = dispensedHistory.filter(r => r.patientId === p.id || r.patientId === p.customerId);
    let count = 0;
    records.forEach(r => { count += (r.medicines || r.orderItems || []).length; });
    return { ...p, activeCount: count };
  })
    .filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.customerId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.phone || '').includes(searchQuery)
    )
    .sort((a, b) => {
      if (sortBy === 'Recent') return b.timestamp - a.timestamp;
      if (sortBy === 'Name (A-Z)') return a.name.localeCompare(b.name);
      return 0;
    });

  const handleAddPatient = async () => {
    if (!newPatient.firstName) return;
    
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      let maxNum = 0;
      usersSnap.forEach(d => {
        const data = d.data();
        if (data.customerId) {
          const num = parseInt(data.customerId.replace('C', ''));
          if (num > maxNum) maxNum = num;
        }
      });
      const customerId = `C${String(maxNum + 1).padStart(3, '0')}`;
      const docRef = doc(collection(db, 'users')); 
      
      const userData = {
        customerId,
        fullName: `${newPatient.firstName} ${newPatient.lastName}`.trim(),
        email: newPatient.email || '',
        phone: newPatient.phone || '',
        address: newPatient.address || '',
        role: 'customer',
        status: 'active',
        registrationSource: 'walkin',
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: []
      };
      
      await setDoc(docRef, userData);
      
      setIsAddingPatient(false);
      setNewPatient({ firstName: '', lastName: '', phone: '', email: '', address: '' });
      setActivePatientId(docRef.id);
    } catch (error) {
      console.error("Error adding patient to Firebase:", error);
    }
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
    if(target && target.id) {
        updatePatient(target.id, { notes: target.notes }).catch(console.error);
    }
  };

  if (isLoading) return (
    <div className="p-8 text-center text-slate-500 h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
        <p className="font-medium">Loading patients from Firebase...</p>
      </div>
    </div>
  );

  return (
    <div className="flex -m-6 h-[calc(100vh-80px)] overflow-hidden relative bg-slate-50">
      {/* Add Patient Modal */}
      {isAddingPatient && (
        <div className="fixed inset-0 z-50 flex justify-center items-center backdrop-blur-sm bg-black/30" onClick={() => setIsAddingPatient(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Add New Patient</h2>
                <p className="text-sm text-slate-500 mt-1">Enter patient details to register them in the system</p>
              </div>
              <button 
                onClick={() => setIsAddingPatient(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">First Name *</label>
                <input type="text" value={newPatient.firstName} onChange={e => setNewPatient({...newPatient, firstName: e.target.value})} placeholder="John" className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-3 px-4 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-medium" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Last Name</label>
                <input type="text" value={newPatient.lastName} onChange={e => setNewPatient({...newPatient, lastName: e.target.value})} placeholder="Doe" className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-3 px-4 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-medium" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Phone *</label>
                <input type="tel" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} placeholder="(555) 000-0000" className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-3 px-4 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-medium" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Email</label>
                <input type="email" value={newPatient.email} onChange={e => setNewPatient({...newPatient, email: e.target.value})} placeholder="john@example.com" className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-3 px-4 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-medium" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Address</label>
                <input type="text" value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} placeholder="123 Main St, City, ST" className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg py-3 px-4 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-medium" />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
              <button 
                onClick={() => setIsAddingPatient(false)}
                className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm"
              >Cancel</button>
              <button 
                onClick={handleAddPatient}
                className="px-8 py-2.5 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left PharmacistSidebar: PharmacistPatients List */}
      <div className="w-1/3 border-r border-slate-200 bg-white flex flex-col min-w-[320px]">
        
        {/* List Header */}
        <div className="p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-800">Patients</h1>
              <p className="text-slate-500 font-medium mt-1">{processedPatients.length} total</p>
            </div>
            <button 
              onClick={() => setIsAddingPatient(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg transition-all shadow-md flex items-center gap-2 text-sm font-bold"
              title="Add new patient"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search patients..." 
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
            />
          </div>
          
          <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
            <span>Showing {processedPatients.length}</span>
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-medium cursor-pointer hover:border-slate-300 outline-none"
            >
              <option>Recent</option>
              <option>Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Scrollable Patient List */}
        <div className="flex-1 overflow-y-auto w-full p-4 space-y-2.5">
          {processedPatients.map((patient) => {
            const isActive = patient.id === activePatientId;
            return (
              <div 
                key={patient.id} 
                onClick={() => setActivePatientId(patient.id)}
                className={`p-4 rounded-xl transition-all cursor-pointer border-2 ${
                  isActive 
                    ? 'bg-blue-50 border-blue-500 shadow-md' 
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-sm leading-tight truncate ${isActive ? 'text-blue-900' : 'text-slate-900'}`}>{patient.name}</h3>
                    <p className={`text-xs mt-1 ${isActive ? 'text-blue-600' : 'text-slate-500'} truncate`}>{patient.phone || 'No phone'}</p>
                  </div>

                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-2 flex-wrap">
                    {patient.registrationSource === 'walkin' && (
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                        isActive ? 'bg-blue-600 text-blue-100' : 'bg-emerald-100 text-emerald-700'
                      }`}>Walk-in</span>
                    )}
                    {patient.activeCount > 0 && (
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                        isActive ? 'bg-blue-600 text-blue-100' : 'bg-slate-100 text-slate-600'
                      }`}>{patient.activeCount} meds</span>
                    )}
                  </div>
                  <p className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                    {patient.email ? patient.email.substring(0, 12) + '...' : 'N/A'}
                  </p>
                </div>
              </div>
            );
          })}
          {processedPatients.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM15 20H9m6 0h.01" />
              </svg>
              <p className="text-xs font-medium">No patients found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Content: Patient Profile Workspace */}
      <div className="flex-1 overflow-y-auto bg-white p-6 lg:p-10 space-y-6">
        {!activePatient ? (
           <div className="h-full min-h-[600px] flex flex-col items-center justify-center text-slate-400 animate-in fade-in duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-6 opacity-20"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <h2 className="text-2xl font-bold text-slate-700 mb-3">No patient selected</h2>
              <p className="text-sm text-slate-500 max-w-sm text-center">Choose a patient from the list on the left to view and manage their profile, medications, and clinical notes.</p>
           </div>
        ) : (
          <>
        {/* Top Bar with Actions */}
        <div className="flex justify-between items-center pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">{activePatient.name}</h2>
            <p className="text-sm text-slate-500 mt-1">Patient ID: {activePatient.id}</p>
          </div>
          <button 
            onClick={() => {
              if (!isEditingProfile) {
                setEditedPatient({...activePatient});
              }
              setIsEditingProfile(!isEditingProfile);
            }}
            className={`font-bold text-sm px-6 py-2.5 rounded-lg transition-all shadow-sm ${
              isEditingProfile 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isEditingProfile ? 'Cancel Editing' : 'Edit Profile'}
          </button>
        </div>

        {/* Patient Info Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200">
          {isEditingProfile ? (
            <div className="space-y-6 animate-in fade-in duration-300">
               <h3 className="font-bold text-slate-900 text-lg">Edit Patient Information</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Full Name</label>
                   <input type="text" value={editedPatient?.name || ''} onChange={e => setEditedPatient({...editedPatient, name: e.target.value})} className="w-full bg-white border-2 border-slate-300 rounded-lg py-2.5 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium text-slate-700 transition-all" />
                 </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Phone</label>
                    <input type="text" value={editedPatient?.phone || ''} onChange={e => setEditedPatient({...editedPatient, phone: e.target.value})} className="w-full bg-white border-2 border-slate-300 rounded-lg py-2.5 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium text-slate-700 transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Email</label>
                    <input type="text" value={editedPatient?.email || ''} onChange={e => setEditedPatient({...editedPatient, email: e.target.value})} className="w-full bg-white border-2 border-slate-300 rounded-lg py-2.5 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium text-slate-700 transition-all" />
                  </div>

                 <div>
                   <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Address</label>
                   <input type="text" value={editedPatient?.address || ''} onChange={e => setEditedPatient({...editedPatient, address: e.target.value})} className="w-full bg-white border-2 border-slate-300 rounded-lg py-2.5 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium text-slate-700 transition-all" />
                 </div>

                 <div>
                   <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Primary Physician</label>
                   <input type="text" value={editedPatient?.physician || ''} onChange={e => setEditedPatient({...editedPatient, physician: e.target.value})} className="w-full bg-white border-2 border-slate-300 rounded-lg py-2.5 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium text-slate-700 transition-all" />
                 </div>
               </div>
               <div className="flex justify-end gap-3 pt-4">
                 <button 
                   onClick={() => setIsEditingProfile(false)}
                   className="text-slate-600 hover:bg-white font-bold text-sm px-5 py-2 rounded-lg transition-colors"
                 >Cancel</button>
                 <button 
                   onClick={async () => {
                     if (!editedPatient) return;
                     const updatedPatients = patients.map(p => p.id === activePatient.id ? editedPatient : p);
                     setPatients(updatedPatients);
                     setIsEditingProfile(false);
                     if (activePatient.id) {
                       try {
                         await updatePatient(activePatient.id, editedPatient);
                       } catch (e) {
                         console.error("Error updating patient in Firebase:", e);
                       }
                     }
                   }}
                   className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-all shadow-md"
                 >Save Changes</button>
               </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
               <div className="grid grid-cols-1 gap-4">
                  <div className="bg-white border-2 border-slate-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                     <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Phone</span>
                     <span className="text-sm font-bold text-slate-700 break-all">{activePatient.phone}</span>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5">
                     <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-2">Email Address</span>
                     <p className="font-medium text-slate-700 break-all">{activePatient.email || '—'}</p>
                  </div>
                  <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5">
                     <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-2">Address</span>
                     <p className="font-medium text-slate-700">{activePatient.address}</p>
                  </div>
               </div>

               <div className="flex gap-4">
                  <div className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl p-5">
                     <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-2">Last Visit / Online</span>
                     <p className={`font-bold text-lg ${activePatient.lastLogin !== 'Unknown' || activePatient.lastVisit ? 'text-slate-900' : 'text-slate-400'}`}>
                       {activePatient.lastLogin !== 'Unknown' ? activePatient.lastLogin : (activePatient.lastVisit || 'No visits yet')}
                     </p>
                  </div>
                  <div className="flex-1 bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300 rounded-xl p-5">
                     <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wider block mb-2">Total Medications</span>
                     <p className="font-bold text-3xl text-blue-700">{activePatient.activeCount}</p>
                  </div>
               </div>

            </div>
          )}
        </div>

        {/* Medications & Notes Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
           
           {/* Medication Profile (Takes 2 columns on wide screens) */}
           <div className="lg:col-span-2 space-y-4">
             <div className="flex justify-between items-center">
               <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                 <div className="bg-blue-600 text-white p-2.5 rounded-lg"><Pill className="w-5 h-5" /></div>
                 Medication History
               </h3>
               <select 
                 value={medFilter}
                 onChange={(e) => setMedFilter(e.target.value)}
                 className="border-2 border-slate-300 bg-white text-xs font-bold text-slate-700 px-4 py-2 rounded-lg outline-none focus:border-blue-500 transition-all"
               >
                 <option>Active PharmacistPrescriptions</option>
                 <option>Past PharmacistPrescriptions</option>
                 <option>All PharmacistPrescriptions</option>
               </select>
             </div>
             
             <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
               <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-200">
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Drug Name</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Quantity / Type</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Date Filled</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activePatientMeds
                        .filter(med => medFilter === 'All PharmacistPrescriptions' || (medFilter === 'Active PharmacistPrescriptions' && med.status === 'Active') || (medFilter === 'Past PharmacistPrescriptions' && med.status === 'Past'))
                        .map((med, idx) => (
                          <tr key={idx} className={`hover:bg-slate-50 transition-colors ${med.status === 'Past' ? 'opacity-60' : ''}`}>
                            <td className="px-6 py-4 align-top">
                              <div className="font-bold text-slate-900">{med.name}</div>
                              <div className="text-xs text-slate-500 mt-1">{med.form}</div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-700">{med.sig}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{med.date}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                med.status === 'Active' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-slate-200 text-slate-600'
                              }`}>
                                {med.status}
                              </span>
                            </td>
                          </tr>
                      ))}
                      {activePatientMeds
                        .filter(med => medFilter === 'All PharmacistPrescriptions' || (medFilter === 'Active PharmacistPrescriptions' && med.status === 'Active') || (medFilter === 'Past PharmacistPrescriptions' && med.status === 'Past'))
                        .length === 0 && (
                          <tr><td colSpan="4" className="text-center text-slate-400 text-sm py-10 font-medium">No {medFilter.toLowerCase()} found for this patient.</td></tr>
                      )}
                    </tbody>
                  </table>
               </div>
               <button 
                 onClick={() => setMedFilter(medFilter === 'All PharmacistPrescriptions' ? 'Active PharmacistPrescriptions' : 'All PharmacistPrescriptions')}
                 className="w-full py-4 text-sm font-bold text-blue-600 hover:bg-blue-50 border-t-2 border-slate-200 transition-colors"
               >
                  {medFilter === 'All PharmacistPrescriptions' ? '↑ Hide Medication History' : '↓ View All Medication History'}
               </button>
             </div>
           </div>

           {/* Clinical Notes (Takes 1 column) */}
           <div className="space-y-4">
             <div className="flex justify-between items-center">
               <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                 <div className="bg-amber-600 text-white p-2.5 rounded-lg"><ClipboardList className="w-5 h-5" /></div>
                 Notes
               </h3>
               <button 
                 onClick={() => setIsAddingNote(!isAddingNote)}
                 className="bg-amber-600 hover:bg-amber-700 text-white p-2.5 rounded-lg transition-all shadow-md"
                 title="Add new note"
               >
                 <Plus className="w-5 h-5" />
               </button>
             </div>

             <div className="space-y-3">
               
               {isAddingNote && (
                 <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 shadow-sm">
                    <div className="mb-4">
                      <label className="text-xs font-bold text-amber-900 uppercase tracking-wider block mb-2">Note Type</label>
                      <select 
                        value={newNote.type}
                        onChange={e => setNewNote({...newNote, type: e.target.value})}
                        className="w-full bg-white border-2 border-amber-200 rounded-lg py-2.5 px-3 text-sm text-slate-700 font-medium outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 transition-all"
                      >
                        <option>Counseling</option>
                        <option>PharmacistVerification</option>
                        <option>General Note</option>
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="text-xs font-bold text-amber-900 uppercase tracking-wider block mb-2">Note Content</label>
                      <textarea 
                        value={newNote.content}
                        onChange={e => setNewNote({...newNote, content: e.target.value})}
                        placeholder="Enter your note here..."
                        className="w-full bg-white border-2 border-amber-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 min-h-[100px] resize-none font-medium transition-all"
                      ></textarea>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button 
                        onClick={() => setIsAddingNote(false)}
                        className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-white rounded-lg transition-colors"
                      >Cancel</button>
                      <button 
                        onClick={handleAddNote}
                        className="px-4 py-2 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-md"
                      >Save Note</button>
                    </div>
                 </div>
               )}

               {/* Note Cards */}
               <div className="space-y-3 max-h-[500px] overflow-y-auto">
                 {(activePatient.notes || []).map((note, idx) => {
                   const isCounsel = note.type === 'Counseling';
                   return (
                    <div key={idx} className={`border-2 rounded-xl p-4 transition-all ${
                      isCounsel 
                        ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300' 
                        : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[8px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          isCounsel 
                            ? 'bg-amber-600 text-white' 
                            : 'bg-slate-600 text-white'
                        }`}>
                          {note.type}
                        </span>
                        <span className={`text-xs font-bold ${isCounsel ? 'text-amber-700' : 'text-slate-600'}`}>{note.date}</span>
                      </div>
                      <p className={`text-sm font-medium leading-relaxed mb-3 ${isCounsel ? 'text-slate-900' : 'text-slate-700'}`}>
                        {note.content}
                      </p>
                      <div className="flex items-center gap-2 pt-2 border-t border-opacity-40 border-slate-400">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                          isCounsel ? 'bg-amber-600' : 'bg-slate-600'
                        }`}>
                          {note.authorInitials}
                        </div>
                        <span className={`text-xs font-bold ${isCounsel ? 'text-amber-800' : 'text-slate-700'}`}>{note.author}</span>
                      </div>
                    </div>
                   )
                 })}
                 {(activePatient.notes || []).length === 0 && (
                    <div className="text-center text-slate-400 text-sm py-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 font-medium">
                      <svg className="w-8 h-8 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      No notes yet
                    </div>
                 )}
               </div>

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

