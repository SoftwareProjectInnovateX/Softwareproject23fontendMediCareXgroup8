import React, { useState, useEffect } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import { MdPerson, MdAccountBalance, MdLock, MdInfo, MdCheckCircle, MdCancel } from "react-icons/md";
import { reauthenticateWithCredential, updatePassword, EmailAuthProvider } from "firebase/auth";

const AVAILABLE_CATEGORIES = ["Medicine", "Equipments", "Baby Items", "Skin Care"];

/* ─────────────────────────────────────────
   Shared atoms
───────────────────────────────────────── */

const inputCls =
  "w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 bg-white transition focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400";

function Label({ children, required }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
      {children}
      {required && <span className="text-blue-500 ml-0.5">*</span>}
    </label>
  );
}

function InfoBox({ text }) {
  return (
    <div className="flex gap-3 items-start bg-blue-50 border border-blue-100 rounded-xl px-4 py-3.5 mb-6">
      <MdInfo size={18} className="text-blue-500 shrink-0 mt-0.5" />
      <p className="m-0 text-sm text-blue-700 leading-relaxed">{text}</p>
    </div>
  );
}

function FormActions({ saving, saveLabel, onCancel }) {
  return (
    <div className="flex gap-3 pt-5 border-t border-slate-100">
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition"
      >
        {saving ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Saving…
          </>
        ) : saveLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-6 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl transition"
      >
        Discard
      </button>
    </div>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div className="mb-6 pb-5 border-b border-slate-100">
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-500 mt-0.5">{description}</p>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main Settings component
───────────────────────────────────────── */

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [message,   setMessage]   = useState({ type: "", text: "" });
  const [supplierDocId, setSupplierDocId] = useState(null);

  const [profileData, setProfileData] = useState({
    name: "", contactPerson: "", email: "", phone: "",
    rating: 0, status: "active", supplierId: "",
    businessRegNo: "", businessAddress: "", categories: [],
  });

  const [bankData, setBankData] = useState({
    bankName: "", accountHolderName: "", accountNumber: "",
    accountType: "Checking", routingNumber: "", swiftCode: "", bankAddress: "",
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: "", newPassword: "", confirmPassword: "",
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw,     setShowNewPw]     = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) { setSupplierDocId(uid); }
    else { showMessage("error", "Not logged in. Please log in again."); setLoading(false); }
  }, []);

  useEffect(() => { if (supplierDocId) fetchSupplierData(); }, [supplierDocId]);

  const fetchSupplierData = async () => {
    try {
      setLoading(true);
      const snap = await getDoc(doc(db, "suppliers", supplierDocId));
      if (snap.exists()) {
        const d = snap.data();
        setProfileData({
          name: d.name || "", contactPerson: d.contactPerson || "",
          email: d.email || "", phone: d.phone || "",
          rating: d.rating ?? 0, status: d.status || "active",
          supplierId: d.supplierId || "", businessRegNo: d.businessRegNo || "",
          businessAddress: d.businessAddress || "", categories: d.categories || [],
        });
        setBankData({
          bankName: d.bankName || "", accountHolderName: d.accountHolderName || "",
          accountNumber: d.accountNumber || "", accountType: d.accountType || "Checking",
          routingNumber: d.routingNumber || "", swiftCode: d.swiftCode || "",
          bankAddress: d.bankAddress || "",
        });
      } else { showMessage("error", "Supplier profile not found."); }
    } catch (error) { showMessage("error", "Failed to load settings: " + error.message); }
    finally { setLoading(false); }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!supplierDocId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "suppliers", supplierDocId), {
        name: profileData.name, contactPerson: profileData.contactPerson,
        email: profileData.email, phone: profileData.phone,
        rating: profileData.rating, status: profileData.status,
        businessRegNo: profileData.businessRegNo, businessAddress: profileData.businessAddress,
        categories: profileData.categories, updatedAt: Timestamp.now(),
      });
      showMessage("success", "Profile updated successfully!");
    } catch (error) { showMessage("error", "Failed to update profile: " + error.message); }
    finally { setSaving(false); }
  };

  const saveBankDetails = async (e) => {
    e.preventDefault();
    if (!supplierDocId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "suppliers", supplierDocId), {
        ...bankData, updatedAt: Timestamp.now(),
      });
      showMessage("success", "Bank details updated successfully!");
    } catch (error) { showMessage("error", "Failed to update bank details: " + error.message); }
    finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (securityData.newPassword !== securityData.confirmPassword) {
      showMessage("error", "New passwords do not match."); return;
    }
    if (securityData.newPassword.length < 6) {
      showMessage("error", "Password must be at least 6 characters long."); return;
    }
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No logged-in user found.");
      const credential = EmailAuthProvider.credential(user.email, securityData.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, securityData.newPassword);
      showMessage("success", "Password changed successfully!");
      setSecurityData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential")
        showMessage("error", "Current password is incorrect.");
      else if (error.code === "auth/too-many-requests")
        showMessage("error", "Too many attempts. Please wait a few minutes and try again.");
      else if (error.code === "auth/requires-recent-login")
        showMessage("error", "Session expired. Please log out and log in again.");
      else showMessage("error", "Failed to change password: " + error.message);
    } finally { setSaving(false); }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const handleCategoryChange = (i, v) => {
    const cats = [...profileData.categories]; cats[i] = v;
    setProfileData({ ...profileData, categories: cats });
  };
  const addCategory    = () => setProfileData({ ...profileData, categories: [...profileData.categories, ""] });
  const removeCategory = (i) => setProfileData({ ...profileData, categories: profileData.categories.filter((_, idx) => idx !== i) });

  const tabs = [
    { id: "profile",  label: "Profile",  icon: <MdPerson size={16} /> },
    { id: "bank",     label: "Banking",  icon: <MdAccountBalance size={16} /> },
    { id: "security", label: "Security", icon: <MdLock size={16} /> },
  ];

  const pwRules = [
    { label: "At least 8 characters",        met: securityData.newPassword.length >= 8 },
    { label: "At least one uppercase letter", met: /[A-Z]/.test(securityData.newPassword) },
    { label: "At least one number",           met: /[0-9]/.test(securityData.newPassword) },
    { label: "At least one special character (!@#$%^&*)", met: /[!@#$%^&*]/.test(securityData.newPassword) },
  ];

  /* ── Loading state ── */
  if (loading)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <svg className="h-8 w-8 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-sm font-medium">Loading settings…</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">

      {/* Page Header */}
            <div className="mb-8">
        <div className="flex items-start gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Settings
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Manage your account settings and preferences
            </p>
          </div>
        </div>
      </div>

      {/* Toast Banner */}
      {message.text && (
        <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl mb-6 border text-sm font-medium
          ${message.type === "success"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {message.type === "success"
            ? <MdCheckCircle size={18} className="text-emerald-500 shrink-0" />
            : <MdCancel size={18} className="text-red-400 shrink-0" />
          }
          {message.text}
        </div>
      )}

      {/* Layout: Sidebar + Content */}
      <div className="flex gap-6 items-start">

        {/* Sidebar Tabs */}
        <div className="w-48 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex flex-col gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold text-left transition
                ${activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
            >
              <span className="shrink-0">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Panel */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 min-w-0">

          {/* ═══════════ PROFILE TAB ═══════════ */}
          {activeTab === "profile" && (
            <div>
              <SectionHeader
                title="Supplier Profile"
                description="Manage your company information and contact details"
              />
              <form onSubmit={saveProfile}>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-6">

                  {/* Supplier ID */}
                  <div>
                    <Label>Supplier ID</Label>
                    <input type="text" value={profileData.supplierId} disabled
                      className={`${inputCls} bg-slate-50 text-slate-400 cursor-not-allowed`} />
                    <p className="text-xs text-slate-400 mt-1.5">Auto-generated identifier</p>
                  </div>

                  {/* Company Name */}
                  <div>
                    <Label required>Company Name</Label>
                    <input type="text" required placeholder="e.g., Jeny Bel"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className={inputCls} />
                  </div>

                  {/* Contact Person */}
                  <div>
                    <Label required>Contact Person</Label>
                    <input type="text" required placeholder="e.g., John Silva"
                      value={profileData.contactPerson}
                      onChange={(e) => setProfileData({ ...profileData, contactPerson: e.target.value })}
                      className={inputCls} />
                  </div>

                  {/* Email */}
                  <div>
                    <Label required>Email Address</Label>
                    <input type="email" required placeholder="e.g., john@medi.com"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className={inputCls} />
                  </div>

                  {/* Phone */}
                  <div>
                    <Label required>Phone Number</Label>
                    <input type="tel" required placeholder="e.g., 0760689429"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className={inputCls} />
                  </div>

                  {/* Business Reg No */}
                  <div>
                    <Label>Business Reg. No.</Label>
                    <input type="text" placeholder="e.g., PV/00123/2020"
                      value={profileData.businessRegNo}
                      onChange={(e) => setProfileData({ ...profileData, businessRegNo: e.target.value })}
                      className={inputCls} />
                  </div>

                  {/* Business Address */}
                  <div>
                    <Label>Business Address</Label>
                    <input type="text" placeholder="e.g., No.125, Colombo"
                      value={profileData.businessAddress}
                      onChange={(e) => setProfileData({ ...profileData, businessAddress: e.target.value })}
                      className={inputCls} />
                  </div>

                  {/* Rating */}
                  <div>
                    <Label>Rating</Label>
                    <input type="number" placeholder="e.g., 4.5" step="0.1" min="0" max="5"
                      value={profileData.rating}
                      onChange={(e) => setProfileData({ ...profileData, rating: parseFloat(e.target.value) || 0 })}
                      className={inputCls} />
                  </div>

                  {/* Status */}
                  <div>
                    <Label required>Account Status</Label>
                    <select required value={profileData.status}
                      onChange={(e) => setProfileData({ ...profileData, status: e.target.value })}
                      className={inputCls}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  {/* Categories — full width */}
                  <div className="sm:col-span-2">
                    <Label>Supply Categories</Label>
                    <div className="flex flex-col gap-2.5 mt-1">
                      {profileData.categories.map((cat, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <select value={cat}
                            onChange={(e) => handleCategoryChange(i, e.target.value)}
                            className={`${inputCls} flex-1`} required>
                            <option value="">Select a category</option>
                            {AVAILABLE_CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => removeCategory(i)}
                            className="shrink-0 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-500 text-sm font-medium transition">
                            Remove
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={addCategory}
                        className="self-start inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-semibold transition">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Add Category
                      </button>
                    </div>
                  </div>
                </div>

                <FormActions saving={saving} saveLabel="Save Profile" onCancel={fetchSupplierData} />
              </form>
            </div>
          )}

          {/* ═══════════ BANK TAB ═══════════ */}
          {activeTab === "bank" && (
            <div>
              <SectionHeader
                title="Bank Account Details"
                description="Secure payment information used for transactions"
              />
              <form onSubmit={saveBankDetails}>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-6">
                  {[
                    { label: "Bank Name",           key: "bankName",          ph: "e.g., HNB",           req: true  },
                    { label: "Account Holder Name", key: "accountHolderName", ph: "e.g., MedSupply Co.", req: true  },
                    { label: "Account Number",      key: "accountNumber",     ph: "e.g., 1234567890",    req: true  },
                    { label: "Routing Number",      key: "routingNumber",     ph: "e.g., 021000021",     req: false },
                    { label: "SWIFT / BIC Code",    key: "swiftCode",         ph: "e.g., BOFAUS3N",      req: false },
                  ].map((f) => (
                    <div key={f.key}>
                      <Label required={f.req}>{f.label}</Label>
                      <input type="text" required={f.req} placeholder={f.ph}
                        value={bankData[f.key] || ""}
                        onChange={(e) => setBankData({ ...bankData, [f.key]: e.target.value })}
                        className={inputCls} />
                    </div>
                  ))}

                  {/* Account Type */}
                  <div>
                    <Label required>Account Type</Label>
                    <select required value={bankData.accountType || "Checking"}
                      onChange={(e) => setBankData({ ...bankData, accountType: e.target.value })}
                      className={inputCls}>
                      <option value="Checking">Checking</option>
                      <option value="Savings">Savings</option>
                      <option value="Business">Business</option>
                    </select>
                  </div>

                  {/* Bank Address */}
                  <div className="sm:col-span-2">
                    <Label>Bank Branch Address</Label>
                    <input type="text" placeholder="Bank branch address"
                      value={bankData.bankAddress || ""}
                      onChange={(e) => setBankData({ ...bankData, bankAddress: e.target.value })}
                      className={inputCls} />
                  </div>
                </div>

                <InfoBox text="Your bank details are encrypted and stored securely. This information is used only for payment processing." />
                <FormActions saving={saving} saveLabel="Save Bank Details" onCancel={fetchSupplierData} />
              </form>
            </div>
          )}

          {/* ═══════════ SECURITY TAB ═══════════ */}
          {activeTab === "security" && (
            <div>
              <SectionHeader
                title="Security Settings"
                description="Manage your password and account security"
              />
              <form onSubmit={changePassword}>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-6">

                  {/* Current Password — full width */}
                  <div className="sm:col-span-2">
                    <Label required>Current Password</Label>
                    <div className="relative">
                      <input type={showCurrentPw ? "text" : "password"} required
                        placeholder="Enter your current password"
                        value={securityData.currentPassword}
                        onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                        className={`${inputCls} pr-11`} />
                      <button type="button" tabIndex={-1} onClick={() => setShowCurrentPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition focus:outline-none">
                        {showCurrentPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <Label required>New Password</Label>
                    <div className="relative">
                      <input type={showNewPw ? "text" : "password"} required
                        placeholder="Enter new password"
                        value={securityData.newPassword}
                        onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                        className={`${inputCls} pr-11`} />
                      <button type="button" tabIndex={-1} onClick={() => setShowNewPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition focus:outline-none">
                        {showNewPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>

                    {/* Password strength rules */}
                    {securityData.newPassword.length > 0 && (
                      <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Password Requirements</p>
                        {pwRules.map((rule) => (
                          <div key={rule.label} className="flex items-center gap-2">
                            <span className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0
                              ${rule.met ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"}`}
                            >
                              {rule.met
                                ? <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                : <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                              }
                            </span>
                            <span className={`text-xs ${rule.met ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
                              {rule.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <Label required>Confirm New Password</Label>
                    <div className="relative">
                      <input type={showConfirmPw ? "text" : "password"} required
                        placeholder="Confirm new password"
                        value={securityData.confirmPassword}
                        onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                        className={`${inputCls} pr-11`} />
                      <button type="button" tabIndex={-1} onClick={() => setShowConfirmPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition focus:outline-none">
                        {showConfirmPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>

                    {/* Match indicator */}
                    {securityData.confirmPassword.length > 0 && (
                      <div className={`mt-2 flex items-center gap-2 text-xs font-medium
                        ${securityData.newPassword === securityData.confirmPassword ? "text-emerald-600" : "text-red-500"}`}
                      >
                        {securityData.newPassword === securityData.confirmPassword
                          ? <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> Passwords match</>
                          : <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg> Passwords do not match</>
                        }
                      </div>
                    )}
                  </div>
                </div>

                <InfoBox text="Password must be at least 6 characters long and include a mix of letters and numbers for better security." />

                <div className="flex gap-3 pt-5 border-t border-slate-100">
                  <button type="submit" disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition">
                    {saving ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Updating…
                      </>
                    ) : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;