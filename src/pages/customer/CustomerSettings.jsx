import React, { useState, useRef } from 'react';
import {
  Camera, User, Target, CheckCircle2,
  Trash2, Plus, Lock, Save,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CustomerSettings = () => {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);

  // Holds the cropped/resized profile image as a base64 data URL
  const [profileImage, setProfileImage] = useState(null);

  // Controlled form state for personal information fields
  const [profile, setProfile] = useState({
    name:    '',
    email:   '',
    contact: '',
    address: '',
  });

  // Health goals list — each goal has an id, text, and completion status
  const [goals, setGoals] = useState([
    { id: 1, text: 'Order monthly vitamins before the 1st',     completed: false },
    { id: 2, text: 'Check prescription refill dates this week', completed: false },
    { id: 3, text: 'Review order history for the past month',   completed: true  },
  ]);
  // Controlled input for typing a new goal before pressing Enter
  const [newGoal, setNewGoal] = useState('');

  // Password change fields — newPass and confirm must match before saving
  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirm: '',
  });

  // Generic change handlers for profile and password fields using input name attribute
  const handleProfileChange  = (e) => setProfile({ ...profile,    [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });

  // Toggles a goal's completed state by its id
  const toggleGoal  = (id) => setGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  // Removes a goal from the list by its id
  const deleteGoal  = (id) => setGoals(goals.filter(g => g.id !== id));
  // Adds a new goal on Enter key press if the input is non-empty
  const addGoal     = (e)  => {
    if (e.key === 'Enter' && newGoal.trim()) {
      setGoals([...goals, { id: Date.now(), text: newGoal, completed: false }]);
      setNewGoal('');
    }
  };

  // Reads the selected image file, resizes it to max 200px using canvas, and stores as base64
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 200;
        let w = img.width, h = img.height;
        // Scale down proportionally if either dimension exceeds MAX
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
        else        { if (h > MAX) { w *= MAX / h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        // Store as compressed JPEG base64 string
        setProfileImage(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Clears the profile image and resets the file input
  const handleRemoveImage = () => {
    setProfileImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Validates passwords match before saving — currently alerts on success
  const saveSettings = () => {
    if (passwords.newPass && passwords.newPass !== passwords.confirm) {
      alert('New Password and Confirm Password do not match!');
      return;
    }
    alert('Settings saved successfully!');
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-2 mb-6 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Account Settings</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Manage your profile, personal goals, and security.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Left: Profile avatar card with upload and remove controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card text-center relative border-slate-200 shadow-sm pt-8">
            <div className="relative inline-block mb-4">
              {/* Avatar — falls back to ui-avatars.com initials if no image uploaded */}
              <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-white shadow-md overflow-hidden mx-auto flex items-center justify-center">
                <img
                  src={profileImage || `https://ui-avatars.com/api/?name=${(profile.name || 'Customer').replace(' ', '+')}&background=e0e7ff&color=0b5ed7&size=100`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Remove button — only shown when a custom image is set */}
              {profileImage && (
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full border-2 border-white transition-colors cursor-pointer shadow-sm z-10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Hidden file input — triggered by the camera button below */}
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
              {/* Camera button — opens the hidden file input */}
              <button
                onClick={() => fileInputRef.current.click()}
                className="absolute bottom-0 right-0 bg-[#0b5ed7] hover:bg-[#084298] text-white p-1.5 rounded-full border-2 border-white transition-colors cursor-pointer shadow-sm"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <h2 className="text-xl font-black text-slate-800">{profile.name || 'Your Name'}</h2>
            <p className="text-sm font-medium text-slate-500 mb-4">Customer</p>
          </div>
        </div>

        {/* Right: Settings panels — Personal Info, Goals, Security */}
        <div className="lg:col-span-3 space-y-6">

          {/* Personal Information form */}
          <div className="card shadow-sm border border-slate-200 p-0 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center gap-2">
              <User className="w-5 h-5 text-[#0b5ed7]" />
              <h2 className="text-lg font-black text-slate-800">Personal Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                <input
                  type="text" name="name" value={profile.name} onChange={handleProfileChange}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 font-bold outline-none focus:border-[#0b5ed7] focus:ring-1 focus:ring-[#0b5ed7] transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                <input
                  type="email" name="email" value={profile.email} onChange={handleProfileChange}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 font-bold outline-none focus:border-[#0b5ed7] focus:ring-1 focus:ring-[#0b5ed7] transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Contact Number</label>
                <input
                  type="text" name="contact" value={profile.contact} onChange={handleProfileChange}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 font-bold outline-none focus:border-[#0b5ed7] focus:ring-1 focus:ring-[#0b5ed7] transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Delivery Address</label>
                <input
                  type="text" name="address" value={profile.address} onChange={handleProfileChange}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 font-bold outline-none focus:border-[#0b5ed7] focus:ring-1 focus:ring-[#0b5ed7] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Personal Health Goals — supports add, toggle, and delete */}
          <div className="card shadow-sm border border-slate-200 p-0 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-black text-slate-800">Personal Health Goals</h2>
              </div>
              {/* Progress counter showing completed vs total goals */}
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded">
                {goals.filter(g => g.completed).length} / {goals.length} Completed
              </span>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {goals.map(goal => (
                  <div
                    key={goal.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${goal.completed ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                  >
                    {/* Clicking the row toggles the goal's completion state */}
                    <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleGoal(goal.id)}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${goal.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                        {goal.completed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className={`font-bold transition-all ${goal.completed ? 'text-emerald-700 line-through opacity-70' : 'text-slate-700'}`}>
                        {goal.text}
                      </span>
                    </div>
                    <button onClick={() => deleteGoal(goal.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {/* New goal input — press Enter to add */}
              <div className="mt-4 flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center shrink-0">
                  <Plus className="w-3 h-3 text-slate-400" />
                </div>
                <input
                  type="text" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} onKeyDown={addGoal}
                  placeholder="Type a new goal and press Enter..."
                  className="flex-1 bg-transparent border-none text-sm font-bold text-slate-600 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Account Security — password change fields */}
          <div className="card shadow-sm border border-slate-200 p-0 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-black text-slate-800">Account Security</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">New Password</label>
                <input
                  type="password" name="newPass" value={passwords.newPass} onChange={handlePasswordChange}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Confirm New Password</label>
                <input
                  type="password" name="confirm" value={passwords.confirm} onChange={handlePasswordChange}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Save button — validates passwords then saves all settings */}
          <div className="flex justify-end pt-4 pb-10">
            <button
              onClick={saveSettings}
              className="bg-[#0b5ed7] hover:bg-[#084298] text-white font-black text-sm px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save All Preferences
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CustomerSettings;