import React, { useState, useEffect } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../../services/firebase";
import {
  MdPerson,
  MdAccountBalance,
  MdLock,
  MdInfo,
  MdCheckCircle,
  MdCancel,
} from "react-icons/md";
import {
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
} from "firebase/auth";

const AVAILABLE_CATEGORIES = [
  "Medicine",
  "Equipments",
  "Baby Items",
  "Skin Care",
];

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [message, setMessage]     = useState({ type: "", text: "" });

  // ✅ Use auth.currentUser.uid — same as the Firestore document ID
  const [supplierDocId, setSupplierDocId] = useState(null);

  // ── Profile: matches Firestore fields exactly ──
  const [profileData, setProfileData] = useState({
    name:            "",
    contactPerson:   "",
    email:           "",
    phone:           "",
    rating:          0,
    status:          "active",
    supplierId:      "",
    businessRegNo:   "",
    businessAddress: "",
    categories:      [],
  });

  // ── Bank: stored FLAT in Firestore ──
  const [bankData, setBankData] = useState({
    bankName:          "",
    accountHolderName: "",
    accountNumber:     "",
    accountType:       "Checking",
    routingNumber:     "",
    swiftCode:         "",
    bankAddress:       "",
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword:     "",
    confirmPassword: "",
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw,     setShowNewPw]     = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // ── Step 1: get logged-in UID on mount ──
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      setSupplierDocId(uid);
    } else {
      showMessage("error", "Not logged in. Please log in again.");
      setLoading(false);
    }
  }, []);

  // ── Step 2: fetch once UID is available ──
  useEffect(() => {
    if (supplierDocId) fetchSupplierData();
  }, [supplierDocId]);

  const fetchSupplierData = async () => {
    try {
      setLoading(true);
      const snap = await getDoc(doc(db, "suppliers", supplierDocId));

      if (snap.exists()) {
        const d = snap.data();

        setProfileData({
          name:            d.name            || "",
          contactPerson:   d.contactPerson   || "",
          email:           d.email           || "",
          phone:           d.phone           || "",
          rating:          d.rating          ?? 0,
          status:          d.status          || "active",
          supplierId:      d.supplierId      || "",
          businessRegNo:   d.businessRegNo   || "",
          businessAddress: d.businessAddress || "",
          categories:      d.categories      || [],
        });

        setBankData({
          bankName:          d.bankName          || "",
          accountHolderName: d.accountHolderName || "",
          accountNumber:     d.accountNumber     || "",
          accountType:       d.accountType       || "Checking",
          routingNumber:     d.routingNumber     || "",
          swiftCode:         d.swiftCode         || "",
          bankAddress:       d.bankAddress       || "",
        });
      } else {
        showMessage("error", "Supplier profile not found.");
      }
    } catch (error) {
      showMessage("error", "Failed to load settings: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Save profile ──
  const saveProfile = async (e) => {
    e.preventDefault();
    if (!supplierDocId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "suppliers", supplierDocId), {
        name:            profileData.name,
        contactPerson:   profileData.contactPerson,
        email:           profileData.email,
        phone:           profileData.phone,
        rating:          profileData.rating,
        status:          profileData.status,
        businessRegNo:   profileData.businessRegNo,
        businessAddress: profileData.businessAddress,
        categories:      profileData.categories,
        updatedAt:       Timestamp.now(),
      });
      showMessage("success", "Profile updated successfully!");
    } catch (error) {
      showMessage("error", "Failed to update profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Save bank details ──
  const saveBankDetails = async (e) => {
    e.preventDefault();
    if (!supplierDocId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "suppliers", supplierDocId), {
        bankName:          bankData.bankName,
        accountHolderName: bankData.accountHolderName,
        accountNumber:     bankData.accountNumber,
        accountType:       bankData.accountType,
        routingNumber:     bankData.routingNumber,
        swiftCode:         bankData.swiftCode,
        bankAddress:       bankData.bankAddress,
        updatedAt:         Timestamp.now(),
      });
      showMessage("success", "Bank details updated successfully!");
    } catch (error) {
      showMessage("error", "Failed to update bank details: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ──
  const changePassword = async (e) => {
    e.preventDefault();
    if (securityData.newPassword !== securityData.confirmPassword) {
      showMessage("error", "New passwords do not match!");
      return;
    }
    if (securityData.newPassword.length < 6) {
      showMessage("error", "Password must be at least 6 characters long!");
      return;
    }
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No logged-in user found. Please log in again.");
      const credential = EmailAuthProvider.credential(user.email, securityData.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, securityData.newPassword);
      showMessage("success", "Password changed successfully!");
      setSecurityData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        showMessage("error", "Current password is incorrect.");
      } else if (error.code === "auth/too-many-requests") {
        showMessage("error", "Too many attempts. Please wait a few minutes and try again.");
      } else if (error.code === "auth/requires-recent-login") {
        showMessage("error", "Session expired. Please log out and log in again before changing your password.");
      } else {
        showMessage("error", "Failed to change password: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const handleCategoryChange = (i, v) => {
    const cats = [...profileData.categories];
    cats[i] = v;
    setProfileData({ ...profileData, categories: cats });
  };
  const addCategory    = () =>
    setProfileData({ ...profileData, categories: [...profileData.categories, ""] });
  const removeCategory = (i) =>
    setProfileData({ ...profileData, categories: profileData.categories.filter((_, idx) => idx !== i) });

  const inputCls =
    "w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 placeholder:text-slate-400";

  // ── Only 3 tabs now (notifications removed) ──
  const tabs = [
    { id: "profile",  label: "Profile Details", icon: <MdPerson size={18} /> },
    { id: "bank",     label: "Bank Details",    icon: <MdAccountBalance size={18} /> },
    { id: "security", label: "Security",        icon: <MdLock size={18} /> },
  ];

  if (loading)
    return (
      <div className="p-6 bg-slate-100 min-h-screen">
        <div className="bg-white rounded-xl py-20 flex flex-col items-center justify-center shadow-sm">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-500 text-base">Loading settings...</p>
        </div>
      </div>
    );

  return (
    <div className="p-6 bg-slate-100 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-1">Settings</h1>
        <p className="text-slate-500 text-base">Manage your account settings and preferences</p>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div
          className={`flex items-center gap-3 px-5 py-4 rounded-xl mb-6 font-medium border text-sm
            ${message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
            }`}
          style={{ animation: "slideDown 0.3s ease-out" }}
        >
          {message.type === "success"
            ? <MdCheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
            : <MdCancel size={20} className="text-red-500 flex-shrink-0" />
          }
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white p-2 rounded-xl shadow-sm mb-6 flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg text-[15px] font-medium cursor-pointer border-none whitespace-nowrap transition-all duration-200
              ${activeTab === tab.id
                ? "bg-blue-600 text-white"
                : "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl p-8 shadow-sm" style={{ animation: "fadeIn 0.3s ease-in" }}>

        {/* ===== PROFILE TAB ===== */}
        {activeTab === "profile" && (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Supplier Profile</h2>
            <p className="text-sm text-slate-500 mb-8">Manage your company information and contact details</p>

            <form onSubmit={saveProfile} className="max-w-[900px]">
              <div className="grid grid-cols-2 gap-5 mb-6">

                {/* Supplier ID — read only */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-2">Supplier ID</label>
                  <input type="text" value={profileData.supplierId} disabled
                    className={`${inputCls} bg-slate-100 cursor-not-allowed`} />
                  <small className="text-xs text-slate-400 mt-1">Auto-generated (e.g., S001, S042…)</small>
                </div>

                {/* Company Name */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-2">Company Name *</label>
                  <input type="text" required placeholder="e.g., Jeny Bel"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className={inputCls} />
                </div>

                {/* Contact Person */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-2">Contact Person *</label>
                  <input type="text" required placeholder="e.g., John Silva"
                    value={profileData.contactPerson}
                    onChange={(e) => setProfileData({ ...profileData, contactPerson: e.target.value })}
                    className={inputCls} />
                </div>

                {/* Email */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-2">Email Address *</label>
                  <input type="email" required placeholder="e.g., john@medi.com"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className={inputCls} />
                </div>

                {/* Phone */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-2">Phone Number *</label>
                  <input type="tel" required placeholder="e.g., 0760689429"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className={inputCls} />
                </div>

                {/* Business Reg No */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-2">Business Reg. No.</label>
                  <input type="text" placeholder="e.g., PV/00123/2020"
                    value={profileData.businessRegNo}
                    onChange={(e) => setProfileData({ ...profileData, businessRegNo: e.target.value })}
                    className={inputCls} />
                </div>

                {/* Business Address */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-2">Business Address</label>
                  <input type="text" placeholder="e.g., No.125, Colombo"
                    value={profileData.businessAddress}
                    onChange={(e) => setProfileData({ ...profileData, businessAddress: e.target.value })}
                    className={inputCls} />
                </div>

                {/* Rating */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-2">Rating</label>
                  <input type="number" placeholder="e.g., 4.5" step="0.1" min="0" max="5"
                    value={profileData.rating}
                    onChange={(e) => setProfileData({ ...profileData, rating: parseFloat(e.target.value) || 0 })}
                    className={inputCls} />
                </div>

                {/* Status */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-2">Status *</label>
                  <select required value={profileData.status}
                    onChange={(e) => setProfileData({ ...profileData, status: e.target.value })}
                    className={inputCls}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                {/* Categories — full width */}
                <div className="flex flex-col col-span-2">
                  <label className="text-sm font-medium text-slate-700 mb-2">Categories</label>
                  <div className="flex flex-col gap-2.5">
                    {profileData.categories.map((cat, i) => (
                      <div key={i} className="flex gap-2.5 items-center">
                        <select value={cat}
                          onChange={(e) => handleCategoryChange(i, e.target.value)}
                          className={`${inputCls} flex-1`} required>
                          <option value="">Select a category</option>
                          {AVAILABLE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => removeCategory(i)}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg border-none cursor-pointer transition-colors">
                          Remove
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addCategory}
                      className="self-start px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg border-none cursor-pointer transition-colors">
                      + Add Category
                    </button>
                  </div>
                  <small className="text-xs text-slate-400 mt-1">
                    Available: Medicine, Equipments, Baby Items, Skin Care
                  </small>
                </div>
              </div>

              <FormActions saving={saving} saveLabel="Save Profile" onCancel={fetchSupplierData} />
            </form>
          </div>
        )}

        {/* ===== BANK TAB ===== */}
        {activeTab === "bank" && (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Bank Account Details</h2>
            <p className="text-sm text-slate-500 mb-8">Secure payment information for transactions</p>

            <form onSubmit={saveBankDetails} className="max-w-[900px]">
              <div className="grid grid-cols-2 gap-5 mb-6">
                {[
                  { label: "Bank Name *",           key: "bankName",          ph: "e.g., HNB",           req: true  },
                  { label: "Account Holder Name *", key: "accountHolderName", ph: "e.g., MedSupply Co.", req: true  },
                  { label: "Account Number *",      key: "accountNumber",     ph: "e.g., 1234567890",    req: true  },
                  { label: "Routing Number",        key: "routingNumber",     ph: "e.g., 021000021",     req: false },
                  { label: "SWIFT/BIC Code",        key: "swiftCode",         ph: "e.g., BOFAUS3N",      req: false },
                ].map((f) => (
                  <div key={f.key} className="flex flex-col">
                    <label className="text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                    <input type="text" required={f.req} placeholder={f.ph}
                      value={bankData[f.key] || ""}
                      onChange={(e) => setBankData({ ...bankData, [f.key]: e.target.value })}
                      className={inputCls} />
                  </div>
                ))}

                {/* Account Type */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-2">Account Type *</label>
                  <select required value={bankData.accountType || "Checking"}
                    onChange={(e) => setBankData({ ...bankData, accountType: e.target.value })}
                    className={inputCls}>
                    <option value="Checking">Checking</option>
                    <option value="Savings">Savings</option>
                    <option value="Business">Business</option>
                  </select>
                </div>

                {/* Bank Address — full width */}
                <div className="flex flex-col col-span-2">
                  <label className="text-sm font-medium text-slate-700 mb-2">Bank Address</label>
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

        {/* ===== SECURITY TAB ===== */}
        {activeTab === "security" && (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Security Settings</h2>
            <p className="text-sm text-slate-500 mb-8">Manage your password and account security</p>

            <form onSubmit={changePassword} className="max-w-[900px]">
              <div className="grid grid-cols-2 gap-5 mb-6">

                {/* Current Password */}
                <div className="flex flex-col col-span-2">
                  <label className="text-sm font-medium text-slate-700 mb-2">Current Password *</label>
                  <div className="relative">
                    <input type={showCurrentPw ? "text" : "password"} required
                      placeholder="Enter current password"
                      value={securityData.currentPassword}
                      onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                      className={inputCls + " pr-11"} />
                    <button type="button" tabIndex={-1} onClick={() => setShowCurrentPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors focus:outline-none">
                      {showCurrentPw ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-2">New Password *</label>
                  <div className="relative">
                    <input type={showNewPw ? "text" : "password"} required
                      placeholder="Enter new password"
                      value={securityData.newPassword}
                      onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                      className={inputCls + " pr-11"} />
                    <button type="button" tabIndex={-1} onClick={() => setShowNewPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors focus:outline-none">
                      {showNewPw ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                  {securityData.newPassword.length > 0 && (
                    <div className="mt-1 flex flex-col gap-1">
                      {[
                        { label: "At least 8 characters",                    met: securityData.newPassword.length >= 8 },
                        { label: "At least one uppercase letter",             met: /[A-Z]/.test(securityData.newPassword) },
                        { label: "At least one number",                       met: /[0-9]/.test(securityData.newPassword) },
                        { label: "At least one special character (!@#$%^&*)", met: /[!@#$%^&*]/.test(securityData.newPassword) },
                      ].map((rule) => (
                        <div key={rule.label} className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${rule.met ? "text-emerald-500" : "text-slate-400"}`}>
                            {rule.met ? "✓" : "✗"}
                          </span>
                          <span className={`text-xs ${rule.met ? "text-emerald-600" : "text-slate-400"}`}>
                            {rule.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-2">Confirm New Password *</label>
                  <div className="relative">
                    <input type={showConfirmPw ? "text" : "password"} required
                      placeholder="Confirm new password"
                      value={securityData.confirmPassword}
                      onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                      className={inputCls + " pr-11"} />
                    <button type="button" tabIndex={-1} onClick={() => setShowConfirmPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors focus:outline-none">
                      {showConfirmPw ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <InfoBox text="Password must be at least 6 characters long and include a mix of letters and numbers." />

              <div className="flex gap-3 pt-6 border-t border-slate-200">
                <button type="submit" disabled={saving}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-[15px] font-medium rounded-lg border-none cursor-pointer transition-colors">
                  {saving ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn    { from{opacity:0;transform:translateY(10px)}  to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
};

/* ── Shared sub-components ── */
function InfoBox({ text }) {
  return (
    <div className="flex gap-3 items-start bg-blue-50 border border-blue-200 rounded-xl px-4 py-4 mb-6">
      <MdInfo size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
      <p className="m-0 text-sm text-blue-700 leading-relaxed">{text}</p>
    </div>
  );
}

function FormActions({ saving, saveLabel, onCancel }) {
  return (
    <div className="flex gap-3 pt-6 border-t border-slate-200">
      <button type="submit" disabled={saving}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-[15px] font-medium rounded-lg border-none cursor-pointer transition-colors">
        {saving ? "Saving..." : saveLabel}
      </button>
      <button type="button" onClick={onCancel}
        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[15px] font-medium rounded-lg border-none cursor-pointer transition-colors">
        Cancel
      </button>
    </div>
  );
}

export default Settings;