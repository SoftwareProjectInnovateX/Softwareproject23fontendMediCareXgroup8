import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Printer, ArrowLeft, CheckCircle2, User, Search, FileText, CreditCard, Link } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPatients, updatePatient, addPatient, addPrescription, getInventory, updateInventoryItem, addDispensedRecord } from '../../services/pharmacistService';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion, addDoc, Timestamp } from 'firebase/firestore';

const PharmacistNewRxEntry = () => {
  const navigate = useNavigate();
  
  const [patientsDb, setPatientsDb] = useState([]);
  const [inventoryDb, setInventoryDb] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState(false);

  // Retry inventory load up to 3 times (backend may still be starting)
  const loadInventory = async (attempt = 1) => {
    try {
      setInventoryLoading(true);
      setInventoryError(false);
      const data = await getInventory();
      if (Array.isArray(data)) {
        setInventoryDb(data);
      } else {
        setInventoryDb([]);
      }
      setInventoryLoading(false);
    } catch(err) {
      console.error(`Inventory load attempt ${attempt} failed:`, err);
      if (attempt < 3) {
        setTimeout(() => loadInventory(attempt + 1), 2000 * attempt);
      } else {
        setInventoryError(true);
        setInventoryLoading(false);
        setInventoryDb([]);
      }
    }
  };

  useEffect(() => {
     // Load suggestions from Firebase users (role=customer)
     (async () => {
       try {
         const snap = await getDocs(
           query(collection(db, 'users'), where('role', '==', 'customer'))
         );
         const pts = snap.docs.map(d => {
           const d2 = d.data();
           return {
             id: d.id,
             name: d2.fullName || d2.name || 'Unknown',
             phone: d2.phone || '',
             age: d2.age || '',
             firebaseUid: d.id
           };
         });
         setPatientsDb(pts);
       } catch (e) {
         console.error("Failed to fetch customer suggestions:", e);
       }
     })();
     loadInventory();
  }, []);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  // Firebase registered customer linked by phone number
  const [linkedCustomer, setLinkedCustomer] = useState(null); // { firebaseUid, name, email, phone, ... }
  const [phoneStatus, setPhoneStatus] = useState('idle'); // 'idle' | 'searching' | 'found' | 'not_found'
  const phoneDebounceRef = useRef(null);
  
  const [showAutoSuggest, setShowAutoSuggest] = useState(false);
  
  // Medicine List State
  const [medicines, setMedicines] = useState([]);
  const [currentMed, setCurrentMed] = useState('');
  const [currentQty, setCurrentQty] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [showItemSuggest, setShowItemSuggest] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [activeTab, setActiveTab] = useState('rx'); // 'rx' or 'otc'
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'card'
  const [discountPercent, setDiscountPercent] = useState(0);
  
  const [isBillGenerated, setIsBillGenerated] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  // ── Phone lookup: check Firebase users collection ─────────────────────────
  const lookupPhone = async (phoneVal) => {
    const cleaned = phoneVal.trim();
    if (cleaned.length < 7) {
      setLinkedCustomer(null);
      setPhoneStatus('idle');
      return;
    }
    setPhoneStatus('searching');
    try {
      const snap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'customer'), where('phone', '==', cleaned))
      );
      if (!snap.empty) {
        const d2 = snap.docs[0].data();
        const cust = {
          firebaseUid: snap.docs[0].id,
          name: d2.fullName || d2.name || '',
          email: d2.email || '',
          phone: d2.phone || cleaned,
          age: d2.age || '',
          address: d2.address || '',
        };
        setLinkedCustomer(cust);
        setPhoneStatus('found');
        // Auto-fill name and age if not already typed
        if (!patientName) setPatientName(cust.name);
        if (!age) setAge(cust.age ? String(cust.age) : '');
      } else {
        setLinkedCustomer(null);
        setPhoneStatus('not_found');
      }
    } catch (e) {
      console.error('Phone lookup error:', e);
      setLinkedCustomer(null);
      setPhoneStatus('idle');
    }
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setPhone(val);
    setLinkedCustomer(null);
    setPhoneStatus('idle');
    // Debounce lookup by 600ms
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    phoneDebounceRef.current = setTimeout(() => lookupPhone(val), 600);
  };

  const handleNameChange = (e) => {
    setPatientName(e.target.value);
    setShowAutoSuggest(true);
    setSelectedPatientId(null);
  };

  const handleSelectPatient = (p) => {
    setPatientName(p.name);
    setPhone(p.phone || '');
    setAge(p.age || '');
    setSelectedPatientId(p.id);
    
    // Link as Firebase customer to avoid duplicate registration on payment
    setLinkedCustomer({
      firebaseUid: p.firebaseUid,
      name: p.name,
      phone: p.phone,
      age: p.age
    });
    setPhoneStatus('found');
    
    setShowAutoSuggest(false);
  };

  const filteredPatients = patientsDb.filter(p => p.name.toLowerCase().includes(patientName.toLowerCase()) && patientName.length > 0);

  // Comprehensive medicine category keywords — covers common pharmacy inventory naming
  const MEDICINE_KEYWORDS = [
    'medicine', 'medication', 'drug', 'pharmaceutical', 'prescription', 'rx',
    'tablet', 'tablets', 'capsule', 'capsules', 'syrup', 'syrups', 'injection',
    'antibiotic', 'antiviral', 'antifungal', 'analgesic', 'antipyretic',
    'vitamin', 'supplement', 'drops', 'cream', 'ointment', 'gel', 'patch',
    'inhaler', 'nebulizer', 'sedative', 'antacid', 'laxative', 'diuretic',
    'steroid', 'hormone', 'generic', 'branded', 'oral', 'topical', 'eye',
    'ear', 'nasal', 'dental', 'paediatric', 'pediatric', 'adult'
  ];

  const filteredItems = inventoryDb.filter(item => {
    const itemName = item.name || item.productName || item.itemName || '';
    if (currentMed.length > 0 && !itemName.toLowerCase().includes(currentMed.toLowerCase())) return false;
    
    const cat = (item.category || '').toLowerCase();
    // If no category is set at all — treat as Rx (medicines usually lack strict categorisation)
    const hasNoCategory = !item.category || item.category.trim() === '';
    const isRx = hasNoCategory || MEDICINE_KEYWORDS.some(kw => cat.includes(kw));
    
    if (activeTab === 'rx') {
      return isRx;
    } else {
      // OTC tab — show everything that is NOT a prescription-only medicine
      // (includes OTC medicines, personal care, general items)
      return !isRx || cat.includes('otc') || cat.includes('over the counter') || cat.includes('general') || cat.includes('personal');
    }
  }).slice(0, 50);

  const handleSelectItem = (item) => {
    const itemName = item.name || item.productName || item.itemName || '';
    setCurrentMed(itemName);
    const price = item.retailPrice || item.price || item.unitPrice || item.sellingPrice || item.cost || item.amount || 0;
    if (price !== undefined && price !== null) setCurrentPrice(price.toString());
    setSelectedInventoryItem(item);
    setShowItemSuggest(false);
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (currentMed && currentQty && currentPrice) {
      const qty = parseInt(currentQty);
      
      let invItem = selectedInventoryItem;
      if (!invItem) {
          invItem = inventoryDb.find(i => i.name.toLowerCase() === currentMed.toLowerCase());
      }
      
      setMedicines([...medicines, {
        id: Date.now(),
        inventoryId: invItem ? invItem.id : null,
        name: currentMed,
        category: activeTab,
        qty: qty,
        price: parseFloat(currentPrice),
        total: qty * parseFloat(currentPrice)
      }]);
      
      // Deduct from inventory
      if (invItem && invItem.id) {
          const currentStock = invItem.stock ?? invItem.qty ?? invItem.quantity ?? invItem.totalStock ?? invItem.currentStock ?? 0;
          const newStock = Math.max(0, currentStock - qty);
          
          // Update local state
          const updatedDb = inventoryDb.map(i => i.id === invItem.id ? { ...i, stock: newStock, qty: newStock, quantity: newStock } : i);
          setInventoryDb(updatedDb);
          
          // Update backend
          try {
             await updateInventoryItem(invItem.id, { stock: newStock, qty: newStock, quantity: newStock });
          } catch(err) {
             console.error("Failed to update inventory", err);
          }
      }

      setCurrentMed('');
      setCurrentQty('');
      setCurrentPrice('');
      setSelectedInventoryItem(null);
    }
  };

  const removeMedicine = async (id) => {
    const medToRemove = medicines.find(m => m.id === id);
    if (medToRemove && medToRemove.inventoryId) {
        const invItem = inventoryDb.find(i => i.id === medToRemove.inventoryId);
        if (invItem) {
            const currentStock = invItem.stock ?? invItem.qty ?? invItem.quantity ?? invItem.totalStock ?? invItem.currentStock ?? 0;
            const newStock = currentStock + medToRemove.qty;
            
            // Update local state
            const updatedDb = inventoryDb.map(i => i.id === invItem.id ? { ...i, stock: newStock, qty: newStock, quantity: newStock } : i);
            setInventoryDb(updatedDb);
            
            // Update backend
            try {
               await updateInventoryItem(invItem.id, { stock: newStock, qty: newStock, quantity: newStock });
            } catch(err) {
               console.error("Failed to restore inventory", err);
            }
        }
    }
    setMedicines(medicines.filter(m => m.id !== id));
  };

  const subTotal = medicines.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subTotal * (parseFloat(discountPercent) || 0)) / 100;
  const grandTotal = subTotal - discountAmount;

  const handlePayment = async () => {
    if (medicines.length === 0) {
      alert("Please add at least one medicine.");
      return;
    }

    // NOTE: revenue_updated & dispensed_updated events are fired AFTER
    // all Firebase writes complete (at the end of this function).


    // 2. Update Patient Profile
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      
      const newMedsList = medicines.map(item => ({
        name: item.name,
        form: item.category === 'rx' ? `Qty: ${item.qty}` : 'OTC/General',
        sig: 'As directed',
        date: dateStr,
        timestamp: now.getTime(),
        prescriber: 'Walk-in POS',
        status: 'Active'
      }));

      let updatedPatients = [...patientsDb];
      let pIdx = updatedPatients.findIndex(p => p.id === selectedPatientId);
      
      if (pIdx >= 0) {
        // Update existing patient
        updatedPatients[pIdx].medications = [...newMedsList, ...(updatedPatients[pIdx].medications || [])];
        updatedPatients[pIdx].activeCount = updatedPatients[pIdx].medications.filter(m => m.status === 'Active').length;
        
        // Save to Firebase
        const dbId = updatedPatients[pIdx].firebaseId || updatedPatients[pIdx].id;
        if (dbId) updatePatient(dbId, { medications: updatedPatients[pIdx].medications, activeCount: updatedPatients[pIdx].activeCount }).catch(console.error);
        
      } else if (patientName || phone) {
        // Register new patient automatically only if at least name or phone is provided
        const newId = `#PT-${Date.now().toString().slice(-6)}`;
        const newPatient = {
          id: newId,
          name: patientName || 'Walk-in Guest',
          dob: 'Unknown',
          age: parseInt(age) || 0,
          gender: 'Unknown',
          phone: phone || 'N/A',
          address: 'Walk-in Patient',
          insurance: 'Cash',
          insuranceId: 'N/A',
          physician: 'Walk-in',
          activeCount: newMedsList.length,
          fading: false,
          avatarColor: '10b981', // emerald
          avatarBg: 'd1fae5',
          timestamp: now.getTime(),
          medications: newMedsList,
          notes: []
        };
        updatedPatients.unshift(newPatient); // Add to top
        setSelectedPatientId(newId);
        
        // Save to Firebase
        addPatient(newPatient).catch(console.error);
      }
      
      setPatientsDb(updatedPatients);
    } catch(e) { console.error('Patient profile update error:', e); }

    // 2.2 If phone matched a Firebase registered customer → update their user doc
    if (linkedCustomer?.firebaseUid) {
      try {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        const purchasedMeds = medicines.map(item => ({
          name: item.name,
          qty: item.qty,
          price: item.price,
          total: item.total,
          category: item.category,
          date: dateStr,
          timestamp: now.getTime(),
          paymentMethod: paymentMethod === 'card' ? 'Card' : 'Cash',
          dispensedAt: 'Walk-in POS',
        }));
        // Use backend service instead of direct updateDoc
        await updatePatient(linkedCustomer.firebaseUid, {
          lastVisit: dateStr,
          medications: purchasedMeds, // backend should handle arrayUnion if implemented, or we send full list
        });
      } catch (e) {
        console.error('Failed to update customer Firebase record:', e);
      }
    }

    // 2.3 Auto-register walk-in customer if NOT already in Firebase
    //     So they appear in Patients tab + Total Patient count on dashboard
    if (phoneStatus !== 'found') {
      try {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        const walkinName = patientName?.trim() || 'Walk-in Guest';
        const walkinPhone = phone?.trim() || null;
        const purchasedMeds = medicines.map(item => ({
          name: item.name,
          qty: item.qty,
          price: item.price,
          total: item.total,
          category: item.category,
          date: dateStr,
          timestamp: now.getTime(),
          paymentMethod: paymentMethod === 'card' ? 'Card' : 'Cash',
          dispensedAt: 'Walk-in POS',
        }));

        // If phone provided, check once more to avoid duplicate
        let alreadyExists = false;
        if (walkinPhone) {
          const chk = await getDocs(
            query(collection(db, 'users'), where('phone', '==', walkinPhone))
          );
          if (!chk.empty) {
            // Customer found (maybe role differs) — just update their record
            const existId = chk.docs[0].id;
            // Use backend service
            await updatePatient(existId, {
              lastVisit: dateStr,
              medications: purchasedMeds,
            });
            alreadyExists = true;
          }
        }

        if (!alreadyExists) {
          // Create a new walk-in customer record via Backend
          const patientData = {
            fullName: walkinName,
            phone: walkinPhone || 'N/A',
            age: age ? parseInt(age) : null,
            email: '',
            role: 'customer',
            status: 'active',
            registrationSource: 'walkin',
            walkinId: `#WT-${Date.now().toString().slice(-6)}`,
            lastVisit: dateStr,
            medications: purchasedMeds,
          };
          
          const result = await addPatient(patientData);
          
          // Update local state so UI says "Registered" immediately
          setLinkedCustomer({
            firebaseUid: result.id || result.firebaseId || result.docId,
            name: walkinName,
            phone: walkinPhone,
            age: age
          });
          setPhoneStatus('found');
          console.log("New walk-in customer registered via Backend:", result.id);
          alert(`Success: Customer ${walkinName} registered & payment processed via Backend!`);
        } else {
           setPhoneStatus('found'); // Even if they existed, mark as found now
        }

        // Notify dashboard + patients page to refresh count
        window.dispatchEvent(new Event('patient_registered'));
      } catch (e) {
        console.error('Walk-in auto-registration failed:', e);
        alert("Registration failed. Check console for details.");
      }
    }

    // 2.5 Add to Central Prescription Queue if has Rx
    if (medicines.some(m => m.category === 'rx')) {
      try {
        const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const [time, ampm] = nowStr.split(' ');
        
        const newQueueItem = {
          queueId: `${Date.now().toString().slice(-6)}`,
          isHighPriority: false,
          patientName: patientName || 'Walk-in Guest',
          dob: 'Unknown',
          isDigital: false, // forces "Handwritten" / Physical UI
          dateMain: `Today, ${time}`,
          dateSub: ampm,
          status: 'COMPLETED',
          statusStyle: 'bg-emerald-100 text-emerald-700',
          actionLabel: 'Archived',
          rowStyle: '',
          medicines: medicines,
          timestamp: Date.now()
        };
        
        await addPrescription(newQueueItem).catch(console.error);
      } catch(e) {}
    }

    // 2.8 Add to Dispensed History — fires AFTER all writes so dashboard reads fresh data
    try {
        const rxMeds = medicines.filter(m => m.category === 'rx');
        const otcMeds = medicines.filter(m => m.category === 'otc');
        const now = Date.now();
        const todayStr = new Date().toDateString();
        const payMethod = paymentMethod === 'card' ? 'Card Payment' : 'Cash';
        const patLabel = patientName || 'Walk-in Guest';
        const patId = selectedPatientId || 'N/A';
        
        if (rxMeds.length > 0) {
            const rxTotal = rxMeds.reduce((sum, item) => sum + item.total, 0);
            const totalBeforeDiscount = rxTotal + otcMeds.reduce((sum, item) => sum + item.total, 0);
            const rxRatio = totalBeforeDiscount > 0 ? rxTotal / totalBeforeDiscount : 1;
            const finalRxTotal = rxTotal - (discountAmount * rxRatio);
            
            await addDispensedRecord({
               id: `WALKIN-RX-${Math.floor(now / 1000)}`,
               dispensedDate: todayStr,
               dispensedAt: new Date().toISOString(),
               dispensedTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
               paymentStatus: 'Paid',
               paymentMethod: payMethod,
               total: finalRxTotal.toFixed(2),
               type: 'prescription',
               // orderItems used by PharmacistDispensedToday for item count
               orderItems: rxMeds.map(m => ({ name: m.name, qty: m.qty, price: m.price, total: m.total })),
               medicines: rxMeds,
               patientName: patLabel,
               patientId: patId,
               timestamp: now
            });
        }
        
        if (otcMeds.length > 0) {
            const otcTotal = otcMeds.reduce((sum, item) => sum + item.total, 0);
            const totalBeforeDiscount = otcTotal + rxMeds.reduce((sum, item) => sum + item.total, 0);
            const otcRatio = totalBeforeDiscount > 0 ? otcTotal / totalBeforeDiscount : 1;
            const finalOtcTotal = otcTotal - (discountAmount * otcRatio);
            
            await addDispensedRecord({
               id: `WALKIN-OTC-${Math.floor(now / 1000)}`,
               dispensedDate: todayStr,
               dispensedAt: new Date().toISOString(),
               dispensedTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
               paymentStatus: 'Paid',
               paymentMethod: payMethod,
               total: finalOtcTotal.toFixed(2),
               type: 'otc',
               orderItems: otcMeds.map(m => ({ name: m.name, qty: m.qty, price: m.price, total: m.total })),
               medicines: otcMeds,
               patientName: patLabel,
               patientId: patId,
               timestamp: now
            });
        }
        
        // Fire events AFTER all Firebase writes — dashboard refreshes with fresh data
        window.dispatchEvent(new Event('dispensed_updated'));
        window.dispatchEvent(new Event('revenue_updated'));
    } catch(err) {
        console.error("Failed to add dispensed record", err);
    }

    // 3. Mark as paid
    setIsBillGenerated(true);
    setIsPaid(true);

    // Auto-trigger print
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const startNewEntry = () => {
    setIsBillGenerated(false);
    setIsPaid(false);
    setMedicines([]);
    setPatientName('');
    setPhone('');
    setAge('');
    setSelectedPatientId(null);
    setDiscountPercent(0);
    setLinkedCustomer(null);
    setPhoneStatus('idle');
  };

  return (
    <>
    <div className="max-w-6xl mx-auto space-y-6 pb-12 print:hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 ">Walk-in POS & Billing</h1>
            <p className="text-slate-500 mt-1">Manual entry for prescriptions and in-store purchases</p>
          </div>
        </div>
        
        {isPaid && (
          <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full font-bold flex items-center gap-2 border border-emerald-200 ">
            <CheckCircle2 className="w-5 h-5" />
            Payment Successful
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Data Entry */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Patient Details */}
          <div className="card ">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              Patient Information
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="relative col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  value={patientName}
                  onChange={handleNameChange}
                  onFocus={() => setShowAutoSuggest(true)}
                  onBlur={() => setTimeout(() => setShowAutoSuggest(false), 200)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  disabled={isBillGenerated}
                />
                {!isBillGenerated && showAutoSuggest && filteredPatients.length > 0 && (
                  <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredPatients.map(p => (
                      <li 
                        key={p.id} 
                        onClick={() => handleSelectPatient(p)}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-50 flex flex-col"
                      >
                        <span className="font-semibold text-sm text-slate-800">{p.name}</span>
                        <span className="text-xs text-slate-500">{p.phone} • {p.age} Yrs</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="07X XXX XXXX"
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:ring-2 outline-none transition-all ${
                    phoneStatus === 'found'     ? 'border-emerald-400 focus:ring-emerald-400' :
                    phoneStatus === 'not_found' ? 'border-slate-200 focus:ring-blue-500' :
                    'border-slate-200 focus:ring-blue-500'
                  }`}
                  disabled={isBillGenerated}
                />
                {/* Phone lookup status badge */}
                {phoneStatus === 'searching' && (
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">🔍 Looking up customer…</p>
                )}
                {phoneStatus === 'found' && linkedCustomer && (
                  <p className="text-[11px] text-emerald-600 mt-1 font-bold flex items-center gap-1">
                    ✅ Registered customer — {linkedCustomer.name}
                  </p>
                )}
                {phoneStatus === 'not_found' && (
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">👤 Walk-in customer (not registered)</p>
                )}
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Age</label>
                <input 
                  type="number" 
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Years"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  disabled={isBillGenerated}
                />
              </div>
            </div>
          </div>

          {/* Add Item Form */}
          <div className="card ">
            <div className="flex border-b border-slate-200 mb-6 gap-6 w-full justify-between items-center">
                <div className="flex gap-6">
                  <button 
                    type="button"
                    className={`pb-3 font-bold text-sm transition-all border-b-2 outline-none flex items-center gap-2 ${activeTab === 'rx' ? 'text-blue-600 border-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    onClick={() => { setActiveTab('rx'); setCurrentMed(''); setCurrentQty(''); setCurrentPrice(''); setShowItemSuggest(false); setSelectedInventoryItem(null); }}
                  >
                    <FileText className={`w-4 h-4 ${activeTab === 'rx' ? 'text-blue-500' : 'text-slate-300'}`} />
                    Prescribed Medicines
                  </button>
                  <button 
                    type="button"
                    className={`pb-3 font-bold text-sm transition-all border-b-2 outline-none flex items-center gap-2 ${activeTab === 'otc' ? 'text-emerald-600 border-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    onClick={() => { setActiveTab('otc'); setCurrentMed(''); setCurrentQty(''); setCurrentPrice(''); setShowItemSuggest(false); setSelectedInventoryItem(null); }}
                  >
                    <Plus className={`w-4 h-4 ${activeTab === 'otc' ? 'text-emerald-500' : 'text-slate-300'}`} />
                    OTC & General Items
                  </button>
                </div>
               
               <button 
                 type="button"
                 onClick={() => navigate('/pharmacist/returns?tab=physical')}
                 className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors border border-slate-300 shadow-sm"
               >
                 Process Physical Return
               </button>
            </div>
            
            {!isBillGenerated && (
              <form onSubmit={handleAddMedicine} className={`flex gap-3 mb-6 items-end p-4 rounded-xl border ${activeTab === 'rx' ? 'bg-blue-50/50 border-blue-100 ' : 'bg-emerald-50/50 border-emerald-100 '}`}>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {activeTab === 'rx' ? 'Medicine Name / Formula' : 'Item Name / Brand'}
                  </label>
                  <div className="relative">
                    {/* Search icon — pulses while loading */}
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${inventoryLoading ? 'text-blue-400 animate-pulse' : inventoryError ? 'text-red-400' : 'text-slate-400'}`} />
                    <input 
                      type="text" 
                      value={currentMed}
                      onChange={(e) => {
                        setCurrentMed(e.target.value);
                        setSelectedInventoryItem(null);
                        setShowItemSuggest(true);
                      }}
                      onFocus={() => setShowItemSuggest(true)}
                      onBlur={() => setTimeout(() => setShowItemSuggest(false), 200)}
                      placeholder={inventoryLoading ? 'Loading inventory...' : inventoryError ? 'Backend unavailable — retry below' : 'Search from inventory...'}
                      disabled={inventoryLoading}
                      className={`w-full pl-9 pr-3 py-2 bg-white border rounded-md text-sm outline-none transition-colors ${
                        inventoryError ? 'border-red-300 bg-red-50' : inventoryLoading ? 'border-slate-200 bg-slate-50' : 'border-slate-200 focus:border-blue-500'
                      }`}
                      required
                    />

                    {/* Dropdown — results / loading / error states */}
                    {showItemSuggest && !inventoryLoading && (
                      <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto left-0">
                        {inventoryError ? (
                          <li className="px-4 py-4 text-center">
                            <p className="text-sm font-bold text-red-500 mb-2">⚠ Backend not reachable</p>
                            <p className="text-xs text-slate-400 mb-3">Make sure the backend server is running on port 3000</p>
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); loadInventory(); }}
                              className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md transition-colors"
                            >
                              Retry Connection
                            </button>
                          </li>
                        ) : filteredItems.length > 0 ? (
                          filteredItems.map(item => {
                            const itemName = item.name || item.productName || item.itemName || 'Unknown Item';
                            const itemPrice = item.retailPrice || item.price || item.unitPrice || item.sellingPrice || item.cost || item.amount;
                            const itemStock = item.stock ?? item.qty ?? item.quantity ?? item.currentStock ?? 0;
                            return (
                              <li 
                                key={item.id || itemName} 
                                onMouseDown={(e) => { e.preventDefault(); handleSelectItem(item); }}
                                className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-100 flex justify-between items-center transition-colors last:border-0"
                              >
                                <div>
                                  <span className="font-semibold text-sm text-slate-800">{itemName}</span>
                                  {item.category && <span className="ml-2 text-[10px] uppercase font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{item.category}</span>}
                                  <div className="text-[11px] text-slate-400 mt-0.5">Stock: {itemStock} units</div>
                                </div>
                                {itemPrice !== undefined && itemPrice !== null && (
                                  <span className="text-xs font-bold text-blue-600 ml-3 shrink-0">Rs. {parseFloat(itemPrice).toFixed(2)}</span>
                                )}
                              </li>
                            );
                          })
                        ) : (
                          <li className="px-4 py-4 text-center text-sm text-slate-400 font-medium">
                            {currentMed.length > 0
                              ? `No "${currentMed}" found in inventory`
                              : `${inventoryDb.length} items loaded — start typing to search`}
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="w-24">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Qty</label>
                  <input 
                    type="number" 
                    value={currentQty}
                    onChange={(e) => setCurrentQty(e.target.value)}
                    placeholder="0"
                    min="1"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    required
                  />
                </div>
                <div className="w-32">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Unit Price (Rs.)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm outline-none transition-all ${selectedInventoryItem ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'}`}
                    required
                    readOnly={!!selectedInventoryItem}
                  />
                </div>
                <div className="flex items-end gap-3 ml-2">
                  <div className="text-right pb-2">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Cost</div>
                    <div className="font-bold text-blue-600 text-base">Rs. {((parseFloat(currentQty) || 0) * (parseFloat(currentPrice) || 0)).toFixed(2)}</div>
                  </div>
                  <button type="submit" className={`${activeTab === 'rx' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-4 py-2 rounded-md font-semibold text-sm flex items-center gap-2 h-[38px] transition-colors`}>
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </form>
            )}

            {/* Added Medicines List */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 ">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item Description</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantity</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit Price</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subtotal</th>
                    {!isBillGenerated && <th className="px-4 py-3 w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white ">
                  {medicines.length === 0 ? (
                    <tr>
                      <td colSpan={isBillGenerated ? 4 : 5} className="px-4 py-8 text-center text-slate-400">
                        No medicines added yet.
                      </td>
                    </tr>
                  ) : (
                    medicines.map((med) => (
                      <tr key={med.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-slate-800 flex items-center gap-2">
                          {med.name}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${med.category === 'rx' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                             {med.category === 'rx' ? 'Rx' : 'OTC'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-center bg-slate-50/50 ">{med.qty}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">Rs. {med.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-800 text-right">Rs. {med.total.toFixed(2)}</td>
                        {!isBillGenerated && (
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => removeMedicine(med.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
          </div>
        </div>

        {/* Right Column: Billing Summary */}
        <div className="space-y-6">
          <div className="card sticky top-24">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4">Billing Summary</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-500">Subtotal ({medicines.length} items)</span>
                <span className="font-medium ">Rs. {subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-500">Discount (%)</span>
                <input 
                  type="number" 
                  min="0" max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  disabled={isBillGenerated}
                  className="w-16 px-2 py-1 text-right border border-slate-200 rounded text-sm focus:border-blue-500 outline-none"
                />
              </div>
              {parseFloat(discountPercent) > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount Amount</span>
                  <span>- Rs. {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-4 border-t border-dashed border-slate-200 flex justify-between items-center">
                <span className="text-base font-bold text-slate-800 ">Grand Total</span>
                <span className="text-2xl font-bold text-blue-600 ">Rs. {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {!isPaid ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors border ${paymentMethod === 'cash' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      Cash
                    </button>
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors border ${paymentMethod === 'card' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      Card
                    </button>
                  </div>
                </div>
                <button 
                  onClick={handlePayment}
                  className={`w-full py-3.5 rounded-xl font-bold text-base flex justify-center items-center gap-2 transition-all shadow-md active:scale-[0.98] ${
                    medicines.length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20' 
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                  disabled={medicines.length === 0}
                >
                  <CreditCard className="w-5 h-5" />
                  Process {paymentMethod === 'card' ? 'Card' : 'Cash'} Payment
                </button>
              </>
            ) : (
              <div className="space-y-3 print:hidden">
                <button 
                  onClick={() => window.print()}
                  className="w-full py-3 bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors"
                >
                  <Printer className="w-5 h-5" />
                  Print Bill
                </button>
                <button 
                  onClick={startNewEntry}
                  className="w-full py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                >
                  Start New Entry
                </button>
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>

    {/* Printable Receipt - Centered POS Style on A4 */}
    {isPaid && (
      <>
      <style>
        {`
          @media print {
            @page {
              margin: 0;
            }
            body {
              margin: 0;
              background-color: white;
            }
            body * {
              visibility: hidden;
            }
            #printable-receipt, #printable-receipt * {
              visibility: visible;
            }
            #printable-receipt {
              position: absolute;
              left: 50%;
              top: 0;
              transform: translateX(-50%);
              width: 380px;
              padding: 40px 20px;
              background-color: white;
            }
          }
        `}
      </style>
      <div id="printable-receipt" className="hidden print:block w-[380px] mx-auto text-slate-800 text-[12px] font-sans mt-8">
        
        <div className="border-2 border-slate-500 rounded-2xl overflow-hidden bg-white shadow-sm">
          {/* Colorful Header */}
          <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white p-6 text-center print:bg-blue-800 print:text-black">
            <h1 className="text-2xl font-black tracking-wider uppercase mb-1 drop-shadow-sm">MediCareX</h1>
            <p className="text-[10px] text-blue-100 opacity-90 tracking-widest uppercase font-semibold">Premium Pharmacy</p>
          </div>
          
          <div className="p-6 bg-white">
            <div className="text-center mb-6">
              <p className="text-slate-500 text-[11px] font-medium">123 Health Avenue, Medical City</p>
              <p className="text-slate-500 text-[11px] font-medium">Tel: 011-2345678 | Web: medicarex.lk</p>
              <div className="w-16 h-1 bg-blue-100 mx-auto my-4 rounded-full"></div>
              <p className="font-bold text-blue-800 text-sm uppercase tracking-widest">Cash Receipt</p>
            </div>

            {/* Info Section */}
            <div className="mb-6 bg-slate-50 p-4 rounded-lg text-[11px] space-y-2 border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Bill No:</span>
                <span className="font-bold text-slate-800">#INV-{Math.floor(Date.now() / 1000).toString().slice(-6)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Date & Time:</span>
                <span className="font-bold text-slate-800">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Patient:</span>
                <span className="font-bold text-blue-700">{patientName || 'Walk-in Guest'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Cashier:</span>
                <span className="font-bold text-slate-800">Pharmacist 01</span>
              </div>
            </div>

            {/* Table Headers */}
            <table className="w-full text-left mb-4">
              <thead>
                <tr className="border-b-2 border-slate-200 text-[10px] uppercase text-slate-400">
                  <th className="pb-2 font-bold w-1/2">Item</th>
                  <th className="pb-2 font-bold text-center">Qty</th>
                  <th className="pb-2 font-bold text-right">Price</th>
                  <th className="pb-2 font-bold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((med) => (
                  <tr key={med.id} className="border-b border-slate-50 last:border-0 align-top">
                    <td className="py-3 pr-2">
                      <div className="font-bold text-slate-800 text-[12px] leading-tight">{med.name}</div>
                      <div className="text-[9px] text-blue-500 font-bold uppercase mt-1 tracking-wider">{med.category === 'rx' ? 'Rx Med' : 'OTC'}</div>
                    </td>
                    <td className="py-3 text-center font-medium text-[12px]">{med.qty}</td>
                    <td className="py-3 text-right text-slate-500 text-[11px]">Rs. {med.price.toFixed(2)}</td>
                    <td className="py-3 text-right font-bold text-slate-800 text-[12px]">Rs. {med.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-b-2 border-dashed border-slate-300 my-4"></div>

            {/* Totals */}
            <div className="space-y-2 mb-6 text-[12px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Subtotal</span>
                <span className="font-bold text-slate-700">Rs. {subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Discount ({parseFloat(discountPercent) || 0}%)</span>
                <span className="font-bold text-emerald-600">- Rs. {discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-end pt-4 mt-4 border-t-2 border-slate-800">
                <span className="font-black text-[13px] uppercase text-slate-800">Net Amount</span>
                <span className="font-black text-2xl tracking-tight text-blue-700">Rs. {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className={`p-4 rounded-xl text-center text-[12px] mb-8 border-2 ${paymentMethod === 'card' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
              <span className="uppercase tracking-widest text-[10px] block mb-2 opacity-80 font-bold">Payment Status</span>
              <span className="font-black uppercase text-lg flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> 
                {paymentMethod === 'card' ? 'Paid via Card' : 'Paid via Cash'}
              </span>
            </div>

            {/* Standard POS Footer */}
            <div className="text-center text-[11px] text-slate-500 pt-6 mt-6 border-t-2 border-dashed border-slate-200">
              <p className="font-black text-slate-800 uppercase mb-2 tracking-widest text-[13px]">Thank You, Come Again!</p>
              <p className="font-medium text-slate-600 leading-relaxed">Exchange possible within 7 days with receipt.<br/>Medicines sold cannot be returned.</p>
              <div className="mt-5 flex justify-center items-center gap-2 text-[9px] font-bold text-slate-400 tracking-widest">
                <span>***</span>
                <span>MEDICAREX POS</span>
                <span>***</span>
              </div>
            </div>

          </div>
        </div>
      </div>
      </>
    )}
    </>
  );
};

export default PharmacistNewRxEntry;
