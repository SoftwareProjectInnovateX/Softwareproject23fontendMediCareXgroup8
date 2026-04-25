import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { FileText, Phone, MapPin, ExternalLink, CheckCircle, XCircle, ClipboardList } from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          "#f1f5f9",
  surface:     "#ffffff",
  border:      "rgba(26,135,225,0.18)",
  accent:      "#1a87e1",
  accentMid:   "#0284c7",
  textPrimary: "#1e293b",
  textMuted:   "#64748b",
  textSoft:    "#475569",
};

/** Maps prescription status to bg/text/border colour triple */
function statusStyle(status) {
  if (status === "Approved") return { bg: "rgba(16,185,129,0.1)",  color: "#059669", border: "rgba(16,185,129,0.25)" };
  if (status === "Rejected") return { bg: "rgba(239,68,68,0.1)",   color: "#dc2626", border: "rgba(239,68,68,0.25)"  };
  return                            { bg: "rgba(245,158,11,0.1)",  color: "#d97706", border: "rgba(245,158,11,0.25)" };
}

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [updatingId, setUpdatingId]       = useState(null);

  // Real-time listener – sorted client-side by createdAt descending
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "prescriptions"), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setPrescriptions(data);
    });
    return () => unsub();
  }, []);

  /**
   * Updates the prescription status directly in Firestore.
   * The onSnapshot listener will automatically reflect the change in UI.
   */
  const handleStatusUpdate = async (id, status) => {
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, "prescriptions", id), { status });
    } catch (err) {
      alert(`Failed to update: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="font-['DM_Sans',sans-serif]">

      <div className="mb-6">
        <h1 className="font-['Playfair_Display',serif] text-[26px] text-[#1e293b] font-semibold">
          Prescriptions
        </h1>
        <p className="text-[13px] text-[#64748b] mt-[5px]">
          Review and manage customer prescriptions.
        </p>
      </div>

      {/* ── Empty state ── */}
      {prescriptions.length === 0 ? (
        <div className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[14px] py-[60px] text-center shadow-[0_1px_4px_rgba(26,135,225,0.07)]">
          <ClipboardList size={40} color={C.textMuted} className="mx-auto mb-3" />
          <p className="text-[15px] text-[#475569] font-medium">No prescriptions yet.</p>
          <p className="text-[12px] text-[#64748b] mt-1">They will appear here when customers upload.</p>
        </div>
      ) : (
        <div>

          {/* Status count summary chips */}
          <div className="flex gap-[10px] mb-5">
            {["Pending", "Approved", "Rejected"].map(s => {
              const st = statusStyle(s);
              return (
                <div
                  key={s}
                  className="text-[11px] font-bold px-[14px] py-[6px] rounded-lg uppercase tracking-[0.06em]"
                  style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                >
                  {s}: {prescriptions.filter(p => (p.status || "Pending") === s).length}
                </div>
              );
            })}
          </div>

          {/* ── Prescription card list ── */}
          <div className="flex flex-col gap-3">
            {prescriptions.map(p => {
              const st = statusStyle(p.status || "Pending");
              const isUpdating = updatingId === p.id;

              return (
                <div
                  key={p.id}
                  className="bg-white border border-[rgba(26,135,225,0.18)] rounded-[14px] px-[18px] py-4 flex gap-4 shadow-[0_1px_4px_rgba(26,135,225,0.07)]"
                >

                  {/* Prescription image thumbnail or fallback icon */}
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt="prescription"
                      className="w-[90px] h-[90px] object-cover rounded-[10px] border border-[rgba(26,135,225,0.18)] shrink-0"
                    />
                  ) : (
                    <div className="w-[90px] h-[90px] rounded-[10px] border border-[rgba(26,135,225,0.18)] shrink-0 bg-[#f1f5f9] flex items-center justify-center">
                      <FileText size={28} color={C.textMuted} />
                    </div>
                  )}

                  <div className="flex-1">

                    {/* Top row: customer details + status badge */}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-[14px] font-semibold text-[#1e293b]">{p.customerName}</p>
                        <div className="flex items-center gap-[5px] mt-1">
                          <Phone size={11} color={C.textMuted} />
                          <p className="text-[11px] text-[#64748b]">{p.customerPhone}</p>
                        </div>
                        <div className="flex items-center gap-[5px] mt-[3px]">
                          <MapPin size={11} color={C.textMuted} />
                          <p className="text-[11px] text-[#64748b]">{p.customerAddress}</p>
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-bold px-[10px] py-[3px] rounded-[20px] uppercase tracking-[0.06em] whitespace-nowrap"
                        style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                      >
                        {p.status || "Pending"}
                      </span>
                    </div>

                    {/* External link to view the full-size prescription image */}
                    {p.imageUrl && (
                      <a
                        href={p.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#1a87e1] font-medium no-underline inline-flex items-center gap-1 mb-[10px]"
                      >
                        <ExternalLink size={11} color={C.accent} />
                        View Full Prescription
                      </a>
                    )}

                    {/* Approve / Reject action buttons */}
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => handleStatusUpdate(p.id, "Approved")}
                        disabled={p.status === "Approved" || isUpdating}
                        className="text-[11px] font-semibold px-[14px] py-[6px] rounded-[7px] font-['DM_Sans',sans-serif] flex items-center gap-[5px]"
                        style={{
                          cursor:     p.status === "Approved" || isUpdating ? "not-allowed" : "pointer",
                          background: p.status === "Approved" || isUpdating ? "rgba(16,185,129,0.05)" : "rgba(16,185,129,0.1)",
                          color:      p.status === "Approved" || isUpdating ? C.textMuted : "#059669",
                          border:     `1px solid ${p.status === "Approved" ? C.border : "rgba(16,185,129,0.25)"}`,
                        }}
                      >
                        <CheckCircle size={12} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(p.id, "Rejected")}
                        disabled={p.status === "Rejected" || isUpdating}
                        className="text-[11px] font-semibold px-[14px] py-[6px] rounded-[7px] font-['DM_Sans',sans-serif] flex items-center gap-[5px]"
                        style={{
                          cursor:     p.status === "Rejected" || isUpdating ? "not-allowed" : "pointer",
                          background: p.status === "Rejected" || isUpdating ? "rgba(239,68,68,0.05)" : "rgba(239,68,68,0.1)",
                          color:      p.status === "Rejected" || isUpdating ? C.textMuted : "#dc2626",
                          border:     `1px solid ${p.status === "Rejected" ? C.border : "rgba(239,68,68,0.25)"}`,
                        }}
                      >
                        <XCircle size={12} />
                        Reject
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}