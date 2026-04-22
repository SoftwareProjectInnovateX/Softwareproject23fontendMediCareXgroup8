// src/pages/auth/Auth.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Auth = () => {
  const navigate = useNavigate();
  const { register, login } = useAuth();
  
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    phone: '',
    contactPerson: '',
    categories: [],
    licenseNumber: ''
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = [
    { value: 'customer', label: 'Customer' },
    { value: 'pharmacist', label: 'Pharmacist' },
    { value: 'supplier', label: 'Supplier' },
    { value: 'admin', label: 'Admin' }
  ];

  const categoryOptions = [
    'Medicine',
    'Equipment',
    'Surgical Supplies',
    'Baby Items',
    'Skin Care'
  ];

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};

    if (activeTab === 'register') {
      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Full name is required';
      }

      if (formData.role === 'supplier') {
        if (!formData.phone.trim()) {
          newErrors.phone = 'Phone number is required for suppliers';
        }
      }

      if (formData.role === 'pharmacist') {
        if (!formData.licenseNumber.trim()) {
          newErrors.licenseNumber = 'License number is required for pharmacists';
        }
      }
    }

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

    if (activeTab === 'register') {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleCategoryToggle = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrors({});

    if (validateForm()) {
      setLoading(true);
      
      try {
        if (activeTab === 'login') {
          console.log('Attempting login...');
          
          // Login - NO role parameter, backend will determine the role
          const response = await login(formData.email, formData.password);
          
          console.log('Login response:', response);
          
          // Get role from response
          const userRole = response.user.role;
          
          setSuccessMessage('Welcome back!');
          
          console.log('Redirecting to role:', userRole);
          
          setTimeout(() => {
            if (userRole === 'admin') {
              navigate('/admin');
            } else if (userRole === 'supplier') {
              navigate('/supplier');
            } else if (userRole === 'pharmacist') {
              navigate('/pharmacist');
            } else {
              navigate('/customer');
            }
          }, 1500);
        } else {
          console.log('Attempting registration...');
          
          // Register
          const response = await register(formData);
          
          console.log('Registration response:', response);
          
          setSuccessMessage(`Registration successful! Welcome, ${formData.fullName}!`);
          
          // Get role from response
          const userRole = response.user.role;
          
          setTimeout(() => {
            if (userRole === 'admin') {
              navigate('/admin');
            } else if (userRole === 'supplier') {
              navigate('/supplier');
            } else if (userRole === 'pharmacist') {
              navigate('/pharmacist');
            } else {
              navigate('/customer');
            }
          }, 1500);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        setErrors({
          submit: error.message || 'Authentication failed. Please try again.'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setErrors({});
    setSuccessMessage('');
    setFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'customer',
      phone: '',
      contactPerson: '',
      categories: [],
      licenseNumber: ''
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-decorative-bg">
        <div className="auth-pill-1"></div>
        <div className="auth-pill-2"></div>
        <div className="auth-pill-3"></div>
      </div>
      
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-container">
            <h1 className="auth-title">MediCareX</h1>
          </div>
          <p className="auth-subtitle">Pharmacy Supply Chain Management</p>
        </div>

        <div className="auth-tab-container">
          <button
            className={`auth-tab ${activeTab === 'login' ? 'auth-tab-active' : ''}`}
            onClick={() => switchTab('login')}
          >
            Login
          </button>
          <button
            className={`auth-tab ${activeTab === 'register' ? 'auth-tab-active' : ''}`}
            onClick={() => switchTab('register')}
          >
            Register
          </button>
        </div>

        {successMessage && (
          <div className="auth-success">
            <span className="auth-success-icon">✓</span>
            {successMessage}
          </div>
        )}

        {errors.submit && (
          <div className="auth-error">
            <span className="auth-error-icon">⚠</span>
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {activeTab === 'register' && (
            <div className="auth-input-group">
              <label className="auth-label">Full Name / Company Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className={`auth-input ${errors.fullName ? 'auth-input-error' : ''}`}
                placeholder="Enter your full name"
                disabled={loading}
              />
              {errors.fullName && (
                <span className="auth-error-message">{errors.fullName}</span>
              )}
            </div>
          )}

          <div className="auth-input-group">
            <label className="auth-label">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`auth-input ${errors.email ? 'auth-input-error' : ''}`}
              placeholder="your.email@example.com"
              disabled={loading}
            />
            {errors.email && (
              <span className="auth-error-message">{errors.email}</span>
            )}
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`auth-input ${errors.password ? 'auth-input-error' : ''}`}
              placeholder="••••••••"
              disabled={loading}
            />
            {errors.password && (
              <span className="auth-error-message">{errors.password}</span>
            )}
          </div>

          {activeTab === 'register' && (
            <>
              <div className="auth-input-group">
                <label className="auth-label">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`auth-input ${errors.confirmPassword ? 'auth-input-error' : ''}`}
                  placeholder="••••••••"
                  disabled={loading}
                />
                {errors.confirmPassword && (
                  <span className="auth-error-message">{errors.confirmPassword}</span>
                )}
              </div>

              <div className="auth-input-group">
                <label className="auth-label">User Role</label>
                <div className="auth-role-grid">
                  {roles.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => handleInputChange({ target: { name: 'role', value: role.value } })}
                      className={`auth-role-button ${formData.role === role.value ? 'auth-role-button-active' : ''}`}
                      disabled={loading}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'register' && formData.role === 'supplier' && (
            <>
              <div className="auth-input-group">
                <label className="auth-label">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`auth-input ${errors.phone ? 'auth-input-error' : ''}`}
                  placeholder="+94 77 123 4567"
                  disabled={loading}
                />
                {errors.phone && (
                  <span className="auth-error-message">{errors.phone}</span>
                )}
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Contact Person (Optional)</label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  className="auth-input"
                  placeholder="Contact person name"
                  disabled={loading}
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Product Categories (Optional)</label>
                <div className="auth-category-grid">
                  {categoryOptions.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategoryToggle(category)}
                      className={`auth-category-button ${
                        formData.categories.includes(category) ? 'auth-category-button-active' : ''
                      }`}
                      disabled={loading}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'register' && formData.role === 'pharmacist' && (
            <div className="auth-input-group">
              <label className="auth-label">Pharmacist License Number</label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                className={`auth-input ${errors.licenseNumber ? 'auth-input-error' : ''}`}
                placeholder="e.g., PH-12345-2024"
                disabled={loading}
              />
              {errors.licenseNumber && (
                <span className="auth-error-message">{errors.licenseNumber}</span>
              )}
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <span className="auth-loading">
                <span className="auth-spinner"></span>
                {activeTab === 'login' ? 'Signing In...' : 'Creating Account...'}
              </span>
            ) : (
              activeTab === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {activeTab === 'login' && (
          <div className="auth-footer">
            <a href="#" className="auth-link">Forgot password?</a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;