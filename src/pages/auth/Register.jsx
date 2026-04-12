// src/pages/auth/Register.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim())
      newErrors.fullName = 'Full name is required';
    if (!formData.email.trim())
      newErrors.email = 'Email is required';
    else if (!validateEmail(formData.email))
      newErrors.email = 'Please enter a valid email address';
    if (!formData.password)
      newErrors.password = 'Password is required';
    else if (formData.password.length < 8)
      newErrors.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(formData.password))
      newErrors.password = 'Password must contain at least one uppercase letter';
    else if (!/[0-9]/.test(formData.password))
      newErrors.password = 'Password must contain at least one number';
    else if (!/[!@#$%^&*]/.test(formData.password))
      newErrors.password = 'Password must contain at least one special character (!@#$%^&*)';
    if (!formData.confirmPassword)
      newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrors({});
    if (!validateForm()) return;

    setLoading(true);
    try {
      await register(formData);
      setSuccessMessage(`Registration successful! Welcome, ${formData.fullName}!`);
      setTimeout(() => navigate('/customer'), 1500);
    } catch (error) {
      setErrors({ submit: error.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field) =>
    `px-4 py-3 rounded-xl border-2 text-sm text-slate-800 outline-none transition-all w-full
     disabled:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed
     ${errors[field]
       ? 'border-red-400 focus:border-red-400 focus:ring-4 focus:ring-red-100'
       : 'border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-blue-400 px-4 py-8 relative overflow-hidden">
      <div className="absolute top-[-90px] right-[-90px] w-72 h-72 rounded-full bg-white/10 animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-140px] left-[-140px] w-96 h-96 rounded-full bg-white/10 animate-pulse pointer-events-none" />
      <div className="absolute top-1/2 right-[8%] w-52 h-52 rounded-full bg-white/10 animate-pulse pointer-events-none" />

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
          <Link to="/login" className="flex-1 py-3 rounded-xl text-center text-sm font-bold border-2 border-slate-200 bg-slate-50 text-slate-500 hover:bg-blue-50 transition-colors">
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Full Name */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-800">Full Name</label>
            <input type="text" name="fullName" value={formData.fullName}
              onChange={handleInputChange} placeholder="Enter your full name"
              disabled={loading} className={inputCls('fullName')} />
            {errors.fullName && <span className="text-xs text-red-500">{errors.fullName}</span>}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-800">Email Address</label>
            <input type="email" name="email" value={formData.email}
              onChange={handleInputChange} placeholder="your.email@example.com"
              disabled={loading} className={inputCls('email')} />
            {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-800">
              Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input type="tel" name="phone" value={formData.phone}
              onChange={handleInputChange} placeholder="+94 77 123 4567"
              disabled={loading} className={inputCls('phone')} />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-800">Password</label>
            <input type="password" name="password" value={formData.password}
              onChange={handleInputChange} placeholder="••••••••"
              disabled={loading} className={inputCls('password')} />
            {errors.password && <span className="text-xs text-red-500">{errors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-800">Confirm Password</label>
            <input type="password" name="confirmPassword" value={formData.confirmPassword}
              onChange={handleInputChange} placeholder="••••••••"
              disabled={loading} className={inputCls('confirmPassword')} />
            {errors.confirmPassword && <span className="text-xs text-red-500">{errors.confirmPassword}</span>}
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="mt-1 py-4 rounded-2xl bg-gradient-to-r from-blue-900 to-blue-500 text-white text-base font-extrabold shadow-lg shadow-blue-400/40 hover:-translate-y-0.5 hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none">
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Account...
              </span>
            ) : 'Create Account'}
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