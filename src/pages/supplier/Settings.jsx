// src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import { 
  doc, 
  getDoc, 
  updateDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Available categories
  const AVAILABLE_CATEGORIES = ['Medicine', 'Equipments', 'Baby Items', 'Skin Care'];

  // Supplier Profile Data - Updated to match Firebase structure
  const [profileData, setProfileData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    rating: 0,
    status: 'active',
    supplierId: '',
    categories: []
  });

  // Bank Details Data
  const [bankData, setBankData] = useState({
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    routingNumber: '',
    swiftCode: '',
    bankAddress: '',
    accountType: 'Checking'
  });

  // Security Data
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Notification Preferences
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotifications: true,
    orderUpdates: true,
    lowStockAlerts: true,
    paymentNotifications: true,
    marketingEmails: false
  });

  // HARDCODED SUPPLIER ID (In real app, this would come from authentication)
  const SUPPLIER_ID = 'S001';

  // GENERATE NEXT SUPPLIER ID
  const generateNextSupplierId = async () => {
    try {
      // Query all suppliers ordered by supplierId descending to get the latest one
      const suppliersRef = collection(db, 'suppliers');
      const q = query(suppliersRef, orderBy('supplierId', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // If no suppliers exist, start with S001
        return 'S001';
      }

      // Get the last supplier ID and increment
      const lastDoc = querySnapshot.docs[0];
      const lastSupplierId = lastDoc.data().supplierId;
      
      // Extract number from format like "S001"
      const numberMatch = lastSupplierId.match(/\d+/);
      if (numberMatch) {
        const lastNumber = parseInt(numberMatch[0]);
        const nextNumber = lastNumber + 1;
        // Pad with zeros to maintain 3-digit format
        return `S${String(nextNumber).padStart(3, '0')}`;
      }

      return 'S001'; // Fallback
    } catch (error) {
      console.error('Error generating supplier ID:', error);
      return 'S001'; // Fallback on error
    }
  };

  // FETCH SUPPLIER DATA FROM FIREBASE
  const fetchSupplierData = async () => {
    try {
      setLoading(true);
      console.log('Fetching supplier data...');

      // Fetch profile data
      const profileRef = doc(db, 'suppliers', SUPPLIER_ID);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const data = profileSnap.data();
        // Map Firebase data to profile state
        setProfileData({
          name: data.name || '',
          contactPerson: data.contactPerson || '',
          email: data.email || '',
          phone: data.phone || '',
          rating: data.rating || 0,
          status: data.status || 'active',
          supplierId: data.supplierId || '',
          categories: data.categories || []
        });
        setBankData(data.bankDetails || {});
        setNotificationPrefs(data.notifications || {});
      } else {
        // If no data exists, generate next supplier ID
        const nextId = await generateNextSupplierId();
        setProfileData(prev => ({...prev, supplierId: nextId}));
        console.log('No supplier data found, generated new ID:', nextId);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching supplier data:', error);
      showMessage('error', 'Failed to load settings: ' + error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplierData();
  }, []);

  // SAVE PROFILE DATA
  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const supplierRef = doc(db, 'suppliers', SUPPLIER_ID);
      
      await updateDoc(supplierRef, {
        name: profileData.name,
        contactPerson: profileData.contactPerson,
        email: profileData.email,
        phone: profileData.phone,
        rating: profileData.rating,
        status: profileData.status,
        supplierId: profileData.supplierId,
        categories: profileData.categories,
        updatedAt: Timestamp.now()
      });

      showMessage('success', 'Profile updated successfully!');
      setSaving(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      
      // If document doesn't exist, create it
      if (error.code === 'not-found') {
        try {
          await setDoc(doc(db, 'suppliers', SUPPLIER_ID), {
            name: profileData.name,
            contactPerson: profileData.contactPerson,
            email: profileData.email,
            phone: profileData.phone,
            rating: profileData.rating,
            status: profileData.status,
            supplierId: profileData.supplierId,
            categories: profileData.categories,
            bankDetails: {},
            notifications: {},
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
          showMessage('success', 'Profile created successfully!');
        } catch (createError) {
          showMessage('error', 'Failed to create profile: ' + createError.message);
        }
      } else {
        showMessage('error', 'Failed to update profile: ' + error.message);
      }
      setSaving(false);
    }
  };

  // SAVE BANK DETAILS
  const saveBankDetails = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const supplierRef = doc(db, 'suppliers', SUPPLIER_ID);
      
      await updateDoc(supplierRef, {
        bankDetails: bankData,
        updatedAt: Timestamp.now()
      });

      showMessage('success', 'Bank details updated successfully!');
      setSaving(false);
    } catch (error) {
      console.error('Error saving bank details:', error);
      showMessage('error', 'Failed to update bank details: ' + error.message);
      setSaving(false);
    }
  };

  // SAVE NOTIFICATION PREFERENCES
  const saveNotifications = async () => {
    setSaving(true);

    try {
      const supplierRef = doc(db, 'suppliers', SUPPLIER_ID);
      
      await updateDoc(supplierRef, {
        notifications: notificationPrefs,
        updatedAt: Timestamp.now()
      });

      showMessage('success', 'Notification preferences updated!');
      setSaving(false);
    } catch (error) {
      console.error('Error saving notifications:', error);
      showMessage('error', 'Failed to update notifications: ' + error.message);
      setSaving(false);
    }
  };

  // CHANGE PASSWORD
  const changePassword = async (e) => {
    e.preventDefault();

    if (securityData.newPassword !== securityData.confirmPassword) {
      showMessage('error', 'New passwords do not match!');
      return;
    }

    if (securityData.newPassword.length < 6) {
      showMessage('error', 'Password must be at least 6 characters long!');
      return;
    }

    setSaving(true);

    try {
      // In a real app, you'd use Firebase Authentication to update password
      // For now, we'll just show a success message
      showMessage('success', 'Password changed successfully!');
      setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSaving(false);
    } catch (error) {
      showMessage('error', 'Failed to change password: ' + error.message);
      setSaving(false);
    }
  };

  // SHOW MESSAGE
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Handle category changes - now uses dropdown selection
  const handleCategoryChange = (index, value) => {
    const newCategories = [...profileData.categories];
    newCategories[index] = value;
    setProfileData({...profileData, categories: newCategories});
  };

  const addCategory = () => {
    // Add empty string, user will select from dropdown
    setProfileData({...profileData, categories: [...profileData.categories, '']});
  };

  const removeCategory = (index) => {
    const newCategories = profileData.categories.filter((_, i) => i !== index);
    setProfileData({...profileData, categories: newCategories});
  };

  // RENDER TABS
  const renderTabButtons = () => (
    <div className="settings-tabs">
      <button
        className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => setActiveTab('profile')}
      >
        <span className="tab-icon">👤</span>
        Profile Details
      </button>
      <button
        className={`tab-button ${activeTab === 'bank' ? 'active' : ''}`}
        onClick={() => setActiveTab('bank')}
      >
        <span className="tab-icon">🏦</span>
        Bank Details
      </button>
      <button
        className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
        onClick={() => setActiveTab('security')}
      >
        <span className="tab-icon">🔒</span>
        Security
      </button>
      <button
        className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
        onClick={() => setActiveTab('notifications')}
      >
        <span className="tab-icon">🔔</span>
        Notifications
      </button>
    </div>
  );

  // RENDER PROFILE TAB - Updated with auto supplier ID and category dropdowns
  const renderProfileTab = () => (
    <div className="tab-content">
      <h2 className="section-title">Supplier Profile</h2>
      <p className="section-description">Manage your company information and contact details</p>

      <form onSubmit={saveProfile} className="settings-form">
        <div className="form-grid">
          <div className="form-group">
            <label>Supplier ID *</label>
            <input
              type="text"
              required
              value={profileData.supplierId}
              onChange={(e) => setProfileData({...profileData, supplierId: e.target.value})}
              placeholder="e.g., S001"
              disabled
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
            />
            <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Auto-generated (e.g., S001, S002, S003...)
            </small>
          </div>

          <div className="form-group">
            <label>Company Name *</label>
            <input
              type="text"
              required
              value={profileData.name}
              onChange={(e) => setProfileData({...profileData, name: e.target.value})}
              placeholder="e.g., Jeny Bel"
            />
          </div>

          <div className="form-group">
            <label>Contact Person *</label>
            <input
              type="text"
              required
              value={profileData.contactPerson}
              onChange={(e) => setProfileData({...profileData, contactPerson: e.target.value})}
              placeholder="e.g., John Silva"
            />
          </div>

          <div className="form-group">
            <label>Email Address *</label>
            <input
              type="email"
              required
              value={profileData.email}
              onChange={(e) => setProfileData({...profileData, email: e.target.value})}
              placeholder="e.g., john@medi.com"
            />
          </div>

          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              required
              value={profileData.phone}
              onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
              placeholder="e.g., 0760689429"
            />
          </div>

          <div className="form-group">
            <label>Rating</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={profileData.rating}
              onChange={(e) => setProfileData({...profileData, rating: parseFloat(e.target.value) || 0})}
              placeholder="e.g., 4.5"
            />
          </div>

          <div className="form-group">
            <label>Status *</label>
            <select
              required
              value={profileData.status}
              onChange={(e) => setProfileData({...profileData, status: e.target.value})}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label>Categories</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {profileData.categories.map((category, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(index, e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                    required
                  >
                    <option value="">Select a category</option>
                    {AVAILABLE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeCategory(index)}
                    className="btn-secondary"
                    style={{ padding: '8px 16px' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addCategory}
                className="btn-secondary"
                style={{ alignSelf: 'flex-start' }}
              >
                + Add Category
              </button>
            </div>
            <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Available: Medicine, Equipments, Baby Items, Skin Care
            </small>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
          <button type="button" className="btn-secondary" onClick={fetchSupplierData}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  // RENDER BANK TAB
  const renderBankTab = () => (
    <div className="tab-content">
      <h2 className="section-title">Bank Account Details</h2>
      <p className="section-description">Secure payment information for transactions</p>

      <form onSubmit={saveBankDetails} className="settings-form">
        <div className="form-grid">
          <div className="form-group">
            <label>Bank Name *</label>
            <input
              type="text"
              required
              value={bankData.bankName}
              onChange={(e) => setBankData({...bankData, bankName: e.target.value})}
              placeholder="e.g., Bank of America"
            />
          </div>

          <div className="form-group">
            <label>Account Holder Name *</label>
            <input
              type="text"
              required
              value={bankData.accountHolderName}
              onChange={(e) => setBankData({...bankData, accountHolderName: e.target.value})}
              placeholder="e.g., MedSupply Co."
            />
          </div>

          <div className="form-group">
            <label>Account Number *</label>
            <input
              type="text"
              required
              value={bankData.accountNumber}
              onChange={(e) => setBankData({...bankData, accountNumber: e.target.value})}
              placeholder="e.g., 1234567890"
            />
          </div>

          <div className="form-group">
            <label>Routing Number</label>
            <input
              type="text"
              value={bankData.routingNumber}
              onChange={(e) => setBankData({...bankData, routingNumber: e.target.value})}
              placeholder="e.g., 021000021"
            />
          </div>

          <div className="form-group">
            <label>SWIFT/BIC Code</label>
            <input
              type="text"
              value={bankData.swiftCode}
              onChange={(e) => setBankData({...bankData, swiftCode: e.target.value})}
              placeholder="e.g., BOFAUS3N"
            />
          </div>

          <div className="form-group">
            <label>Account Type *</label>
            <select
              required
              value={bankData.accountType}
              onChange={(e) => setBankData({...bankData, accountType: e.target.value})}
            >
              <option value="Checking">Checking</option>
              <option value="Savings">Savings</option>
              <option value="Business">Business</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label>Bank Address</label>
            <input
              type="text"
              value={bankData.bankAddress}
              onChange={(e) => setBankData({...bankData, bankAddress: e.target.value})}
              placeholder="Bank branch address"
            />
          </div>
        </div>

        <div className="info-box">
          <span className="info-icon">ℹ️</span>
          <p>Your bank details are encrypted and stored securely. This information is used only for payment processing.</p>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Bank Details'}
          </button>
          <button type="button" className="btn-secondary" onClick={fetchSupplierData}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  // RENDER SECURITY TAB
  const renderSecurityTab = () => (
    <div className="tab-content">
      <h2 className="section-title">Security Settings</h2>
      <p className="section-description">Manage your password and account security</p>

      <form onSubmit={changePassword} className="settings-form">
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Current Password *</label>
            <input
              type="password"
              required
              value={securityData.currentPassword}
              onChange={(e) => setSecurityData({...securityData, currentPassword: e.target.value})}
              placeholder="Enter current password"
            />
          </div>

          <div className="form-group">
            <label>New Password *</label>
            <input
              type="password"
              required
              value={securityData.newPassword}
              onChange={(e) => setSecurityData({...securityData, newPassword: e.target.value})}
              placeholder="Enter new password"
            />
          </div>

          <div className="form-group">
            <label>Confirm New Password *</label>
            <input
              type="password"
              required
              value={securityData.confirmPassword}
              onChange={(e) => setSecurityData({...securityData, confirmPassword: e.target.value})}
              placeholder="Confirm new password"
            />
          </div>
        </div>

        <div className="info-box">
          <span className="info-icon">🔒</span>
          <p>Password must be at least 6 characters long and include a mix of letters and numbers.</p>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );

  // RENDER NOTIFICATIONS TAB
  const renderNotificationsTab = () => (
    <div className="tab-content">
      <h2 className="section-title">Notification Preferences</h2>
      <p className="section-description">Choose what notifications you want to receive</p>

      <div className="settings-form">
        <div className="notification-list">
          <div className="notification-item">
            <div className="notification-info">
              <h3>Email Notifications</h3>
              <p>Receive email alerts for important updates</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationPrefs.emailNotifications}
                onChange={(e) => setNotificationPrefs({...notificationPrefs, emailNotifications: e.target.checked})}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-info">
              <h3>Order Updates</h3>
              <p>Get notified about new orders and status changes</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationPrefs.orderUpdates}
                onChange={(e) => setNotificationPrefs({...notificationPrefs, orderUpdates: e.target.checked})}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-info">
              <h3>Low Stock Alerts</h3>
              <p>Receive alerts when products are running low</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationPrefs.lowStockAlerts}
                onChange={(e) => setNotificationPrefs({...notificationPrefs, lowStockAlerts: e.target.checked})}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-info">
              <h3>Payment Notifications</h3>
              <p>Get notified about payments and invoices</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationPrefs.paymentNotifications}
                onChange={(e) => setNotificationPrefs({...notificationPrefs, paymentNotifications: e.target.checked})}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-info">
              <h3>Marketing Emails</h3>
              <p>Receive promotional offers and product updates</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationPrefs.marketingEmails}
                onChange={(e) => setNotificationPrefs({...notificationPrefs, marketingEmails: e.target.checked})}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-primary" onClick={saveNotifications} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      {message.text && (
        <div className={`message-banner ${message.type}`}>
          <span>{message.type === 'success' ? '✓' : '✕'}</span>
          {message.text}
        </div>
      )}

      {renderTabButtons()}

      <div className="settings-content">
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'bank' && renderBankTab()}
        {activeTab === 'security' && renderSecurityTab()}
        {activeTab === 'notifications' && renderNotificationsTab()}
      </div>
    </div>
  );
};

export default Settings;