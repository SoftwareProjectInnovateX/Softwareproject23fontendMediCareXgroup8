import { useEffect, useState, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import {
  Upload, FileText, User, Phone, MapPin,
  CheckCircle, Clock, ExternalLink, AlertCircle, FileX,
} from 'lucide-react';
import { useDarkMode } from "../../context/DarkModeContext";
import { DARK } from "../../constants/theme";

// Shared color tokens
const C = {
  bg:          "#f1f5f9",
  surface:     "#ffffff",
  border:      "rgba(26,135,225,0.18)",
  accent:      "#1a87e1",
  accentDark:  "#0f2a5e",
  accentMid:   "#0284c7",
  textPrimary: DARK.surface,
  textMuted:   "#64748b",
  textSoft:    "#475569",
};

const FONT = { display: "'Playfair Display', serif", body: "'DM Sans', sans-serif" };

// Reusable input style for all form fields (kept as-is for consistency)
const inputStyle = (isDark) => {
  return {
    width: "100%", padding: "10px 14px",
    border: `1px solid ${C.border}`, borderRadius: 10,
    fontSize: 13, color: isDark ? DARK.textPrimary : C.textPrimary, fontFamily: FONT.body,
    background: isDark ? DARK.bg : C.surface, outline: "none", boxSizing: "border-box",
  };
};

// Returns badge colors based on prescription approval status
const statusStyle = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'approved': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
    case 'rejected': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    default:         return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
  }
};

// Icon next to the status badge
const StatusIcon = ({ status }) => {
  switch ((status || '').toLowerCase()) {
    case 'approved': return <CheckCircle size={11} />;
    case 'rejected': return <AlertCircle size={11} />;
    default:         return <Clock size={11} />;
  }
};

export default function PrescriptionsPage() {
  // Prescriptions loaded from Firestore
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  // Fetch prescription history once on mount, ordered newest first
  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const q        = query(collection(db, 'prescriptions'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const list     = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setPrescriptions(list);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to load prescriptions');
        setLoading(false);
      }
    };
    fetchPrescriptions();
  }, []);

  // Upload form state
  const [selectedFile, setSelectedFile]   = useState(null);
  const [isDragging, setIsDragging]       = useState(false);
  const [isUploading, setIsUploading]     = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Customer info for the prescription
  const [customerName, setCustomerName]       = useState('');
  const [customerPhone, setCustomerPhone]     = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Ref to the hidden file input so we can trigger it on drop-zone click
  const fileInputRef = useRef(null);
  const { isDark } = useDarkMode();

  // Drag-and-drop handlers
  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  // Standard file picker (click to browse)
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  // Send the prescription file and customer info to the backend API
  const handleUpload = async () => {
    if (!selectedFile || !customerName || !customerPhone) {
      alert('Please fill in name, phone and select a file.');
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('prescription', selectedFile);
    formData.append('customerName', customerName);
    formData.append('customerPhone', customerPhone);
    formData.append('customerAddress', customerAddress);
    try {
      const response = await fetch('http://localhost:5000/api/prescriptions/upload', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        setUploadSuccess(true);
        // Add new prescription to the top of the history list without re-fetching
        setPrescriptions((prev) => [data.prescription, ...prev]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setTimeout(() => { setSelectedFile(null); setUploadSuccess(false); }, 3000);
      } else {
        const err = await response.json();
        alert(`Upload failed: ${err.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed. Make sure the backend is running on port 5000.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return (
    <div
      className="flex justify-center items-center min-h-[60vh] text-sm"
      style={{ color: C.textMuted, fontFamily: FONT.body, background:isDark ? DARK.bg :  C.bg }}
    >
      Loading prescriptions…
    </div>
  );

  if (error) return (
    <div
      className="flex justify-center items-center min-h-[60vh] text-sm text-red-600"
      style={{ fontFamily: FONT.body, background:isDark ? DARK.bg : C.bg }}
    >
      {error}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: isDark ? DARK.bg : C.bg, fontFamily: FONT.body }}>

      {/* Page header banner */}
      <div
        className="px-6 pt-14 pb-12 text-center"
        style={{ background: "linear-gradient(135deg, #0f2a5e 0%, #1a87e1 100%)" }}
      >
        <h1
          className="text-[38px] font-bold text-white mb-3"
          style={{ fontFamily: FONT.display }}
        >
          Prescription Management
        </h1>
        <p className="text-[15px] text-white/75 max-w-[520px] mx-auto">
          Upload your prescription and track its status with ease.
        </p>
      </div>

      <div className="max-w-[860px] mx-auto px-6 py-9 flex flex-col gap-8">

        {/* ── Upload form card ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background:isDark ? DARK.surface : C.surface,
            border: `1px solid ${C.border}`,
            boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
          }}
        >
          {/* Card header */}
          <div
            className="flex items-center gap-2.5 px-[22px] py-4"
            style={{
              background:isDark ? "rgba(255,255,255,0.04)" : "rgba(26,135,225,0.04)",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div
              className="w-[34px] h-[34px] rounded-lg flex items-center justify-center"
              style={{ background: "rgba(26,135,225,0.1)" }}
            >
              <Upload size={16} color={C.accent} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: C.textMuted }}>Upload Prescription</p>
              <p className="text-[11px]" style={{ color: C.textMuted }}>Fill in your details and attach your prescription file</p>
            </div>
          </div>

          <div className="p-[22px] flex flex-col gap-3.5">

            {/* Customer name */}
            <div>
              <label
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5"
                style={{ color: C.textMuted }}
              >
                <User size={11} color={C.accent} /> Name
              </label>
              <input
                style={inputStyle(isDark)}
                placeholder="Your full name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            {/* Customer phone */}
            <div>
              <label
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5"
                style={{ color: C.textMuted }}
              >
                <Phone size={11} color={C.accent} /> Phone
              </label>
              <input
                style={inputStyle(isDark)}
                placeholder="Your phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            {/* Customer address */}
            <div>
              <label
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5"
                style={{ color: C.textMuted }}
              >
                <MapPin size={11} color={C.accent} /> Address
              </label>
              <textarea
                style={{ ...inputStyle(isDark), resize: "vertical", lineHeight: 1.6 }}
                placeholder="Your delivery address"
                rows={3}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </div>

            {/* Drag-and-drop file zone — also clickable */}
            <div>
              <label
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5"
                style={{ color: C.textMuted }}
              >
                <FileText size={11} color={C.accent} /> Prescription File
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl px-5 py-7 text-center cursor-pointer transition-all duration-150"
                style={{
                  border: `2px dashed ${isDragging ? C.accent : C.border}`,
                  background: isDragging ? "rgba(26,135,225,0.04)" : isDark ? DARK.bg : C.bg,
                }}
              >
                <Upload
                  size={24}
                  color={isDragging ? C.accent : C.textMuted}
                  className="mx-auto mb-2.5"
                />
                {selectedFile ? (
                  <p className="text-[13px] font-semibold" style={{ color: C.accent }}>
                    {selectedFile.name}
                  </p>
                ) : (
                  <>
                    <p className="text-[13px] font-semibold" style={{ color: C.textSoft }}>
                      Drop file here or click to browse
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: C.textMuted }}>
                      Supports JPG, PNG, PDF
                    </p>
                  </>
                )}
              </div>
              {/* Hidden input — triggered by clicking the drop zone */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {/* Upload button — disabled until a file is selected */}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border-none text-[13px] font-semibold transition-all"
              style={{
                fontFamily: FONT.body,
                cursor: (!selectedFile || isUploading) ? "not-allowed" : "pointer",
                background: (!selectedFile || isUploading) ? DARK.textPrimary : C.accent,
                color: (!selectedFile || isUploading) ? C.textMuted : "#ffffff",
                boxShadow: (!selectedFile || isUploading) ? "none" : "0 4px 12px rgba(26,135,225,0.25)",
              }}
            >
              <Upload size={14} />
              {isUploading ? 'Uploading…' : 'Upload Prescription'}
            </button>

            {/* Success banner — auto-hides after 3 seconds */}
            {uploadSuccess && (
              <div
                className="flex items-center gap-2 rounded-xl px-3.5 py-2.5"
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                }}
              >
                <CheckCircle size={15} color="#16a34a" />
                <p className="text-[13px] font-semibold text-green-600">
                  Upload successful! Pharmacist has been notified.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Prescription history list ── */}
        <div>
          <p
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] mb-4"
            style={{ color: C.textMuted }}
          >
            <FileText size={12} color={C.accent} /> Prescription History
          </p>

          {/* Empty state */}
          {prescriptions.length === 0 ? (
            <div
              className="rounded-2xl py-[60px] text-center"
              style={{
                background: isDark ? DARK.surface : C.surface,
                border: `1px solid ${C.border}`,
                boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
              }}
            >
              <FileX size={40} color={C.textMuted} className="mx-auto mb-3.5" />
              <p className="text-[15px] font-bold" style={{ color: C.textSoft }}>No prescriptions found.</p>
              <p className="text-[13px] mt-1.5" style={{ color: C.textMuted }}>Your uploaded prescriptions will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {prescriptions.map((p) => {
                const sc = statusStyle(p.status);
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: isDark ? DARK.surface : C.surface,
                      border: `1px solid ${C.border}`,
                      boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
                    }}
                  >
                    {/* Card header — ID and status badge */}
                    <div
                      className="flex justify-between items-center px-[18px] py-3"
                      style={{
                        background:isDark ? "rgba(255,255,255,0.04)" : "rgba(26,135,225,0.04)",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <p className="text-xs font-bold" style={{ color:isDark ? DARK.textPrimary : C.textPrimary }}>
                        #{p.id.slice(0, 8)}&hellip;
                      </p>
                      <span
                        className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-[0.06em]"
                        style={{
                          background: sc.bg,
                          color: sc.color,
                          border: `1px solid ${sc.border}`,
                        }}
                      >
                        <StatusIcon status={p.status} />
                        {p.status || 'Pending'}
                      </span>
                    </div>

                    {/* Card body — customer details and file link */}
                    <div className="px-[18px] py-3.5 flex flex-col gap-1.5">
                      <div className="flex gap-5 flex-wrap">
                        <span
                          className="flex items-center gap-1.5 text-[13px] font-semibold"
                          style={{ color: isDark ? DARK.textPrimary : C.textPrimary }}
                        >
                          <User size={12} color={C.accent} /> {p.customerName}
                        </span>
                        <span
                          className="flex items-center gap-1.5 text-xs"
                          style={{ color: C.textMuted }}
                        >
                          <Phone size={12} color={C.accent} /> {p.customerPhone}
                        </span>
                        {p.customerAddress && (
                          <span
                            className="flex items-center gap-1.5 text-xs"
                            style={{ color: C.textMuted }}
                          >
                            <MapPin size={12} color={C.accent} /> {p.customerAddress}
                          </span>
                        )}
                      </div>

                      {/* Link to the uploaded file — opens in a new tab */}
                      <div className="mt-1.5">
                        {p.imageUrl ? (
                          <a
                            href={p.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold no-underline px-3 py-1.5 rounded-lg"
                            style={{
                              color: C.accent,
                              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(26,135,225,0.08)",
                              border: `1px solid ${C.border}`,
                            }}
                          >
                            <ExternalLink size={12} /> View File
                          </a>
                        ) : (
                          <span className="text-xs" style={{ color: C.textMuted }}>No file attached</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}