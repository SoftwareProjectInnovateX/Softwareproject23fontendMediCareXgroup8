import { useEffect, useState, useRef } from 'react';
import { db, getAuthHeaders } from '../../services/firebase';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { Upload, FileText, User, Phone, MapPin, ExternalLink, FileX, CheckCircle, CreditCard, Pill, Receipt } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
      const authHeaders = await getAuthHeaders();
      const res = await fetch('http://localhost:5000/api/prescriptions/upload', { 
        method: 'POST', 
        headers: authHeaders,
        body: fd 
      });
      if (res.ok) {
        const { prescription } = await res.json();
        setSuccess(true);
        onUploaded(prescription);
        reset();
        setTimeout(() => { setFile(null); setSuccess(false); }, 3000);
      } else {
        const e = await res.json();
        alert(`Upload failed: ${e.message || 'Unknown error'}`);
      }
    } catch { alert('Upload failed. Make sure the backend is running on port 5000.'); }
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
  const sc = getStatusColor(p.status);
  const isApproved = p.status === 'Approved' || p.status === 'Completed';

  return (
    <Card
      header={
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.textMuted }}>
            {p.isDigital ? 'Digital Order' : 'Physical Upload'} #{p.id.slice(-6)}
          </span>
          <StatusBadge status={p.status} colors={sc} />
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Main Info */}
        <div className="flex gap-5 flex-wrap">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: C.textPrimary }}>
            <User  size={12} color={C.accent} /> {p.customerName}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: C.textSoft }}>
            <Phone size={12} color={C.accent} /> {p.customerPhone}
          </span>
        </div>

        {/* Pharmacist Approval Details */}
        {isApproved && p.orderItems && p.orderItems.length > 0 && (
          <div className="mt-2 p-4 rounded-xl border border-emerald-100 bg-emerald-50/30">
             <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={14} className="text-emerald-500" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Pharmacist Approved Medications</span>
             </div>
             
             <div className="space-y-2.5 mb-4">
                {p.orderItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white/60 p-2 rounded-lg border border-emerald-50 shadow-sm">
                    <div className="flex items-center gap-2">
                       <Pill size={12} className="text-blue-500" />
                       <div>
                          <p className="text-[12px] font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{item.form} • Qty: {item.qty}</p>
                       </div>
                    </div>
                    <span className="text-xs font-bold text-slate-700">Rs. {item.total.toFixed(2)}</span>
                  </div>
                ))}
             </div>

             <div className="flex justify-between items-center pt-3 border-t border-emerald-100">
                <div className="flex items-center gap-1.5">
                   <Receipt size={14} className="text-emerald-600" />
                   <span className="text-xs font-bold text-slate-600">Total Payable Amount</span>
                </div>
                <span className="text-lg font-black text-emerald-800">Rs. {Number(p.total || 0).toFixed(2)}</span>
             </div>

             {/* Payment Button */}
             <button 
               onClick={() => {
                 // Simulate redirect to checkout with prescription data
                 window.location.href = `/customer/checkout?rxId=${p.id}&amount=${p.total}`;
               }}
               className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
             >
                <CreditCard size={14} /> Confirm & Process Payment
             </button>
          </div>
        )}

        {/* View Original File */}
        <div className="pt-2 border-t border-slate-100">
          {p.imageUrl
            ? <a href={p.imageUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold no-underline px-3 py-1.5 rounded-lg transition-colors hover:bg-blue-50"
                style={{ color: C.accent, background: C.accentFaint, border: `1px solid ${C.border}` }}>
                <ExternalLink size={12} /> View Scanned Prescription
              </a>
            : <span className="text-xs italic" style={{ color: C.textMuted }}>No scanned file attached</span>
          }
        </div>
      </div>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PrescriptionsPage() {
  const { currentUser } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    (async () => {
      try {
        let snap;
        if (currentUser?.uid) {
          try {
            // Filtered query — requires composite index on (userId, createdAt)
            const q = query(
              collection(db, 'prescriptions'),
              where('userId', '==', currentUser.uid),
              orderBy('createdAt', 'desc')
            );
            snap = await getDocs(q);
          } catch (indexErr) {
            // Index not yet created — fallback to client-side filter
            console.warn('Firebase index missing; using client-side filter. Create the index via the URL in the error:', indexErr.message);
            const fallbackQ = query(collection(db, 'prescriptions'), orderBy('createdAt', 'desc'));
            const allSnap = await getDocs(fallbackQ);
            const allDocs = allSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setPrescriptions(allDocs.filter(p => p.userId === currentUser.uid));
            return;
          }
        } else {
          const q = query(collection(db, 'prescriptions'), orderBy('createdAt', 'desc'));
          snap = await getDocs(q);
        }
        setPrescriptions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) { setError(e.message || 'Failed to load prescriptions'); }
      finally     { setLoading(false); }
    })();
  }, [currentUser]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh] text-sm"
      style={{ color: C.textMuted, fontFamily: FONT.body, background: C.bg }}>
      Loading prescriptions…
    </div>
  );
  if (error) return (
    <div className="flex justify-center items-center min-h-[60vh] text-sm text-red-600"
      style={{ fontFamily: FONT.body, background: C.bg }}>
      {error}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: FONT.body }}>
      <PageBanner title="Prescription Management" subtitle="Upload your prescription and track its status with ease." />

      <div className="max-w-[860px] mx-auto px-6 py-9 flex flex-col gap-8">
        <UploadForm onUploaded={(p) => setPrescriptions((prev) => [p, ...prev])} userId={currentUser?.uid} />

        <div>
          <SectionLabel icon={<FileText size={12} color={C.accent} />} label="Prescription History" />

          {prescriptions.length === 0
            ? <div className="rounded-2xl py-[60px] text-center"
                style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(26,135,225,0.07)" }}>
                <FileX size={40} color={C.textMuted} className="mx-auto mb-3.5" />
                <p className="text-[15px] font-bold" style={{ color: C.textSoft }}>No prescriptions found.</p>
                <p className="text-[13px] mt-1.5"    style={{ color: C.textMuted }}>Your uploaded prescriptions will appear here.</p>
              </div>
            : <div className="flex flex-col gap-3.5">
                {prescriptions.map((p) => <PrescriptionCard key={p.id} p={p} />)}
              </div>
          }
        </div>
      </div>
    </div>
  );
}