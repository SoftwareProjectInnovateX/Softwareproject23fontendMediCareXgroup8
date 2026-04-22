import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  User, Mail, Phone, MapPin, Shield, Star,
  LogOut, Edit2, Save, X, ChevronRight,
  ShoppingBag, FileText, RotateCcw, Settings,
  CheckCircle, AlertCircle, Copy, Camera,
} from "lucide-react";

const C = {
  bg:         "#f1f5f9",
  surface:    "#ffffff",
  border:     "rgba(26,135,225,0.18)",
  accent:     "#1a87e1",
  accentDark: "#0f2a5e",
  accentMid:  "#0284c7",
  textPrimary:"#1e293b",
  textMuted:  "#64748b",
  textSoft:   "#475569",
};

const FONT = { display: "'Playfair Display', serif", body: "'DM Sans', sans-serif" };

const inputStyle = {
  width: "100%", padding: "10px 14px",
  border: `1px solid ${C.border}`, borderRadius: 10,
  fontSize: 13, color: C.textPrimary, fontFamily: FONT.body,
  background: C.surface, outline: "none", boxSizing: "border-box",
};

// ── Field ────────────────────────────────────────────────────────────────────
function Field({ label, icon: Icon, children }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label
        className="text-[11px] font-bold uppercase tracking-[0.08em] flex items-center gap-[5px]"
        style={{ color: C.textMuted }}
      >
        {Icon && <Icon size={11} color={C.accent} />}
        {label}
      </label>
      {children}
    </div>
  );
}

// ── InfoRow ──────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, accent }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-[10px]"
      style={{
        background: "rgba(26,135,225,0.03)",
        border: `1px solid ${C.border}`,
      }}
    >
      <div
        className="w-[34px] h-[34px] rounded-lg shrink-0 flex items-center justify-center"
        style={{ background: "rgba(26,135,225,0.1)" }}
      >
        <Icon size={15} color={C.accent} />
      </div>
      <div className="flex-1">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.06em]"
          style={{ color: C.textMuted }}
        >
          {label}
        </p>
        <p
          className="text-[13px] font-semibold mt-[2px]"
          style={{ color: accent ? C.accent : C.textPrimary }}
        >
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

// ── QuickLinkCard ────────────────────────────────────────────────────────────
function QuickLinkCard({ icon: Icon, label, sub, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-[14px] rounded-xl cursor-pointer transition-shadow duration-150"
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(26,135,225,0.14)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 4px rgba(26,135,225,0.07)"}
    >
      <div
        className="w-[38px] h-[38px] rounded-[10px] shrink-0 flex items-center justify-center"
        style={{ background: color + "18" }}
      >
        <Icon size={18} color={color} />
      </div>
      <div className="flex-1">
        <p className="text-[13px] font-bold" style={{ color: C.textPrimary }}>{label}</p>
        {sub && <p className="text-[11px] mt-[2px]" style={{ color: C.textMuted }}>{sub}</p>}
      </div>
      <ChevronRight size={15} color={C.textMuted} />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CustomerProfilePage() {
  const navigate     = useNavigate();
  const auth         = getAuth();
  const storage      = getStorage();
  const fileInputRef = useRef(null);

  const [user, setUser]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [editing, setEditing]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState(null);
  const [copied, setCopied]           = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fullName, setFullName]       = useState("");
  const [phone, setPhone]             = useState("");
  const [address, setAddress]         = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) { navigate("/login"); return; }
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setUser(data);
          setFullName(data.fullName || "");
          setPhone(data.phone || "");
          setAddress(data.address || "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        fullName, phone, address,
        updatedAt: serverTimestamp(),
      });
      setUser(prev => ({ ...prev, fullName, phone, address }));
      setEditing(false);
      showToast("Profile updated successfully!");
    } catch (err) {
      showToast("Failed to update profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      showToast("Logout failed.", "error");
    }
  };

  const copyCustomerId = () => {
    if (user?.customerId) {
      navigator.clipboard.writeText(user.customerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { showToast("Please select a valid image (JPG, PNG, WEBP, GIF).", "error"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("Image must be smaller than 5 MB.", "error"); return; }
    setUploadingPhoto(true);
    try {
      const storageRef = ref(storage, `profile_pictures/${user.id}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", user.id), { photoURL: downloadURL, updatedAt: serverTimestamp() });
      setUser(prev => ({ ...prev, photoURL: downloadURL }));
      showToast("Profile picture updated!");
    } catch (err) {
      console.error(err);
      showToast("Failed to upload photo.", "error");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  if (loading) return (
    <div
      className="flex justify-center items-center min-h-[60vh] text-[14px]"
      style={{ color: C.textMuted, fontFamily: FONT.body, background: C.bg }}
    >
      Loading profile…
    </div>
  );

  if (!user) return null;

  const initials = (user.fullName || "U").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: FONT.body }}>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-[100] flex items-center gap-2 px-[18px] py-3 rounded-xl"
          style={{
            background: toast.type === "success" ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            fontFamily: FONT.body,
          }}
        >
          {toast.type === "success"
            ? <CheckCircle size={15} color="#16a34a" />
            : <AlertCircle size={15} color="#dc2626" />}
          <p
            className="text-[13px] font-semibold"
            style={{ color: toast.type === "success" ? "#16a34a" : "#dc2626" }}
          >
            {toast.msg}
          </p>
        </div>
      )}

      {/* Hero banner */}
      <div
        className="px-6 pt-12 pb-20 text-center"
        style={{ background: "linear-gradient(135deg, #0f2a5e 0%, #1a87e1 100%)" }}
      >
        <div className="relative inline-block mb-[14px]">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handlePhotoChange}
          />

          {/* Avatar */}
          <div
            className="w-[84px] h-[84px] rounded-full flex items-center justify-center overflow-hidden text-[28px] font-bold text-white"
            style={{
              background: user.photoURL ? "transparent" : "rgba(255,255,255,0.2)",
              border: "3px solid rgba(255,255,255,0.5)",
              fontFamily: FONT.display,
            }}
          >
            {user.photoURL
              ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              : initials
            }
          </div>

          {/* Camera button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            title="Change profile picture"
            className="absolute bottom-0 right-0 w-[26px] h-[26px] rounded-full flex items-center justify-center"
            style={{
              background: uploadingPhoto ? "#93c5fd" : C.accent,
              border: "2px solid #ffffff",
              cursor: uploadingPhoto ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              transition: "background 0.15s",
            }}
          >
            {uploadingPhoto
              ? <span className="w-[10px] h-[10px] border-2 border-white border-t-transparent rounded-full inline-block animate-spin" />
              : <Camera size={12} color="#ffffff" />
            }
          </button>
        </div>

        <h1
          className="text-[26px] font-bold text-white mb-[6px]"
          style={{ fontFamily: FONT.display }}
        >
          {user.fullName}
        </h1>
        <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>{user.email}</p>

        {/* Status & role badges */}
        <div className="mt-3 flex gap-2 justify-center flex-wrap">
          <span
            className="text-[11px] font-bold px-[14px] py-1 rounded-[20px] uppercase tracking-[0.08em]"
            style={{
              background: user.status === "active" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)",
              color: user.status === "active" ? "#6ee7b7" : "#fca5a5",
              border: `1px solid ${user.status === "active" ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
            }}
          >
            {user.status || "active"}
          </span>
          <span
            className="text-[11px] font-bold px-[14px] py-1 rounded-[20px] uppercase tracking-[0.08em]"
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            {user.role || "customer"}
          </span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Loyalty points card — overlaps hero */}
      <div className="max-w-[700px] mx-auto px-6 -mt-9 relative z-10">
        <div
          className="rounded-2xl px-[22px] py-[18px] flex items-center justify-between"
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            boxShadow: "0 4px 20px rgba(26,135,225,0.15)",
          }}
        >
          {/* Points */}
          <div className="flex items-center gap-[14px]">
            <div
              className="w-[46px] h-[46px] rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                boxShadow: "0 4px 12px rgba(217,119,6,0.3)",
              }}
            >
              <Star size={22} color="#ffffff" />
            </div>
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.08em]"
                style={{ color: C.textMuted }}
              >
                Loyalty Points
              </p>
              <p className="text-[26px] font-bold leading-[1.2]" style={{ color: "#d97706" }}>
                {user.loyaltyPoints ?? 0}
              </p>
            </div>
          </div>

          {/* Customer ID */}
          <div className="text-right">
            <p className="text-[11px] mb-1" style={{ color: C.textMuted }}>Customer ID</p>
            <button
              onClick={copyCustomerId}
              className="flex items-center gap-[6px] text-[12px] font-bold px-3 py-[5px] rounded-lg cursor-pointer"
              style={{
                color: C.accent,
                background: "rgba(26,135,225,0.08)",
                border: `1px solid ${C.border}`,
                fontFamily: FONT.body,
              }}
            >
              {copied ? <CheckCircle size={12} color="#16a34a" /> : <Copy size={12} />}
              {copied ? "Copied!" : user.customerId}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[700px] mx-auto px-6 pt-6 pb-10 flex flex-col gap-5">

        {/* ── Profile details card ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
          }}
        >
          {/* Card header */}
          <div
            className="px-5 py-[14px] flex justify-between items-center"
            style={{
              background: "rgba(26,135,225,0.04)",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <p
              className="text-[11px] font-bold uppercase tracking-[0.08em] flex items-center gap-[6px]"
              style={{ color: C.textMuted }}
            >
              <User size={12} color={C.accent} />
              Profile Details
            </p>

            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-[6px] text-[12px] font-semibold px-[14px] py-[6px] rounded-lg cursor-pointer"
                style={{
                  color: C.accent,
                  background: "rgba(26,135,225,0.08)",
                  border: `1px solid ${C.border}`,
                  fontFamily: FONT.body,
                }}
              >
                <Edit2 size={12} /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setFullName(user.fullName || "");
                    setPhone(user.phone || "");
                    setAddress(user.address || "");
                  }}
                  className="flex items-center gap-[5px] text-[12px] font-semibold px-3 py-[6px] rounded-lg cursor-pointer"
                  style={{
                    color: C.textMuted,
                    background: "#f1f5f9",
                    border: `1px solid ${C.border}`,
                    fontFamily: FONT.body,
                  }}
                >
                  <X size={12} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-[5px] text-[12px] font-semibold text-white px-[14px] py-[6px] rounded-lg border-none"
                  style={{
                    background: saving ? "#93c5fd" : C.accent,
                    cursor: saving ? "not-allowed" : "pointer",
                    fontFamily: FONT.body,
                    boxShadow: "0 4px 12px rgba(26,135,225,0.25)",
                  }}
                >
                  <Save size={12} /> {saving ? "Saving…" : "Save"}
                </button>
              </div>
            )}
          </div>

          {/* Edit form / read-only rows */}
          <div className="px-5 py-[18px] flex flex-col gap-[14px]">
            {editing ? (
              <>
                <Field label="Full Name" icon={User}>
                  <input style={inputStyle} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
                </Field>
                <Field label="Email" icon={Mail}>
                  <input
                    style={{ ...inputStyle, background: "#f8fafc", color: C.textMuted, cursor: "not-allowed" }}
                    value={user.email}
                    disabled
                  />
                </Field>
                <Field label="Phone" icon={Phone}>
                  <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
                </Field>
                <Field label="Address" icon={MapPin}>
                  <textarea
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                    rows={3}
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Your delivery address"
                  />
                </Field>
              </>
            ) : (
              <div className="flex flex-col gap-[10px]">
                <InfoRow icon={User}   label="Full Name" value={user.fullName} />
                <InfoRow icon={Mail}   label="Email"     value={user.email}    accent />
                <InfoRow icon={Phone}  label="Phone"     value={user.phone} />
                <InfoRow icon={MapPin} label="Address"   value={user.address || "No address set"} />
                <InfoRow icon={Shield} label="Status"    value={user.status || "active"} />
              </div>
            )}
          </div>
        </div>

        {/* ── Quick links card ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            boxShadow: "0 1px 4px rgba(26,135,225,0.07)",
          }}
        >
          <div
            className="px-5 py-[14px]"
            style={{
              background: "rgba(26,135,225,0.04)",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <p
              className="text-[11px] font-bold uppercase tracking-[0.08em] flex items-center gap-[6px]"
              style={{ color: C.textMuted }}
            >
              <Settings size={12} color={C.accent} /> Quick Links
            </p>
          </div>
          <div className="px-4 py-[14px] flex flex-col gap-[10px]">
            <QuickLinkCard icon={ShoppingBag} label="My Orders"        sub="View order history and track deliveries" color={C.accent}  onClick={() => navigate("/customer/orders")} />
            <QuickLinkCard icon={FileText}    label="My Prescriptions" sub="Upload and manage prescriptions"         color="#8b5cf6"   onClick={() => navigate("/customer/prescription")} />
            <QuickLinkCard icon={RotateCcw}   label="Returns"          sub="Request returns and track refunds"       color="#f59e0b"   onClick={() => navigate("/customer/returns")} />
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-[13px] rounded-xl text-[14px] font-bold cursor-pointer"
          style={{
            background: "#fef2f2",
            color: "#dc2626",
            border: "1.5px solid #fecaca",
            fontFamily: FONT.body,
          }}
        >
          <LogOut size={16} /> Log Out
        </button>

      </div>
    </div>
  );
}