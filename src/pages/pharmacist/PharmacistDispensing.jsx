import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText, Clock, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Banknote,
  TrendingUp, AlertCircle, BadgeCheck, RefreshCw,
  Pill, User, Hash, DollarSign, ClipboardList,
  MapPin, Phone, Calendar, CreditCard, X,
  MessageSquare, Tag
} from "lucide-react";

const API_BASE = `${import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL_RAILWAY}/api`;

const C = {
  bg:          "#f8fafc",
  surface:     "#ffffff",
  border:      "rgba(148,163,184,0.25)",
  textPrimary: "#0f172a",
  textMuted:   "#64748b",
  textSoft:    "#475569",
};

const FONT = {
  display: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
  body:    "'DM Sans', 'Inter', sans-serif",
};

function statusStyle(status) {
  switch ((status || "").toLowerCase()) {
    case "completed":  return { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", dot: "#22c55e" };
    case "dispensed":  return { bg: "#f0fdfa", color: "#0f766e", border: "#99f6e4", dot: "#14b8a6" };
    case "approved":   return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", dot: "#3b82f6" };
    case "processing": return { bg: "#faf5ff", color: "#7e22ce", border: "#e9d5ff", dot: "#a855f7" };
    case "cancelled":  return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", dot: "#ef4444" };
    default:           return { bg: "#fffbeb", color: "#b45309", border: "#fde68a", dot: "#f59e0b" };
  }
}

function paymentStatusStyle(status) {
  switch ((status || "").toLowerCase()) {
    case "paid":   return { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", dot: "#22c55e" };
    case "failed": return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", dot: "#ef4444" };
    default:       return { bg: "#fffbeb", color: "#b45309", border: "#fde68a", dot: "#f59e0b" };
  }
}

function getBorderColor(rx) {
  const s = (rx.status || "pending").toLowerCase();
  const p = (rx.paymentStatus || "pending").toLowerCase();
  if (p === "paid") return "#22c55e";
  switch (s) {
    case "completed":  return "#22c55e";
    case "dispensed":  return "#14b8a6";
    case "approved":   return "#3b82f6";
    case "processing": return "#a855f7";
    case "cancelled":  return "#ef4444";
    default:           return "#f59e0b";
  }
}

// ── Universal timestamp helpers (handles ISO string, Firestore _seconds/seconds)
function parseTs(val) {
  if (!val) return null;
  if (typeof val === "string") return new Date(val);
  if (val._seconds)            return new Date(val._seconds * 1000);
  if (val.seconds)             return new Date(val.seconds * 1000);
  return null;
}

function fmtTs(val) {
  const date = parseTs(val);
  if (!date) return null;
  return date.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getOrderDay(val) {
  const date = parseTs(val);
  if (!date) return null;
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
}

function fmtOrderPlacedDate(val) {
  const date = parseTs(val);
  if (!date) return null;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Badge ──────────────────────────────────────────────────────────────────────
function Badge({ label, style: s }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      display: "inline-flex", alignItems: "center", gap: 4,
      whiteSpace: "nowrap", letterSpacing: "0.02em", fontFamily: FONT.body,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// ── Info Row ───────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, mono }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <Icon size={12} color={C.textMuted} />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: FONT.body }}>{label}</div>
        <div style={{ fontSize: 12, color: C.textPrimary, fontFamily: mono ? "monospace" : FONT.body, marginTop: 1, wordBreak: "break-all" }}>{value}</div>
      </div>
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={19} color={color} strokeWidth={2} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, fontFamily: FONT.body }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.textPrimary, lineHeight: 1.15, marginTop: 2, fontFamily: FONT.display }}>{value}</div>
      </div>
    </div>
  );
}

// ── Weekly Chart ───────────────────────────────────────────────────────────────
function WeeklyChart({ items }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date().getDay();
  const counts = new Array(7).fill(0);
  items.forEach(rx => {
    const date = parseTs(rx.processedAt || rx.createdAt || rx.dispensedAt);
    if (date) counts[date.getDay()]++;
  });
  const max = Math.max(...counts, 1);
  const reordered = Array.from({ length: 7 }, (_, i) => {
    const idx = (today - 6 + i + 7) % 7;
    return { day: days[idx], count: counts[idx], isToday: idx === today };
  });
  return (
    <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, fontFamily: FONT.body }}>Prescriptions this week</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary, lineHeight: 1.2, marginTop: 2, fontFamily: FONT.display }}>{items.length} total</div>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <TrendingUp size={16} color="#2563eb" />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64 }}>
        {reordered.map(({ day, count, isToday }, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div title={`${count} prescriptions`} style={{ width: "100%", height: Math.max((count / max) * 48, count > 0 ? 8 : 3), borderRadius: "4px 4px 0 0", background: isToday ? "linear-gradient(180deg,#3b82f6,#1d4ed8)" : count > 0 ? "#bfdbfe" : "#f1f5f9", minHeight: 3, transition: "height 0.3s ease" }} />
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: isToday ? "#2563eb" : "#94a3b8", fontFamily: FONT.body }}>{day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Payment Donut ──────────────────────────────────────────────────────────────
function PaymentChart({ items }) {
  const canvasRef = useRef(null);
  const cod        = items.filter(rx => (rx.paymentMethod || "").toLowerCase() === "cod");
  const codPaid    = cod.filter(rx => (rx.paymentStatus || "").toLowerCase() === "paid").length;
  const codPending = cod.filter(rx => (rx.paymentStatus || "").toLowerCase() !== "paid").length;
  const online     = items.filter(rx => (rx.paymentMethod || "").toLowerCase() !== "cod");
  const onlinePaid = online.filter(rx => (rx.paymentStatus || "").toLowerCase() === "paid").length;
  const total      = items.length;
  const paidTotal  = items.filter(rx => (rx.paymentStatus || "").toLowerCase() === "paid").length;
  const pct        = total > 0 ? Math.round((paidTotal / total) * 100) : 0;

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 80, 80);
    const segments = [
      { value: codPaid,    color: "#22c55e" },
      { value: codPending, color: "#f59e0b" },
      { value: onlinePaid, color: "#3b82f6" },
      { value: Math.max(0, total - codPaid - codPending - onlinePaid), color: "#e2e8f0" },
    ].filter(s => s.value > 0);
    const cx = 40, cy = 40, r = 34, ir = 22;
    let start = -Math.PI / 2;
    segments.forEach(seg => {
      const angle = (seg.value / (total || 1)) * 2 * Math.PI;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, start + angle);
      ctx.closePath(); ctx.fillStyle = seg.color; ctx.fill(); start += angle;
    });
    ctx.beginPath(); ctx.arc(cx, cy, ir, 0, 2 * Math.PI); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#0f172a"; ctx.font = "bold 13px sans-serif";
    ctx.fillText(pct + "%", cx, cy);
  }, [items]);

  return (
    <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, fontFamily: FONT.body, marginBottom: 14 }}>Payment overview</div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <canvas ref={canvasRef} width={80} height={80} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { dot: "#22c55e", label: "COD settled", val: codPaid },
            { dot: "#f59e0b", label: "COD pending", val: codPending },
            { dot: "#3b82f6", label: "Online paid",  val: onlinePaid },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 7, fontFamily: FONT.body }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.dot }} />{r.label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: r.dot, fontFamily: FONT.display }}>{r.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Action Button ──────────────────────────────────────────────────────────────
function ActionBtn({ label, icon: Icon, onClick, disabled, color, bg, border }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8,
      display: "flex", alignItems: "center", gap: 6,
      background: disabled ? "#f8fafc" : bg, color: disabled ? "#94a3b8" : color,
      border: `1px solid ${disabled ? "#e2e8f0" : border}`,
      cursor: disabled ? "not-allowed" : "pointer", fontFamily: FONT.body, opacity: disabled ? 0.6 : 1,
    }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.82"; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = "1"; }}
    >
      <Icon size={13} strokeWidth={2.5} />{label}
    </button>
  );
}

// ── Prescription Row ───────────────────────────────────────────────────────────
function PrescriptionRow({ rx, onStatusUpdate, onPaymentSettle, updating }) {
  const [expanded, setExpanded] = useState(false);

  const sStyle     = statusStyle(rx.status);
  const pStyle     = paymentStatusStyle(rx.paymentStatus);
  const isCOD      = (rx.paymentMethod || "").toLowerCase() === "cod";
  const status     = (rx.status || "pending").toLowerCase();
  const isTerminal = status === "completed" || status === "cancelled";
  const isPaid     = (rx.paymentStatus || "").toLowerCase() === "paid";
  const meds       = rx.medications || rx.orderItems || [];

  const patientName = rx.patientName || rx.customerName || rx.userName || rx.name || "Patient";
  const phone       = rx.phone || rx.phoneNumber || rx.contactNumber;
  const address     = rx.address || rx.deliveryAddress || rx.location;

  // Best timestamp for the summary row
  const mainTsVal = rx.processedAt || rx.createdAt || rx.dispensedAt;
  const dateStr   = fmtTs(mainTsVal) || "—";

  return (
    <div style={{
      background: C.surface, borderRadius: 12,
      border: `1px solid ${C.border}`, borderLeft: `3.5px solid ${getBorderColor(rx)}`,
      overflow: "hidden", transition: "box-shadow 0.15s",
      boxShadow: expanded ? "0 4px 16px rgba(0,0,0,0.07)" : "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      {isPaid && <div style={{ height: 2, background: "linear-gradient(90deg,#22c55e,#86efac)", width: "100%" }} />}

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1.1fr 0.85fr 0.85fr 0.7fr 1fr 1fr 90px", gap: 12, padding: "13px 18px", alignItems: "center" }}>

        {/* Patient */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: FONT.body }}>{patientName}</span>
            {isCOD && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", textTransform: "uppercase", letterSpacing: "0.06em" }}>COD</span>}
            {isPaid && isCOD && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", textTransform: "uppercase", letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 3 }}>
                <BadgeCheck size={9} />Settled
              </span>
            )}
          </div>
          {phone && (
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3, display: "flex", alignItems: "center", gap: 4, fontFamily: FONT.body }}>
              <Phone size={10} />{phone}
            </div>
          )}
          {address && (
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, display: "flex", alignItems: "center", gap: 4, fontFamily: FONT.body }}>
              <MapPin size={10} />{address}
            </div>
          )}
          {!phone && rx.userId && (
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3, display: "flex", alignItems: "center", gap: 4, fontFamily: FONT.body }}>
              <User size={10} />{rx.userId.slice(0, 20)}…
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: C.textSoft, fontFamily: FONT.body }}>{dateStr}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#2563eb", fontFamily: FONT.body }}>{getOrderDay(rx.createdAt)}</div>
        <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT.body }}>{fmtOrderPlacedDate(rx.createdAt)}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: FONT.body }}>{meds.length} med{meds.length !== 1 ? "s" : ""}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <Badge label={rx.paymentMethod || "—"} style={{ bg: "#f8fafc", color: "#475569", border: "#e2e8f0", dot: "#94a3b8" }} />
          <Badge label={rx.paymentStatus || "pending"} style={pStyle} />
        </div>

        <Badge label={rx.status || "pending"} style={sStyle} />

        <button onClick={() => setExpanded(e => !e)} style={{
          fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 8,
          background: expanded ? "#eff6ff" : "#f8fafc",
          border: `1px solid ${expanded ? "#bfdbfe" : C.border}`,
          color: expanded ? "#1d4ed8" : C.textSoft,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
          fontFamily: FONT.body, transition: "all 0.15s",
        }}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? "Hide" : "Details"}
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "18px 20px", background: "#fafbfc" }}>

          {isPaid && isCOD && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, marginBottom: 16, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <BadgeCheck size={15} color="#15803d" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#15803d", fontFamily: FONT.body }}>Cash payment has been settled for this prescription</span>
            </div>
          )}

          {/* Two-column detail cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>

            {/* Patient details */}
            <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT.body, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>Patient details</div>
              <InfoRow icon={User}   label="Patient name" value={patientName} />
              <InfoRow icon={Phone}  label="Phone"        value={phone} />
              <InfoRow icon={MapPin} label="Address"      value={address} />
              <InfoRow icon={User}   label="User ID"      value={rx.userId}  mono />
              <InfoRow icon={Hash}   label="Rx ID"        value={rx.prescriptionId || rx.rxId || rx.id} mono />
            </div>

            {/* Order details */}
            <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT.body, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>Order details</div>
              <InfoRow icon={Calendar}   label="Order placed"    value={fmtTs(rx.createdAt)} />
              <InfoRow icon={Calendar}   label="Processed at"    value={fmtTs(rx.processedAt)} />
              <InfoRow icon={Calendar}   label="Dispensed at"    value={fmtTs(rx.dispensedAt)} />
              <InfoRow icon={CreditCard} label="Payment method"  value={rx.paymentMethod} />
              {(rx.totalAmount !== undefined || rx.total !== undefined) && (
                <InfoRow icon={DollarSign} label="Total amount" value={`Rs. ${rx.totalAmount ?? rx.total}`} />
              )}
            </div>
          </div>

          {/* Prescription image */}
          {rx.imageUrl && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: FONT.body }}>Prescription image</div>
              <img src={rx.imageUrl} alt="Prescription" onClick={() => window.open(rx.imageUrl, "_blank")}
                style={{ maxWidth: 240, maxHeight: 180, borderRadius: 10, objectFit: "cover", border: `1px solid ${C.border}`, cursor: "pointer" }} />
            </div>
          )}

          {/* Medications */}
          {meds.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontFamily: FONT.body }}>Medications</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {meds.map((med, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surface, borderRadius: 9, padding: "10px 14px", border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Pill size={15} color="#15803d" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: FONT.body }}>{med.name || med.medicineName || med.medicine || "—"}</div>
                        {med.dosage       && <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT.body }}>Dosage: {med.dosage}</div>}
                        {med.duration     && <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT.body }}>Duration: {med.duration}</div>}
                        {med.timing       && <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT.body }}>Timing: {med.timing}</div>}
                        {med.instructions && <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT.body }}>Instructions: {med.instructions}</div>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {med.qty   !== undefined && <div style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", fontFamily: FONT.display }}>×{med.qty}</div>}
                      {med.price !== undefined && <div style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT.body }}>Rs. {med.price}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pharmacist note */}
          {rx.pharmacistNote && (
            <div style={{ background: "#f8fbff", border: "1px solid #dbeafe", borderRadius: 9, padding: "10px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 5 }}>
                <MessageSquare size={10} />Pharmacist note
              </div>
              <div style={{ fontSize: 13, color: C.textSoft, fontFamily: FONT.body }}>{rx.pharmacistNote}</div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ActionBtn label="Complete" icon={CheckCircle} disabled={isTerminal || updating}
              onClick={() => onStatusUpdate(rx.id, "completed")} color="#1d4ed8" bg="#eff6ff" border="#bfdbfe" />
            <ActionBtn label="Cancel" icon={X} disabled={isTerminal || updating}
              onClick={() => onStatusUpdate(rx.id, "cancelled")} color="#b91c1c" bg="#fef2f2" border="#fecaca" />
            {isCOD && (
              <ActionBtn label="Payment settled" icon={Banknote} disabled={isPaid || updating}
                onClick={() => onPaymentSettle(rx.id)} color="#15803d" bg="#f0fdf4" border="#bbf7d0" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50, display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderRadius: 12, background: type === "success" ? "#15803d" : "#b91c1c", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: FONT.body, minWidth: 260, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", animation: "slideInUp 0.22s ease" }}>
      {type === "success" ? <BadgeCheck size={16} /> : <AlertCircle size={16} />}
      {message}
    </div>
  );
}

// ── Filter Button ──────────────────────────────────────────────────────────────
function FilterBtn({ active, label, onClick, accentColor, accentBg, accentBorder }) {
  return (
    <button onClick={onClick} style={{ fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8, border: `1px solid ${active ? accentBorder : C.border}`, background: active ? accentBg : C.surface, color: active ? accentColor : C.textSoft, cursor: "pointer", fontFamily: FONT.body, transition: "all 0.15s" }}>
      {label}
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Dispense() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [filter,   setFilter]   = useState("all");
  const [search,   setSearch]   = useState("");
  const [updating, setUpdating] = useState(false);
  const [toast,    setToast]    = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/pharmacist/dispensed`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => {
        const aDate = parseTs(a.processedAt || a.createdAt || a.dispensedAt);
        const bDate = parseTs(b.processedAt || b.createdAt || b.dispensedAt);
        return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
      });
      setPrescriptions(list);
    } catch (err) {
      console.error("Failed to fetch dispensed history:", err);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleStatusUpdate = async (id, status) => {
    setUpdating(true);
    const prev = prescriptions;
    setPrescriptions(p => p.map(x => x.id === id ? { ...x, status } : x));
    try {
      const res = await fetch(`${API_BASE}/pharmacist/dispensed/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchAll();
      setToast({ message: `Marked as ${status}`, type: "success" });
    } catch (err) {
      setPrescriptions(prev);
      setToast({ message: `Failed: ${err.message}`, type: "error" });
    } finally { setUpdating(false); }
  };

  const handlePaymentSettle = async (rxId) => {
    setUpdating(true);
    const prev = prescriptions;
    setPrescriptions(p => p.map(x => x.id === rxId ? { ...x, paymentStatus: "paid" } : x));
    try {
      const res = await fetch(`${API_BASE}/pharmacist/dispensed/${rxId}/settle-payment`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchAll();
      setToast({ message: "Payment settled!", type: "success" });
    } catch (err) {
      setPrescriptions(prev);
      setToast({ message: `Failed: ${err.message}`, type: "error" });
    } finally { setUpdating(false); }
  };

  const total      = prescriptions.length;
  const pending    = prescriptions.filter(rx => (rx.status || "pending").toLowerCase() === "pending").length;
  const completed  = prescriptions.filter(rx => (rx.status || "").toLowerCase() === "completed").length;
  const dispensed  = prescriptions.filter(rx => (rx.status || "").toLowerCase() === "dispensed").length;
  const cancelled  = prescriptions.filter(rx => (rx.status || "").toLowerCase() === "cancelled").length;
  const approved   = prescriptions.filter(rx => (rx.status || "").toLowerCase() === "approved").length;
  const processing = prescriptions.filter(rx => (rx.status || "").toLowerCase() === "processing").length;
  const cod        = prescriptions.filter(rx => (rx.paymentMethod || "").toLowerCase() === "cod").length;
  const codSettled = prescriptions.filter(rx =>
    (rx.paymentMethod || "").toLowerCase() === "cod" &&
    (rx.paymentStatus || "").toLowerCase() === "paid"
  ).length;
  const paidRx = prescriptions.filter(rx => (rx.paymentStatus || "").toLowerCase() === "paid").length;

  const visible = prescriptions.filter(rx => {
    const s = (rx.status || "pending").toLowerCase();
    const matchFilter =
      filter === "all"        ? true :
      filter === "pending"    ? s === "pending"    :
      filter === "approved"   ? s === "approved"   :
      filter === "processing" ? s === "processing" :
      filter === "dispensed"  ? s === "dispensed"  :
      filter === "completed"  ? s === "completed"  :
      filter === "cancelled"  ? s === "cancelled"  :
      filter === "cod"        ? (rx.paymentMethod || "").toLowerCase() === "cod" :
      filter === "paid"       ? (rx.paymentStatus || "").toLowerCase() === "paid" : true;

    const q = search.toLowerCase();
    const matchSearch = !search ||
      (rx.patientName     || "").toLowerCase().includes(q) ||
      (rx.customerName    || "").toLowerCase().includes(q) ||
      (rx.userName        || "").toLowerCase().includes(q) ||
      (rx.phone           || "").toLowerCase().includes(q) ||
      (rx.phoneNumber     || "").toLowerCase().includes(q) ||
      (rx.address         || "").toLowerCase().includes(q) ||
      (rx.deliveryAddress || "").toLowerCase().includes(q) ||
      (rx.userId          || "").toLowerCase().includes(q) ||
      (rx.id              || "").toLowerCase().includes(q) ||
      (rx.medications || rx.orderItems || []).some(m =>
        (m.name || m.medicineName || m.medicine || "").toLowerCase().includes(q)
      );

    return matchFilter && matchSearch;
  });

  const filters = [
    { key: "all",        label: `All (${total})`,             accent: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
    { key: "pending",    label: `Pending (${pending})`,       accent: "#b45309", bg: "#fffbeb", border: "#fde68a" },
    { key: "approved",   label: `Approved (${approved})`,     accent: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
    { key: "processing", label: `Processing (${processing})`, accent: "#7e22ce", bg: "#faf5ff", border: "#e9d5ff" },
    { key: "dispensed",  label: `Dispensed (${dispensed})`,   accent: "#0f766e", bg: "#f0fdfa", border: "#99f6e4" },
    { key: "completed",  label: `Completed (${completed})`,   accent: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
    { key: "cancelled",  label: `Cancelled (${cancelled})`,   accent: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
    { key: "cod",        label: `COD (${cod})`,               accent: "#b45309", bg: "#fffbeb", border: "#fde68a" },
    { key: "paid",       label: `Paid (${paidRx})`,           accent: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  ];

  return (
    <div style={{ fontFamily: FONT.body, minHeight: "100vh", background: C.bg }}>
      <style>{`
        @keyframes slideInUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 24px" }}>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Dispense</h1>
            <p className="text-slate-500 font-medium mt-1">Full prescription history — patient info, medications, timestamps & payment</p>
          </div>
          {updating && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 12, fontWeight: 600, color: "#1d4ed8", fontFamily: FONT.body }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #bfdbfe", borderTopColor: "#2563eb", animation: "spin 0.7s linear infinite" }} />
              Updating…
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
          <StatCard icon={ClipboardList} label="Total Rx"    value={total}      color="#2563eb" bg="#eff6ff" />
          <StatCard icon={Clock}         label="Pending"      value={pending}    color="#b45309" bg="#fffbeb" />
          <StatCard icon={Pill}          label="Dispensed"    value={dispensed}  color="#0f766e" bg="#f0fdfa" />
          <StatCard icon={CheckCircle}   label="Completed"    value={completed}  color="#15803d" bg="#f0fdf4" />
          <StatCard icon={XCircle}       label="Cancelled"    value={cancelled}  color="#b91c1c" bg="#fef2f2" />
          <StatCard icon={BadgeCheck}    label="COD Settled"  value={codSettled} color="#15803d" bg="#f0fdf4" />
        </div>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
          <WeeklyChart items={prescriptions} />
          <PaymentChart items={prescriptions} />
        </div>

        {/* Filters + search */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
          {filters.map(f => (
            <FilterBtn key={f.key} active={filter === f.key} label={f.label}
              onClick={() => setFilter(f.key)} accentColor={f.accent} accentBg={f.bg} accentBorder={f.border} />
          ))}
          <input placeholder="Search patient, phone, address, medicine…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginLeft: "auto", padding: "7px 12px", fontSize: 12, borderRadius: 8, outline: "none", border: `1px solid ${C.border}`, background: C.surface, color: C.textPrimary, fontFamily: FONT.body, width: 260 }}
          />
        </div>

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.1fr 0.85fr 0.85fr 0.7fr 1fr 1fr 90px", gap: 12, padding: "10px 18px", background: "linear-gradient(135deg,#f0f9ff,#f8fafc)", border: `1px solid ${C.border}`, borderRadius: "12px 12px 0 0", borderBottom: "none" }}>
          {["Patient", "Date", "Day Placed", "Order Placed", "Meds", "Payment", "Status", ""].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT.body }}>{h}</div>
          ))}
        </div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
          {visible.length === 0 ? (
            <div style={{ textAlign: "center", padding: "56px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "0 0 12px 12px" }}>
              <FileText size={40} color={C.textMuted} style={{ margin: "0 auto 12px" }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: C.textSoft, fontFamily: FONT.body }}>No prescriptions found</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontFamily: FONT.body }}>Try changing your filter or search query</div>
            </div>
          ) : visible.map(rx => (
            <PrescriptionRow key={rx.id} rx={rx}
              onStatusUpdate={handleStatusUpdate}
              onPaymentSettle={handlePaymentSettle}
              updating={updating}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textMuted, fontFamily: FONT.body }}>
            <RefreshCw size={11} />Auto-refreshes every 30 seconds
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, fontFamily: FONT.body }}>
            Showing <strong style={{ color: "#2563eb" }}>{visible.length}</strong> of <strong style={{ color: C.textPrimary }}>{total}</strong> prescriptions
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}