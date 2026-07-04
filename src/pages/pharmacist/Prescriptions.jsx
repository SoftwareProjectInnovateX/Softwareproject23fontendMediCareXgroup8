import { useState, useEffect, useRef } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, orderBy, limit, query, doc, updateDoc, Timestamp, where } from "firebase/firestore";


import {
  Phone, MapPin, ExternalLink, CheckCircle, XCircle,
  ClipboardList, Plus, Trash2, Clock, ChevronRight,
  User, Image as ImageIcon, Download, Search, Package
} from "lucide-react";

// ── Convert Firebase Storage path/URL to a signed download URL ───────────────
const resolveFirebaseImageUrl = async (imageUrl) => {
  if (!imageUrl) return null;
  try {
    const storage = getStorage();
    // If it's already a full https URL, extract the path and get a fresh signed URL
    if (imageUrl.startsWith("https://firebasestorage.googleapis.com")) {
      // Extract the path from the URL (between /o/ and ?)
      const match = imageUrl.match(/\/o\/(.+?)(\?|$)/);
      if (match) {
        const decodedPath = decodeURIComponent(match[1]);
        const storageRef = ref(storage, decodedPath);
        return await getDownloadURL(storageRef);
      }
    }
    // If it's a plain storage path like "prescriptions/filename.jpg"
    const storageRef = ref(storage, imageUrl);
    return await getDownloadURL(storageRef);
  } catch (err) {
    console.error("Could not resolve image URL:", err);
    return null;
  }
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function Prescriptions() {
  const [prescriptions,    setPrescriptions]    = useState([]);
  const [selectedRx,       setSelectedRx]       = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [meds,             setMeds]             = useState([]);
  const [currentMed,       setCurrentMed]       = useState({ name: "", dosage: "", timing: "", qty: "", price: "" });
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [isDownloading,    setIsDownloading]    = useState(false);
  const [imageBase64,      setImageBase64]      = useState(null);
  const [imageLoading,     setImageLoading]     = useState(false);
  const [resolvedImageUrl, setResolvedImageUrl] = useState(null); // ✅ signed URL

  // ── Pharmacist medicine list ──────────────────────────────────────────────
  const [pharmacistMeds,   setPharmacistMeds]   = useState([]);
  const [medSearch,        setMedSearch]        = useState("");
  const [medsLoading,      setMedsLoading]      = useState(false);

  // ── Fetch prescriptions ───────────────────────────────────────────────────
  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const q    = query(collection(db, "prescriptions"), orderBy("createdAt", "desc"), limit(50));
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

  // ── Fetch pharmacist-only medicines ──────────────────────────────────────
  const fetchPharmacistMeds = async () => {
    setMedsLoading(true);
    try {
      const q    = query(
        collection(db, "pharmacistProducts"),
        where("visibility", "==", "pharmacist_only"),
        orderBy("name", "asc")
      );
      const snap = await getDocs(q);
      setPharmacistMeds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Pharmacist meds fetch error:", err);
    } finally {
      setMedsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
    fetchPharmacistMeds();
  }, []);

  // ── Select prescription and resolve signed image URL ─────────────────────
// ── Select prescription — Cloudinary URLs work directly ──────────────────
const handleSelectRx = async (p) => {
  setSelectedRx(p);
  setMeds(p.medications || []);
  setImageBase64(null);
  setResolvedImageUrl(null);

  if (p.imageUrl) {
    // Cloudinary URL — use directly, no Firebase Storage needed
    setResolvedImageUrl(p.imageUrl);
  }
};

  // ── Quick-add from pharmacist medicine list ───────────────────────────────
  const handleQuickAdd = (product) => {
    setCurrentMed({
      name:   product.name   || "",
      dosage: "",
      timing: "",
      qty:    "1",
      price:  String(product.price || product.retailPrice || ""),
    });
  };

  // ── Medication helpers ────────────────────────────────────────────────────
  const addMedication = () => {
    if (!currentMed.name || !currentMed.qty) return;
    setMeds([...meds, { ...currentMed, id: Date.now() }]);
    setCurrentMed({ name: "", dosage: "", timing: "", qty: "", price: "" });
  };

  const removeMed = (id) => setMeds(meds.filter(m => m.id !== id));

  // ── Approve / Reject ──────────────────────────────────────────────────────
  const handleFinalize = async (status) => {
    if (!selectedRx) return;
    setIsSubmitting(true);
    try {
      const updateData = {
        status,
        processedAt:    Timestamp.now(),
        pharmacistNote: "Prescription processed by pharmacist.",
      };
      if (status === "Approved" && meds.length > 0) {
        updateData.medications = meds.map(({ name, dosage, timing, qty, price }) => ({
          name, dosage, timing,
          qty:   parseInt(qty),
          price: parseFloat(price) || 0,
        }));
        updateData.totalAmount = meds.reduce(
          (sum, m) => sum + (parseFloat(m.price) || 0) * (parseInt(m.qty) || 0), 0
        );
      }
      await updateDoc(doc(db, "prescriptions", selectedRx.id), updateData);
      alert(`Prescription ${status.toLowerCase()} successfully!`);
      if (status === "Approved") { setSelectedRx(null); setMeds([]); setImageBase64(null); setResolvedImageUrl(null); }
    } catch (err) {
      alert(`Failed to update: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── PDF download ──────────────────────────────────────────────────────────
  const handleDownloadPDF = () => {
    if (!selectedRx) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>RX-${selectedRx.id.slice(-8).toUpperCase()}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; }
            .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 22px; }
            .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.8; }
            .badge { float: right; background: ${selectedRx.status === 'Approved' ? '#10b981' : selectedRx.status === 'Rejected' ? '#ef4444' : '#f59e0b'}; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; }
            .info-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; background: #f8fafc; }
            .info-box h3 { margin: 0 0 10px; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
            .info-box p { margin: 4px 0; font-size: 13px; }
            .section-title { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
            img { width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #2563eb; color: white; padding: 8px 12px; text-align: left; font-size: 11px; }
            td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) td { background: #f8fafc; }
            .total-row td { background: #eff6ff; font-weight: bold; color: #2563eb; font-size: 14px; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <span class="badge">${selectedRx.status || 'Pending'}</span>
            <h1>MediCare Pharmacy</h1>
            <p>Official Prescription Record &nbsp;|&nbsp; RX-${selectedRx.id.slice(-8).toUpperCase()}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>

          <div class="info-box">
            <h3>Patient Information</h3>
            <p><b>${selectedRx.customerName || 'N/A'}</b></p>
            <p>Phone: ${selectedRx.customerPhone || 'N/A'}</p>
            <p>Address: ${selectedRx.customerAddress || 'N/A'}</p>
            <p>Submitted: ${selectedRx.createdAt?.toDate ? selectedRx.createdAt.toDate().toLocaleString() : 'N/A'}</p>
          </div>

          <div class="section-title">Prescription Image</div>
          ${resolvedImageUrl ? `<img src="${resolvedImageUrl}" onload="window.print()" onerror="window.print()" />` : '<p style="color:#94a3b8">No image attached.</p>'}

          ${meds.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Medication</th>
                <th>Dosage</th>
                <th>Timing</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${meds.map(m => `
                <tr>
                  <td>${m.name}</td>
                  <td>${m.dosage}</td>
                  <td>${m.timing}</td>
                  <td>${m.qty}</td>
                  <td>Rs. ${(m.qty * m.price).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4">TOTAL</td>
                <td>Rs. ${meds.reduce((sum, m) => sum + m.qty * m.price, 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          ` : ''}

          <div class="footer">This is a computer-generated document. MediCare Pharmacy. All rights reserved.</div>

          ${!resolvedImageUrl ? '<script>window.print();</script>' : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ── Filtered medicine list ────────────────────────────────────────────────
  const filteredMeds = pharmacistMeds.filter(m =>
    m.name?.toLowerCase().includes(medSearch.toLowerCase())
  );

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-8 text-center text-slate-500">Loading prescriptions...</div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 font-['Inter',sans-serif]">

      {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
      <div className="w-[380px] flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">

        <div className="sticky top-0 bg-[#f8fafc] z-10 pb-2">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
              <ClipboardList className="text-blue-600" />
              Prescriptions
            </h1>
            <button
              onClick={fetchPrescriptions}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
              title="Refresh"
            >
              <Clock size={18} />
            </button>
          </div>
          <div className="flex gap-2 mt-4">
            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full uppercase tracking-wider">
              Pending: {prescriptions.filter(p => (p.status || "Pending") === "Pending").length}
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
              onClick={() => handleSelectRx(p)}
              className={`text-left p-4 rounded-2xl border transition-all duration-200 group relative ${
                selectedRx?.id === p.id
                  ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-200"
                  : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <p className={`font-bold text-sm ${selectedRx?.id === p.id ? "text-white" : "text-slate-800"}`}>
                  {p.customerName || "Anonymous User"}
                </p>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  p.status === "Approved" ? "bg-emerald-100 text-emerald-700" :
                  p.status === "Rejected" ? "bg-red-100 text-red-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {p.status || "Pending"}
                </span>
              </div>
              <div className={`flex items-center gap-2 text-[11px] ${selectedRx?.id === p.id ? "text-blue-100" : "text-slate-500"}`}>
                <Clock size={12} />
                {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString() : "Recent"}
              </div>
              <ChevronRight
                className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform ${
                  selectedRx?.id === p.id ? "text-white translate-x-1" : "text-slate-300 group-hover:text-blue-400"
                }`}
                size={18}
              />
            </button>
          ))
        )}
      </div>

      {/* ── Right Panel ──────────────────────────────────────────────────── */}
      <div className="flex-1 bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden flex flex-col">
        {selectedRx ? (
          <div className="flex h-full overflow-hidden">

            {/* ── Col 1: Image + Patient Info ──────────────────────────────── */}
            <div className="w-[35%] border-r border-slate-100 bg-slate-50/50 flex flex-col p-6">

              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ImageIcon size={18} className="text-blue-600" />
                  Prescription Image
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isDownloading || imageLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isDownloading ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <><Download size={12} /> PDF</>
                    )}
                  </button>
                  {resolvedImageUrl && (
                    <a
                      href={resolvedImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline text-xs font-semibold flex items-center gap-1"
                    >
                      <ExternalLink size={12} /> Open Full
                    </a>
                  )}
                </div>
              </div>

              {/* Image viewer — uses resolvedImageUrl (signed) */}
              <div className="flex-1 rounded-2xl border-2 border-slate-200 overflow-hidden bg-black flex items-center justify-center relative">
                {imageLoading ? (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-xs">Loading image...</p>
                  </div>
                ) : resolvedImageUrl ? (
                  <img src={resolvedImageUrl} alt="Prescription" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-slate-500 text-sm">No image available</div>
                )}
              </div>

              {/* Patient details */}
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

            {/* ── Col 2: Pharmacist Medicine List ──────────────────────────── */}
            <div className="w-[220px] border-r border-slate-100 flex flex-col bg-slate-50/30">

              {/* Header */}
              <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <Package size={15} className="text-rose-500" />
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                    Medicine List
                  </span>
                </div>
                {/* Search */}
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={medSearch}
                    onChange={e => setMedSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-[11px] bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition-all"
                  />
                </div>
              </div>

              {/* Medicine items */}
              <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2">
                {medsLoading ? (
                  <div className="text-center py-6 text-slate-400 text-xs">Loading...</div>
                ) : filteredMeds.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">No medicines found</div>
                ) : (
                  filteredMeds.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleQuickAdd(product)}
                      title={`Click to pre-fill: ${product.name}`}
                      className="w-full text-left px-3 py-2.5 mb-1 rounded-xl border border-transparent hover:border-blue-200 hover:bg-blue-50 transition-all duration-150 group"
                    >
                      <p className="text-[12px] font-semibold text-slate-700 group-hover:text-blue-700 leading-tight truncate">
                        {product.name}
                      </p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-slate-400 truncate">{product.category || "—"}</span>
                        <span className="text-[10px] font-bold text-emerald-600 shrink-0 ml-1">
                          Rs.{Number(product.price || product.retailPrice || 0).toFixed(0)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer hint */}
              <div className="px-3 py-2 border-t border-slate-100 bg-slate-50">
                <p className="text-[9px] text-slate-400 text-center leading-tight">
                  Click any medicine to pre-fill the form
                </p>
              </div>
            </div>

            {/* ── Col 3: Medication Entry + Table + Actions ─────────────────── */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">

              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Process Prescription</h2>
                  <p className="text-xs text-slate-500 mt-1">Add medications as seen in the prescription.</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  selectedRx.status === "Approved" ? "bg-emerald-100 text-emerald-600" :
                  selectedRx.status === "Rejected" ? "bg-red-100 text-red-600" :
                  "bg-amber-100 text-amber-600"
                }`}>
                  {selectedRx.status || "Pending Review"}
                </div>
              </div>

              {/* ── Already processed: show read-only view ───────────────────── */}
              {(
                selectedRx.status === "Approved"       ||
                selectedRx.status === "Rejected"       ||
                selectedRx.status === "Paid"           ||
                selectedRx.status === "Packing"        ||
                selectedRx.status === "Out for Delivery" ||
                selectedRx.status === "Delivered"      ||
                selectedRx.status === "Ready to Collect"
              ) ? (
                <div className={`flex flex-col items-center justify-center flex-1 rounded-2xl border-2 border-dashed gap-4 px-8 py-12 text-center ${
                  selectedRx.status === "Rejected"
                    ? "border-red-200 bg-red-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}>
                  {selectedRx.status === "Rejected"
                    ? <XCircle size={48} className="text-red-400" />
                    : <CheckCircle size={48} className="text-emerald-400" />}
                  <div>
                    <p className={`text-lg font-black ${selectedRx.status === "Rejected" ? "text-red-700" : "text-emerald-700"}`}>
                      Prescription {selectedRx.status}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {selectedRx.status === "Rejected"
                        ? "This prescription has been rejected and cannot be processed again."
                        : "This prescription has already been approved and the bill sent to the customer."}
                    </p>
                  </div>
                  {selectedRx.status !== "Rejected" && selectedRx.medications?.length > 0 && (
                    <div className="w-full mt-2 border border-emerald-200 rounded-xl overflow-hidden">
                      <div className="bg-emerald-100 px-4 py-2 text-[10px] font-black text-emerald-700 uppercase tracking-wider text-left">
                        Dispensed Medications
                      </div>
                      <table className="w-full text-sm">
                        <tbody>
                          {selectedRx.medications.map((m, i) => (
                            <tr key={i} className="border-t border-emerald-100 bg-white">
                              <td className="px-4 py-2">
                                <p className="font-bold text-slate-700 text-xs">{m.name}</p>
                                <p className="text-[10px] text-slate-400">{m.dosage} • {m.timing}</p>
                              </td>
                              <td className="px-4 py-2 text-center text-xs text-slate-500">x{m.qty}</td>
                              <td className="px-4 py-2 text-right text-xs font-bold text-emerald-600">
                                Rs. {((m.qty || 0) * (m.price || 0)).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t border-emerald-200 bg-emerald-50">
                            <td colSpan={2} className="px-4 py-2 text-xs font-black text-emerald-700">TOTAL</td>
                            <td className="px-4 py-2 text-right text-sm font-black text-emerald-700">
                              Rs. {(selectedRx.totalAmount || 0).toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                  {selectedRx.processedAt && (
                    <p className="text-[10px] text-slate-400">
                      Processed: {selectedRx.processedAt?.toDate ? selectedRx.processedAt.toDate().toLocaleString() : "—"}
                    </p>
                  )}
                </div>
              ) : (<>

              {/* Add medication inputs */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Medication Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Amoxicillin 500mg"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all"
                      value={currentMed.name}
                      onChange={e => setCurrentMed({ ...currentMed, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dosage</label>
                    <input
                      type="text"
                      placeholder="e.g. 1 capsule"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all"
                      value={currentMed.dosage}
                      onChange={e => setCurrentMed({ ...currentMed, dosage: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Timing</label>
                    <input
                      type="text"
                      placeholder="e.g. BD"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all"
                      value={currentMed.timing}
                      onChange={e => setCurrentMed({ ...currentMed, timing: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quantity</label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all"
                      value={currentMed.qty}
                      onChange={e => setCurrentMed({ ...currentMed, qty: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Unit Price (Rs.)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all"
                      value={currentMed.price}
                      onChange={e => setCurrentMed({ ...currentMed, price: e.target.value })}
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

              {/* Medication table */}
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
                            <td className="px-4 py-3 text-right font-bold text-blue-600">
                              Rs. {(m.qty * m.price).toFixed(2)}
                            </td>
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

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleFinalize("Rejected")}
                  disabled={isSubmitting}
                  className="flex-1 border-2 border-red-500 text-red-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-all disabled:opacity-50"
                >
                  <XCircle size={18} /> Reject Prescription
                </button>
                <button
                  onClick={() => handleFinalize("Approved")}
                  disabled={isSubmitting || meds.length === 0}
                  className="flex-[2] bg-emerald-600 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
                >
                  <CheckCircle size={18} />
                  {isSubmitting ? "Processing..." : "Approve & Send Quote"}
                </button>
              </div>
              </>)}
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <ClipboardList size={40} className="text-slate-200" />
            </div>
            <h2 className="text-xl font-bold text-slate-600">No Selection</h2>
            <p className="max-w-[300px] mt-2 text-sm">
              Select a prescription from the left sidebar to start processing medications.
            </p>
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