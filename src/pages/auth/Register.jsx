// src/pages/auth/Register.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const roles = [
  { value: 'customer',   label: 'Customer' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'supplier',   label: 'Supplier' },
  { value: 'admin',      label: 'Admin' },
];

const categoryOptions = ['Medicine', 'Equipment', 'Surgical Supplies', 'Baby Items', 'Skin Care'];

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    phone: '',
    contactPerson: '',
    categories: [],
    licenseNumber: '',
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (formData.role === 'supplier' && !formData.phone.trim()) {
      newErrors.phone = 'Phone number is required for suppliers';
    }
    if (formData.role === 'pharmacist' && !formData.licenseNumber.trim()) {
      newErrors.licenseNumber = 'License number is required for pharmacists';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleCategoryToggle = (category) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrors({});
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await register(formData);
      const userRole = response.user.role;
      setSuccessMessage(`Registration successful! Welcome, ${formData.fullName}!`);
      setTimeout(() => {
        if (userRole === 'admin') navigate('/admin');
        else if (userRole === 'supplier') navigate('/supplier');
        else if (userRole === 'pharmacist') navigate('/pharmacist');
        else navigate('/customer');
      }, 1500);
    } catch (error) {
      setErrors({ submit: error.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  /* Shared input class builder */
  const inputCls = (field) =>
    `px-4 py-3 rounded-xl border-2 text-sm text-slate-800 outline-none transition-all w-full
     disabled:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed
     ${errors[field]
       ? 'border-red-400 focus:border-red-400 focus:ring-4 focus:ring-red-100'
       : 'border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-blue-400 px-4 py-8 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-90px] right-[-90px] w-72 h-72 rounded-full bg-white/10 animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-140px] left-[-140px] w-96 h-96 rounded-full bg-white/10 animate-pulse pointer-events-none" />
      <div className="absolute top-1/2 right-[8%] w-52 h-52 rounded-full bg-white/10 animate-pulse pointer-events-none" />

      {/* Card */}
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-md px-10 py-12 animate-[slideUp_0.5s_ease]">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-900 to-blue-500 bg-clip-text text-transparent">
            MediCareX
          </h1>
          <p className="text-slate-500 text-sm mt-2">Pharmacy Supply Chain Management</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-7">
          <Link
            to="/login"
            className="flex-1 py-3 rounded-xl text-center text-sm font-bold border-2 border-slate-200 bg-slate-50 text-slate-500 hover:bg-blue-50 transition-colors"
          >
            Login
          </Link>
          <span className="flex-1 py-3 rounded-xl text-center text-sm font-bold bg-gradient-to-r from-blue-900 to-blue-500 text-white shadow-md shadow-blue-300/50">
            Register
          </span>
        </div>

        {/* Success */}
        {successMessage && (
          <div className="flex items-center gap-3 bg-blue-50 border-2 border-blue-200 text-blue-900 rounded-xl px-5 py-4 mb-6 text-sm font-medium">
            <span className="text-lg font-bold">✓</span>
            {successMessage}
          </div>
        )}

        {/* Error */}
        {errors.submit && (
          <div className="flex items-center gap-3 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl px-5 py-4 mb-6 text-sm font-medium">
            <span className="text-lg font-bold">⚠</span>
            {errors.submit}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Full Name */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-800">Full Name / Company Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              disabled={loading}
              className={inputCls('fullName')}
            />
            {errors.fullName && <span className="text-xs text-red-500">{errors.fullName}</span>}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-800">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your.email@example.com"
              disabled={loading}
              className={inputCls('email')}
            />
            {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-800">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              disabled={loading}
              className={inputCls('password')}
            />
            {errors.password && <span className="text-xs text-red-500">{errors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-800">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="••••••••"
              disabled={loading}
              className={inputCls('confirmPassword')}
            />
            {errors.confirmPassword && <span className="text-xs text-red-500">{errors.confirmPassword}</span>}
          </div>

          {/* Role Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-800">User Role</label>
            <div className="grid grid-cols-2 gap-3">
              {roles.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => handleInputChange({ target: { name: 'role', value: role.value } })}
                  disabled={loading}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all disabled:cursor-not-allowed
                    ${formData.role === role.value
                      ? 'bg-gradient-to-r from-blue-900 to-blue-500 text-white border-blue-500 shadow-md shadow-blue-300/50'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-blue-50 disabled:opacity-60'
                    }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          {/* Supplier-specific fields */}
          {formData.role === 'supplier' && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-800">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+94 77 123 4567"
                  disabled={loading}
                  className={inputCls('phone')}
                />
                {errors.phone && <span className="text-xs text-red-500">{errors.phone}</span>}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-800">Contact Person <span className="font-normal text-slate-400">(Optional)</span></label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  placeholder="Contact person name"
                  disabled={loading}
                  className="px-4 py-3 rounded-xl border-2 border-slate-300 text-sm text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-800">Product Categories <span className="font-normal text-slate-400">(Optional)</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryToggle(cat)}
                      disabled={loading}
                      className={`py-2 px-3 rounded-xl border-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50
                        ${formData.categories.includes(cat)
                          ? 'bg-gradient-to-r from-blue-900 to-blue-500 text-white border-blue-500 shadow-sm shadow-blue-300/40'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-blue-50 hover:border-blue-200'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Pharmacist-specific fields */}
          {formData.role === 'pharmacist' && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-800">Pharmacist License Number</label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                placeholder="e.g., PH-12345-2024"
                disabled={loading}
                className={inputCls('licenseNumber')}
              />
              {errors.licenseNumber && <span className="text-xs text-red-500">{errors.licenseNumber}</span>}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 py-4 rounded-2xl bg-gradient-to-r from-blue-900 to-blue-500 text-white text-base font-extrabold shadow-lg shadow-blue-400/40 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-400/60 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Register;