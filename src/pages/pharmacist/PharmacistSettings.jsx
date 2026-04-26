import React, { useState, useRef, useContext, useEffect } from 'react';
import { 
  Camera, 
  User, 
  ShieldCheck, 
  Target, 
  CheckCircle2,
  Trash2,
  Plus,
  Lock,
  Save,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertContext } from '../../layouts/PharmacistLayout';
import { getPharmacistProfile, updatePharmacistProfile, resetSystemData } from '../../services/pharmacistService';
import { auth, db } from '../../services/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { updatePassword as firebaseUpdatePassword } from 'firebase/auth';

const PharmacistSettings = () => {
  const navigate = useNavigate();
  const { userProfile, setUserProfile } = useContext(AlertContext);
  const { currentUser } = useAuth();

  const fileInputRef = useRef(null);
  const [profileImage, setProfileImage] = useState(userProfile?.avatarUrl || null);
  const [showPassword, setShowPassword] = useState(false);

  // Profile State
  const [profile, setProfile] = useState({
    name: userProfile?.name || '',
    role: userProfile?.role || 'Pharmacist',
    slmc: 'Loading...',
    email: currentUser?.email || '',
    contact: ''
  });

  // Password State
  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirm: ''
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRealProfile = async () => {
      if (!currentUser) {
         setIsLoading(false);
         return;
      }

      try {
        // Fetch from pharmacists collection
        const phDoc = await getDoc(doc(db, 'pharmacists', currentUser.uid));
        if (phDoc.exists()) {
           const data = phDoc.data();
           setProfile({
              name: data.fullName || data.name || userProfile?.name || '',
              role: data.role || 'Pharmacist',
              slmc: data.licenseNumber || data.slmc || 'N/A',
              email: data.email || currentUser.email,
              contact: data.phone || data.contact || ''
           });
           
           // If we have a password saved in Firestore (dev/simulation purposes)
           if (data.password) {
              setPasswords(prev => ({ ...prev, current: data.password }));
           }
        }

        // Also fetch simulated/extended profile data if exists
        const data = await getPharmacistProfile(currentUser.uid);
        if (data) {
          if (data.goals) setGoals(data.goals);
          if (data.profileImage) setProfileImage(data.profileImage);
        }
      } catch (error) {
        console.error("Failed to load pharmacist profile settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRealProfile();
  }, [currentUser]);

  const [goals, setGoals] = useState([
    { id: 1, text: 'Maintain 100% dispensing accuracy this week', completed: true },
    { id: 2, text: 'Clear all pending verifications before end of shift', completed: false },
    { id: 3, text: 'Review low stock alerts and submit purchase order', completed: false },
  ]);
  const [newGoal, setNewGoal] = useState('');

  const handleProfileChange = (e) => {
    setProfile({...profile, [e.target.name]: e.target.value});
  };

  const handlePasswordChange = (e) => {
    setPasswords({...passwords, [e.target.name]: e.target.value});
  };

  const toggleGoal = (id) => {
    setGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const deleteGoal = (id) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const addGoal = (e) => {
    if (e.key === 'Enter' && newGoal.trim() !== '') {
      setGoals([...goals, { id: Date.now(), text: newGoal, completed: false }]);
      setNewGoal('');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200;
          const MAX_HEIGHT = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          setProfileImage(compressedBase64);
          
          try {
            // Update Context to sync header automatically
            setUserProfile(prev => {
               const updated = { ...prev, avatarUrl: compressedBase64, name: profile.name, role: profile.role };
               localStorage.setItem('medicarex_pharmacist_profile', JSON.stringify(updated));
               return updated;
            });
          } catch (error) {
            console.error("Storage error:", error);
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
    setUserProfile(prev => {
       const updated = { ...prev, avatarUrl: '' };
       localStorage.setItem('medicarex_pharmacist_profile', JSON.stringify(updated));
       return updated;
    });
  };

  const saveSettings = async () => {
    if (!currentUser) return;

    // Handle password updates in Firebase Auth + Firestore
    if (passwords.newPass) {
       if (passwords.newPass !== passwords.confirm) {
           alert("New Password and Confirm Password do not match!");
           return;
       }
       
       try {
          // 1. Update Firebase Auth Password
          const authUser = auth.currentUser;
          if (authUser) {
             await firebaseUpdatePassword(authUser, passwords.newPass);
          }

          // 2. Update Firestore Password (if tracking it)
          await updateDoc(doc(db, 'pharmacists', currentUser.uid), {
             password: passwords.newPass,
             fullName: profile.name,
             phone: profile.contact
          });
          
          alert("Password updated successfully across system!");
          setPasswords({ current: passwords.newPass, newPass: '', confirm: '' });
       } catch (error) {
          console.error("Password change failed:", error);
          alert(`Failed to update password. You may need to logout and login again for security reasons. Error: ${error.message}`);
          return;
       }
    }

    // Save other preferences to our mock/dev service
    try {
      await updatePharmacistProfile(currentUser.uid, {
        profile,
        goals,
        profileImage
      });

      // Update UI Context
      setUserProfile(prev => {
         const updated = { ...prev, name: profile.name, role: profile.role, avatarUrl: profileImage };
         localStorage.setItem('medicarex_pharmacist_profile', JSON.stringify(updated));
         return updated;
      });

      alert("All preferences saved successfully!");
    } catch (e) {
      console.error("Save Error:", e);
      alert(`Failed to save settings. Error: ${e.message}`);
    }
  };

  const handleFactoryReset = async () => {
    const confirmReset = window.confirm(
      "WARNING: This will delete ALL verification queue prescriptions and ALL dispensing history.\n\n" +
      "Revenue charts will be reset to zero.\n" +
      "The system will then auto-repopulate with the default 24 mock pending prescriptions upon next load.\n\n" +
      "Are you absolutely sure you want to proceed?"
    );

    if (confirmReset) {
      setIsLoading(true);
      try {
        await resetSystemData();
        alert("System successfully reset! Redirecting to dashboard...");
        navigate('/pharmacist');
        window.location.reload();
      } catch (e) {
        alert("Failed to reset system. Check console for details.");
        setIsLoading(false);
      }
    }
  };

  if (isLoading) return (
    <div className="min-h-[400px] flex items-center justify-center">
       <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">Synchronizing Security Credentials...</p>
       </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      
      {/* Page Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-2 mb-6 border-b border-slate-100 pb-6">
        <div>
           <h1 className="text-3xl font-black text-slate-800">Account Settings</h1>
           <p className="text-slate-500 font-medium text-sm mt-1">Manage your pharmacist profile, professional goals, and security.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
           
           {/* Profile Identity Card */}
           <div className="card text-center relative border-slate-200 shadow-sm pt-8">
              <div className="relative inline-block mb-4">
                 <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-white shadow-md overflow-hidden mx-auto flex items-center justify-center">
                    {/* Generates image without "Dr." */}
                    <img src={profileImage || `https://ui-avatars.com/api/?name=${profile.name.replace(' ', '+')}&background=e0e7ff&color=0b5ed7&size=100`} alt="Pharmacist Avatar" className="w-full h-full object-cover" />
                 </div>
                 {profileImage && (
                    <button 
                       onClick={handleRemoveImage}
                       className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full border-2 border-white transition-colors cursor-pointer shadow-sm z-10"
                       title="Remove Image"
                    >
                       <Trash2 className="w-3.5 h-3.5" />
                    </button>
                 )}
                 <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                 />
                 <button 
                    onClick={() => fileInputRef.current.click()}
                    className="absolute bottom-0 right-0 bg-[#0b5ed7] hover:bg-[#084298] text-white p-1.5 rounded-full border-2 border-white transition-colors cursor-pointer shadow-sm"
                 >
                    <Camera className="w-3.5 h-3.5" />
                 </button>
              </div>

              <h2 className="text-xl font-black text-slate-800">{profile.name}</h2>
              <p className="text-sm font-medium text-slate-500 mb-4">{profile.role}</p>
              
              <div className="bg-slate-100 text-slate-600 font-mono text-[10px] uppercase font-black tracking-widest py-1.5 px-3 rounded inline-block mb-6 border border-slate-200">
                 Reg No: {profile.slmc}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 px-2">
                 <span className="text-sm font-bold text-slate-700">Duty Status</span>
                 
                 {/* Toggle Switch */}
                 <label className="relative inline-flex items-center cursor-pointer">
                   <input 
                     type="checkbox" 
                     className="sr-only peer" 
                     checked={userProfile?.isActive !== false} 
                     onChange={(e) => {
                       setUserProfile(prev => {
                         const updated = { ...prev, isActive: e.target.checked };
                         localStorage.setItem('medicarex_pharmacist_profile', JSON.stringify(updated));
                         return updated;
                       });
                     }} 
                   />
                   <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                   <span className={`ml-3 text-xs font-black uppercase tracking-wider ${userProfile?.isActive !== false ? 'text-emerald-600' : 'text-slate-500'}`}>
                     {userProfile?.isActive !== false ? 'Active' : 'Offline'}
                   </span>
                 </label>
              </div>
           </div>

        </div>

        {/* Right Column: Settings Content Areas */}
        <div className="lg:col-span-3 space-y-6">
           
           {/* Section 1: Personal Profile */}
           <div className="card shadow-sm border border-slate-200 p-0 overflow-hidden">
               <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#0b5ed7]" />
                  <h2 className="text-lg font-black text-slate-800">Personal Information</h2>
               </div>
               
               <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                     <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                     <input 
                        type="text" 
                        name="name"
                        value={profile.name}
                        onChange={handleProfileChange}
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 font-bold outline-none focus:border-[#0b5ed7] focus:ring-1 focus:ring-[#0b5ed7] transition-all"
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Position / Role</label>
                     <input 
                        type="text" 
                        name="role"
                        value={profile.role}
                        onChange={handleProfileChange}
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 font-bold outline-none focus:border-[#0b5ed7] focus:ring-1 focus:ring-[#0b5ed7] transition-all"
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Registration No (SLMC)</label>
                     <input 
                        type="text" 
                        name="slmc"
                        value={profile.slmc}
                        onChange={handleProfileChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-600 font-mono font-bold outline-none cursor-not-allowed"
                        readOnly
                     />
                     <p className="text-[10px] text-slate-400 font-bold mt-1">Contact system admin to change license number.</p>
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                     <input 
                        type="email" 
                        name="email"
                        value={profile.email}
                        onChange={handleProfileChange}
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 font-bold outline-none focus:border-[#0b5ed7] focus:ring-1 focus:ring-[#0b5ed7] transition-all"
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Contact Number</label>
                     <input 
                        type="text" 
                        name="contact"
                        value={profile.contact}
                        onChange={handleProfileChange}
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 font-bold outline-none focus:border-[#0b5ed7] focus:ring-1 focus:ring-[#0b5ed7] transition-all"
                     />
                  </div>
               </div>
           </div>

           {/* Section 2: Professional Goals (Actionable) */}
           <div className="card shadow-sm border border-slate-200 p-0 overflow-hidden">
               <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <Target className="w-5 h-5 text-purple-600" />
                     <h2 className="text-lg font-black text-slate-800">Professional Goals Check-in</h2>
                  </div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded">
                     {goals.filter(g => g.completed).length} / {goals.length} Completed
                  </span>
               </div>
               
               <div className="p-6">
                  <div className="space-y-3">
                     {goals.map(goal => (
                        <div key={goal.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${goal.completed ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
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

                  <div className="mt-4 flex items-center gap-3">
                     <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                        <Plus className="w-3 h-3 text-slate-400" />
                     </div>
                     <input 
                        type="text" 
                        value={newGoal}
                        onChange={(e) => setNewGoal(e.target.value)}
                        onKeyDown={addGoal}
                        placeholder="Type a new goal and press Enter..."
                        className="flex-1 bg-transparent border-none text-sm font-bold text-slate-600 outline-none placeholder:text-slate-400"
                     />
                  </div>
               </div>
           </div>

           {/* Section 3: Account Security (Password) */}
           <div className="card shadow-sm border border-slate-200 p-0 overflow-hidden">
               <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-black text-slate-800">Account Security</h2>
               </div>
               
               <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                  <div className="md:col-span-2">
                     <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Current Password</label>
                     <div className="relative md:w-1/2">
                        <input 
                           type={showPassword ? "text" : "password"} 
                           name="current"
                           value={passwords.current}
                           onChange={handlePasswordChange}
                           placeholder="Current Password"
                           className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-bold outline-none font-mono"
                           readOnly
                        />
                        <button 
                           type="button"
                           onClick={() => setShowPassword(!showPassword)}
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                           {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                     </div>
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">New Password</label>
                     <input 
                        type="password" 
                        name="newPass"
                        value={passwords.newPass}
                        onChange={handlePasswordChange}
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Confirm New Password</label>
                     <input 
                        type="password" 
                        name="confirm"
                        value={passwords.confirm}
                        onChange={handlePasswordChange}
                        className={`w-full bg-white border rounded-lg px-4 py-2.5 text-slate-800 font-bold outline-none transition-all font-mono ${
                           passwords.confirm && passwords.newPass !== passwords.confirm 
                           ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                           : passwords.confirm && passwords.newPass === passwords.confirm
                           ? 'border-emerald-500 focus:ring-emerald-500 focus:border-emerald-500'
                           : 'border-slate-300 focus:border-amber-500 focus:ring-amber-500'
                        }`}
                     />
                     {passwords.confirm && passwords.newPass !== passwords.confirm && (
                        <p className="text-[10px] text-red-500 font-bold mt-1 animate-pulse">⚠️ Passwords do not match</p>
                     )}
                     {passwords.confirm && passwords.newPass === passwords.confirm && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ Passwords match</p>
                     )}
                  </div>
               </div>
           </div>

           {/* Section 4: Danger Zone */}
           <div className="card shadow-sm border border-red-200 p-0 overflow-hidden bg-red-50/30">
               <div className="bg-red-50 border-b border-red-100 p-6 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h2 className="text-lg font-black text-red-800">System Danger Zone</h2>
               </div>
               
               <div className="p-6">
                  <h3 className="font-bold text-slate-800">Factory Reset System</h3>
                  <p className="text-sm text-slate-600 mb-4 mt-1">
                     Wipe all operational data (dispensing history, daily revenue, and active prescriptions) from the database to start a fresh simulation. The system will automatically inject 24 new mock pending prescriptions once reset.
                  </p>
                  <button 
                     onClick={handleFactoryReset} 
                     className="bg-red-100 hover:bg-red-600 hover:text-white text-red-600 border border-red-200 font-black text-sm px-6 py-2.5 rounded-xl shadow-sm transition-all"
                  >
                     Reset System Now
                  </button>
               </div>
           </div>

           {/* Bottom Action Bar */}
           <div className="flex justify-end pt-4 pb-10">
              <button onClick={saveSettings} className="bg-[#0b5ed7] hover:bg-[#084298] text-white font-black text-sm px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save All Preferences
              </button>
           </div>

        </div>

      </div>
    </div>
  );
};

export default PharmacistSettings;
