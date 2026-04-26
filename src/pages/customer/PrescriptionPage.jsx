import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, orderBy, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Upload, FileText, User, Phone, MapPin, ExternalLink, FileX, CheckCircle, CreditCard, Pill, Receipt, Clock, ChevronRight, Truck, ShoppingCart, ArrowRight, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { addDispensedRecord } from '../../services/pharmacistService';

import { C, FONT, inputStyle }                        from '../../components/profile/profileTheme';
import { SectionCard, SectionLabel, Field,
         SuccessBanner }                              from '../../components/profile/ProfileUI';
import PageBanner from '../../components/profile/PageBanner';
import { StatusBadge, getStatusColor } from '../../components/orders/orderStatusUtils';
import Card                                           from '../../components/Card';

// ── Drop zone ─────────────────────────────────────────────────────────────────
function DropZone({ selectedFile, onFile }) {
  const [isDragging, setIsDragging] = useState(false);
  const ref = useRef(null);

  return (
    <Field icon={<FileText size={11} color={C.accent} />} label="Prescription File">
      <div
        onDragOver={(e)  => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => {
          e.preventDefault(); setIsDragging(false);
          const f = e.dataTransfer.files[0]; if (f) onFile(f);
        }}
        onClick={() => ref.current?.click()}
        className="rounded-xl px-5 py-7 text-center cursor-pointer transition-all duration-150"
        style={{
          border:     `2px dashed ${isDragging ? C.accent : C.border}`,
          background:  isDragging ? C.accentFaint : C.bg,
        }}
      >
        <Upload size={24} color={isDragging ? C.accent : C.textMuted} className="mx-auto mb-2.5" />
        {selectedFile
          ? <p className="text-[13px] font-semibold" style={{ color: C.accent }}>{selectedFile.name}</p>
          : <>
              <p className="text-[13px] font-semibold" style={{ color: C.textSoft }}>Drop file here or click to browse</p>
              <p className="text-[11px] mt-1"          style={{ color: C.textMuted }}>Supports JPG, PNG, PDF</p>
            </>
        }
      </div>
      <input type="file" ref={ref} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} className="hidden" />
    </Field>
  );
}

// ── Upload form ───────────────────────────────────────────────────────────────
function UploadForm({ onUploaded, userId }) {
  const [file,      setFile]      = useState(null);
  const [name,      setName]      = useState('');
  const [phone,     setPhone]     = useState('');
  const [address,   setAddress]   = useState('');
  const [uploading, setUploading] = useState(false);
  const [success,   setSuccess]   = useState(false);

  const reset = () => { setName(''); setPhone(''); setAddress(''); };

  const handleUpload = async () => {
    if (!file || !name || !phone) { alert('Please fill in name, phone and select a file.'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('prescription',    file);
    fd.append('customerName',    name);
    fd.append('customerPhone',   phone);
    fd.append('customerAddress', address);
    if (userId) fd.append('userId', userId);
    
    try {
      const res = await fetch('http://localhost:5000/api/prescriptions/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const { prescription } = await res.json();
        setSuccess(true);
        const localHistory = JSON.parse(localStorage.getItem('my_prescriptions') || '[]');
        localStorage.setItem('my_prescriptions', JSON.stringify([prescription.id, ...localHistory]));
        onUploaded(prescription);
        reset();
        setTimeout(() => { setFile(null); setSuccess(false); }, 3000);
      } else {
        const e = await res.json();
        alert(`Upload failed: ${e.message || 'Unknown error'}`);
      }
    } catch { alert('Upload failed. Backend check...'); }
    finally  { setUploading(false); }
  };

  const disabled = !file || uploading;

  return (
    <SectionCard
      icon={<Upload size={16} color={C.accent} />}
      title="Upload Prescription"
      subtitle="Fill in your details and attach your prescription file"
    >
      <Field icon={<User   size={11} color={C.accent} />} label="Name">
        <input style={inputStyle} placeholder="Your full name"      value={name}    onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field icon={<Phone  size={11} color={C.accent} />} label="Phone">
        <input style={inputStyle} placeholder="Your phone number"   value={phone}   onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field icon={<MapPin size={11} color={C.accent} />} label="Address">
        <textarea
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          placeholder="Your delivery address" rows={3}
          value={address} onChange={(e) => setAddress(e.target.value)}
        />
      </Field>

      <DropZone selectedFile={file} onFile={setFile} />

      <button
        onClick={handleUpload} disabled={disabled}
        className="flex items-center justify-center gap-2 py-3 rounded-xl border-none text-[13px] font-semibold transition-all"
        style={{
          fontFamily: FONT.body,
          cursor:     disabled ? "not-allowed" : "pointer",
          background: disabled ? C.disabled    : C.accent,
          color:      disabled ? C.textMuted   : "#ffffff",
          boxShadow:  disabled ? "none"        : "0 4px 12px rgba(26,135,225,0.25)",
        }}
      >
        <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload Prescription'}
      </button>

      {success && <SuccessBanner message="Upload successful! Pharmacist has been notified." />}
    </SectionCard>
  );
}

// ── Prescription history card ─────────────────────────────────────────────────
function PrescriptionCard({ p }) {
  const [showBill, setShowBill] = useState(false);
  const navigate = useNavigate();
  const sc = getStatusColor(p.status);

  const handleGoToCheckout = () => {
    // Redirect to the main checkout page with prescription details and pre-fill info
    const amount = p.total || p.totalAmount || 0;
    const nameParts = p.customerName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const params = new URLSearchParams({
      rxId: p.id,
      amount: amount.toString(),
      fname: firstName,
      lname: lastName,
      phone: p.customerPhone,
      addr: p.customerAddress || '',
      items: (p.orderItems || p.medications || []).map(m => m.name).join(', ')
    });
    
    navigate(`/customer/checkout?${params.toString()}`);
  };

  return (
    <Card
      id={`rx-${p.id}`}
      header={
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.textMuted }}>
            {p.id.slice(-6)} • {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : 'Just now'}
          </span>
          <StatusBadge status={p.status} colors={sc} />
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Basic Info */}
        <div className="flex justify-between items-start">
           <div className="flex flex-col gap-1">
              <span className="text-[15px] font-bold text-slate-800">{p.customerName}</span>
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Phone size={10} /> {p.customerPhone}
              </span>
           </div>
           {p.imageUrl && (
              <a href={p.imageUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 transition-colors">
                <ExternalLink size={16} />
              </a>
           )}
        </div>

        {/* Status Logic */}
        {p.status === 'Pending' && (
           <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-3">
              <Clock className="text-amber-500 animate-spin-slow" size={18} />
              <div className="flex-1">
                 <p className="text-xs font-bold text-amber-800 uppercase tracking-tighter">Pending Pharmacist Approval</p>
                 <p className="text-[10px] text-amber-600 font-medium">We are checking stock and preparing your bill.</p>
              </div>
           </div>
        )}

        {/* Approval -> INITIAL VIEW BILL BUTTON */}
        {p.status === 'Approved' && !showBill && (
           <button 
              onClick={() => setShowBill(true)}
              className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all transform active:scale-95"
           >
              <Receipt size={18} /> View Bill & Proceed
           </button>
        )}

        {/* THE BILL VIEW */}
        {showBill && p.status === 'Approved' && (
           <div className="p-5 rounded-2xl bg-slate-50 border-2 border-blue-100 shadow-inner animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                 <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                    <Receipt size={14} className="text-blue-600" /> Digital Invoice
                 </h4>
              </div>

              <div className="space-y-2 mb-4">
                 {(p.orderItems || p.medications || []).map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                       <span className="font-bold text-slate-700">{m.name} <span className="text-[10px] text-slate-400 font-medium">x {m.qty}</span></span>
                       <span className="font-black text-slate-900">Rs. {(m.total || (m.qty * m.price)).toFixed(2)}</span>
                    </div>
                 ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t-2 border-dashed border-slate-200 mb-6">
                 <span className="text-xs font-black text-slate-500 uppercase">Total Amount</span>
                 <span className="text-xl font-black text-blue-700">Rs. {(p.total || 0).toFixed(2)}</span>
              </div>

              <button 
                 onClick={handleGoToCheckout}
                 className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                 <ShoppingCart size={18} /> Confirm & Pay Now <ArrowRight size={16} />
              </button>
           </div>
        )}

        {/* AFTER CONFIRMATION / PACKING */}
        {p.status === 'Packing' && (
           <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200 text-blue-700 text-center shadow-md animate-pulse">
              <div className="flex items-center justify-center gap-2 mb-1">
                 <Package size={20} className="text-blue-600" />
                 <span className="font-black uppercase tracking-widest text-xs">Preparing Medications</span>
              </div>
              <p className="text-[10px] opacity-90 font-bold uppercase tracking-wider">The pharmacist is currently packing your order.</p>
           </div>
        )}

        {/* AFTER CONFIRMATION / READY */}
        {(p.status === 'Paid' || p.status === 'Ready to Collect') && (
           <div className="p-4 rounded-xl bg-emerald-600 text-white text-center shadow-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                 <CheckCircle size={18} />
                 <span className="font-black uppercase tracking-widest text-xs">Payment Confirmed</span>
              </div>
              <p className="text-[10px] opacity-90 font-bold uppercase tracking-wider">Order sent to Pharmacist for preparation.</p>
           </div>
        )}

        {/* DELIVERY STATUS / DELIVERED */}
        {p.status === 'Delivered' && (
           <div className="p-4 rounded-xl bg-emerald-100 border-2 border-emerald-200 text-emerald-800 text-center shadow-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                 <CheckCircle size={22} className="text-emerald-600" />
                 <span className="font-black uppercase tracking-widest text-xs">Delivered</span>
              </div>
              <p className="text-[10px] opacity-90 font-bold uppercase tracking-wider">Your medications have been delivered successfully.</p>
           </div>
        )}

        {/* DELIVERY STATUS / OUT FOR DELIVERY */}
        {p.status === 'Out for Delivery' && (
           <div className="p-4 rounded-xl bg-blue-600 text-white text-center shadow-lg animate-pulse">
              <div className="flex items-center justify-center gap-2 mb-1">
                 <Truck size={20} />
                 <span className="font-black uppercase tracking-widest text-xs">Out for Delivery</span>
              </div>
              <p className="text-[10px] opacity-90 font-bold uppercase tracking-wider">Your medications are being delivered now.</p>
           </div>
        )}

      </div>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PrescriptionsPage() {
  const { currentUser } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'prescriptions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const localIds = JSON.parse(localStorage.getItem('my_prescriptions') || '[]');
      const filtered = all.filter(p => {
        if (currentUser?.uid && p.userId === currentUser.uid) return true;
        if (localIds.includes(p.id)) return true;
        if (currentUser?.phoneNumber && p.customerPhone === currentUser.phoneNumber) return true;
        return false;
      });
      setPrescriptions(filtered);
      setLoading(false);
    });
  }, [currentUser]);

  return (
    <div className="min-h-screen pb-20" style={{ background: C.bg, fontFamily: FONT.body }}>
      <PageBanner title="Prescription History" subtitle="Track your approvals and make payments securely." />

      <div className="max-w-[860px] mx-auto px-6 py-9 flex flex-col gap-10">
        <UploadForm onUploaded={(p) => setPrescriptions(prev => { if (prev.find(i => i.id === p.id)) return prev; return [p, ...prev]; })} userId={currentUser?.uid} />

        <div>
          <SectionLabel icon={<FileText size={12} color={C.accent} />} label="My Orders" />
          <div className="flex flex-col gap-4 mt-4">
            {prescriptions.map(p => ( <PrescriptionCard key={p.id} p={p} /> ))}
            {prescriptions.length === 0 && !loading && (
              <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
                <FileX className="mx-auto text-slate-300 mb-3" size={40} />
                <p className="text-slate-500 font-bold">No history found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
      `}</style>
    </div>
  );
}