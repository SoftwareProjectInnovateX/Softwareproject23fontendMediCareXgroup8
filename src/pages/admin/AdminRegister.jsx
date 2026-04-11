// src/pages/admin/AdminRegister.jsx
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  collection,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../../services/firebase";

// ─── helpers ────────────────────────────────────────────────────────────────
const generateNextId = async (collectionName, prefix) => {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    let maxNum = 0;
    snapshot.forEach((d) => {
      const data = d.data();
      const idField = `${collectionName.slice(0, -1)}Id`;
      if (data[idField]) {
        const num = parseInt(data[idField].replace(prefix, ""));
        if (num > maxNum) maxNum = num;
      }
    });
    return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
  } catch {
    return `${prefix}${String(Date.now()).slice(-3)}`;
  }
};

const SUPPLIER_CATEGORIES = [
  "Medicine",
  "Equipment",
  "Surgical Supplies",
  "Baby Items",
  "Skin Care",
];

const inputCls = (err) =>
  `w-full px-4 py-3 rounded-xl border-2 text-sm text-slate-800 outline-none transition-all
   disabled:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed
   ${err
     ? "border-red-400 focus:border-red-400 focus:ring-4 focus:ring-red-100"
     : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
   }`;

// ─── component ───────────────────────────────────────────────────────────────
export default function AdminRegister() {
  const [activeTab, setActiveTab] = useState("supplier"); // 'supplier' | 'pharmacist'

  // ── shared form state ──
  const emptySupplier = {
    fullName: "", email: "", password: "", confirmPassword: "",
    phone: "", contactPerson: "", categories: [],
  };
  const emptyPharmacist = {
    fullName: "", email: "", password: "", confirmPassword: "",
    phone: "", licenseNumber: "", specialization: "",
  };

  const [supplierForm, setSupplierForm]       = useState(emptySupplier);
  const [pharmacistForm, setPharmacistForm]   = useState(emptyPharmacist);
  const [errors, setErrors]                   = useState({});
  const [loading, setLoading]                 = useState(false);
  const [successMessage, setSuccessMessage]   = useState("");
  const [submitError, setSubmitError]         = useState("");

  // ── registered list (local session only) ──
  const [registered, setRegistered] = useState([]);

  // ─── helpers ─────────────────────────────────────────────────────────────
  const form       = activeTab === "supplier" ? supplierForm : pharmacistForm;
  const setForm    = activeTab === "supplier" ? setSupplierForm : setPharmacistForm;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const toggleCategory = (cat) => {
    setSupplierForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const resetForms = () => {
    setSupplierForm(emptySupplier);
    setPharmacistForm(emptyPharmacist);
    setErrors({});
    setSubmitError("");
  };

  // ─── validation ──────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.fullName.trim())       e.fullName = "Full name is required";
    if (!form.email.trim())          e.email    = "Email is required";
    else if (!emailRegex.test(form.email)) e.email = "Enter a valid email";
    if (!form.password)              e.password = "Password is required";
    else if (form.password.length < 6) e.password = "Minimum 6 characters";
    if (!form.confirmPassword)       e.confirmPassword = "Please confirm password";
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    if (!form.phone.trim())          e.phone    = "Phone number is required";

    if (activeTab === "pharmacist") {
      if (!form.licenseNumber.trim())
        e.licenseNumber = "License number is required";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setSubmitError("");
    if (!validate()) return;

    setLoading(true);
    try {
      // 1. Create Firebase Auth account
      const credential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const uid = credential.user.uid;

      if (activeTab === "supplier") {
        const supplierId = await generateNextId("suppliers", "S");
        const data = {
          supplierId,
          userId:        uid,
          name:          form.fullName,
          email:         form.email,
          phone:         form.phone,
          contactPerson: form.contactPerson || form.fullName,
          categories:    form.categories,
          rating:        0,
          status:        "active",
          role:          "supplier",
          createdAt:     Timestamp.now(),
          updatedAt:     Timestamp.now(),
        };
        await setDoc(doc(db, "suppliers", uid), data);
        setRegistered((prev) => [
          { id: supplierId, name: form.fullName, email: form.email, role: "Supplier", uid },
          ...prev,
        ]);
        setSuccessMessage(`Supplier "${form.fullName}" registered successfully! ID: ${supplierId}`);
      } else {
        const pharmacistId = await generateNextId("pharmacists", "P");
        const data = {
          pharmacistId,
          userId:        uid,
          name:          form.fullName,
          email:         form.email,
          phone:         form.phone,
          licenseNumber: form.licenseNumber,
          specialization: form.specialization || "General",
          role:          "pharmacist",
          status:        "active",
          createdAt:     Timestamp.now(),
          updatedAt:     Timestamp.now(),
        };
        await setDoc(doc(db, "pharmacists", uid), data);
        setRegistered((prev) => [
          { id: pharmacistId, name: form.fullName, email: form.email, role: "Pharmacist", uid },
          ...prev,
        ]);
        setSuccessMessage(`Pharmacist "${form.fullName}" registered successfully! ID: ${pharmacistId}`);
      }

      resetForms();
    } catch (err) {
      console.error(err);
      let msg = "Registration failed. Please try again.";
      if (err.code === "auth/email-already-in-use") msg = "This email is already registered.";
      else if (err.code === "auth/invalid-email")   msg = "Invalid email address.";
      else if (err.code === "auth/weak-password")   msg = "Password must be at least 6 characters.";
      setSubmitError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-8 bg-[#f5f9ff] min-h-screen">

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-1">Register New User</h1>
        <p className="text-slate-500 text-[15px]">
          Create accounts for suppliers and pharmacists
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* ── LEFT: Form ── */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm p-8">

            {/* Tab switcher */}
            <div className="flex gap-3 mb-8">
              {[
                { key: "supplier",   label: "Supplier" },
                { key: "pharmacist", label: "Pharmacist" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setActiveTab(key); setErrors({}); setSuccessMessage(""); setSubmitError(""); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all
                    ${activeTab === key
                      ? "bg-gradient-to-r from-blue-900 to-blue-500 text-white shadow-md shadow-blue-300/50"
                      : "bg-slate-50 text-slate-500 border-2 border-slate-200 hover:bg-blue-50"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Success */}
            {successMessage && (
              <div className="flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200 text-emerald-800 rounded-xl px-5 py-4 mb-6 text-sm font-medium">
                <span className="text-lg">✓</span>
                {successMessage}
              </div>
            )}

            {/* Error */}
            {submitError && (
              <div className="flex items-center gap-3 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl px-5 py-4 mb-6 text-sm font-medium">
                <span className="text-lg">⚠</span>
                {submitError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* Row 1 — Full name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-800">
                    Full Name / Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="e.g. ABC Pharmaceuticals"
                    disabled={loading}
                    className={inputCls(errors.fullName)}
                  />
                  {errors.fullName && <span className="text-xs text-red-500">{errors.fullName}</span>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-800">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                    disabled={loading}
                    className={inputCls(errors.email)}
                  />
                  {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
                </div>
              </div>

              {/* Row 2 — Password + Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-800">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    disabled={loading}
                    className={inputCls(errors.password)}
                  />
                  {errors.password && <span className="text-xs text-red-500">{errors.password}</span>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-800">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    disabled={loading}
                    className={inputCls(errors.confirmPassword)}
                  />
                  {errors.confirmPassword && <span className="text-xs text-red-500">{errors.confirmPassword}</span>}
                </div>
              </div>

              {/* Row 3 — Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-800">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+94 77 123 4567"
                    disabled={loading}
                    className={inputCls(errors.phone)}
                  />
                  {errors.phone && <span className="text-xs text-red-500">{errors.phone}</span>}
                </div>

                {/* Supplier — Contact Person */}
                {activeTab === "supplier" && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-800">
                      Contact Person <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      name="contactPerson"
                      value={supplierForm.contactPerson}
                      onChange={handleChange}
                      placeholder="Contact person name"
                      disabled={loading}
                      className={inputCls(false)}
                    />
                  </div>
                )}

                {/* Pharmacist — License Number */}
                {activeTab === "pharmacist" && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-800">
                      License Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="licenseNumber"
                      value={pharmacistForm.licenseNumber}
                      onChange={handleChange}
                      placeholder="e.g. PH-12345-2024"
                      disabled={loading}
                      className={inputCls(errors.licenseNumber)}
                    />
                    {errors.licenseNumber && <span className="text-xs text-red-500">{errors.licenseNumber}</span>}
                  </div>
                )}
              </div>

              {/* Pharmacist — Specialization */}
              {activeTab === "pharmacist" && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-800">
                    Specialization <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="specialization"
                    value={pharmacistForm.specialization}
                    onChange={handleChange}
                    placeholder="e.g. Clinical Pharmacy, General"
                    disabled={loading}
                    className={inputCls(false)}
                  />
                </div>
              )}

              {/* Supplier — Categories */}
              {activeTab === "supplier" && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-800">
                    Product Categories <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SUPPLIER_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        disabled={loading}
                        className={`py-2 px-3 rounded-xl border-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50
                          ${supplierForm.categories.includes(cat)
                            ? "bg-gradient-to-r from-blue-900 to-blue-500 text-white border-blue-500 shadow-sm"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-blue-50"
                          }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 py-4 rounded-2xl bg-gradient-to-r from-blue-900 to-blue-500 text-white text-base font-extrabold shadow-lg shadow-blue-400/40 hover:-translate-y-0.5 hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Registering...
                  </span>
                ) : (
                  `Register ${activeTab === "supplier" ? "Supplier" : "Pharmacist"}`
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── RIGHT: Recently Registered ── */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Recently Registered</h2>
            <p className="text-xs text-slate-400 mb-5">This session only</p>

            {registered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl">
                  👤
                </div>
                <p className="text-sm text-slate-400">No registrations yet</p>
                <p className="text-xs text-slate-300">Registered users will appear here</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {registered.map((r) => (
                  <div
                    key={r.uid}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0
                      ${r.role === "Supplier" ? "bg-blue-500" : "bg-emerald-500"}`}
                    >
                      {r.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{r.name}</p>
                      <p className="text-xs text-slate-400 truncate">{r.email}</p>
                    </div>

                    {/* Badge */}
                    <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold
                      ${r.role === "Supplier"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {r.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-5 mt-4">
            <h3 className="text-sm font-bold text-blue-900 mb-2">📋 How it works</h3>
            <ul className="text-xs text-blue-700 flex flex-col gap-1.5 list-none p-0 m-0">
              <li>• Admin creates the account here</li>
              <li>• Credentials are shared with the user</li>
              <li>• User logs in via the Login page</li>
              <li>• Role is automatically detected</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}