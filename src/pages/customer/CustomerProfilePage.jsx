import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { LogOut } from "lucide-react";

import { C, FONT } from "../../components/profile/profileTheme";
import ProfileHero    from "../../components/profile/ProfileHero";
import LoyaltyCard    from "../../components/profile/LoyaltyCard";
import ProfileDetails from "../../components/profile/ProfileDetails";
import QuickLinks     from "../../components/profile/QuickLinks";
import { Toast }      from "../../components/profile/ProfileUI";

import {
  TOAST_DURATION_MS,
  MAX_PHOTO_SIZE_MB,
  MAX_PHOTO_SIZE_BYTES,
  PROFILE_PICTURE_PATH,
  ALLOWED_IMAGE_TYPES,
  ROUTES,
} from "../../components/utils/constants";

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CustomerProfilePage() {
  const navigate = useNavigate();
  const auth     = getAuth();
  const storage  = getStorage();

  const [user, setUser]                     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [editing, setEditing]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [toast, setToast]                   = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fullName, setFullName]             = useState("");
  const [phone, setPhone]                   = useState("");
  const [address, setAddress]               = useState("");

  // ── showToast ──────────────────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), TOAST_DURATION_MS);
  };

  // ── fetchUser ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) { navigate(ROUTES.LOGIN); return; }
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

  // ── handleSave ─────────────────────────────────────────────────────────────
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

  // ── handleLogout ───────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate(ROUTES.LOGIN);
    } catch (err) {
      showToast("Logout failed.", "error");
    }
  };

  // ── handlePhotoChange ──────────────────────────────────────────────────────
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showToast("Please select a valid image (JPG, PNG, WEBP, GIF).", "error");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      showToast(`Image must be smaller than ${MAX_PHOTO_SIZE_MB} MB.`, "error");
      return;
    }

    setUploadingPhoto(true);
    try {
      const storageRef = ref(storage, PROFILE_PICTURE_PATH(user.id));
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", user.id), {
        photoURL: downloadURL,
        updatedAt: serverTimestamp(),
      });
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

  // ── Loading / empty states ─────────────────────────────────────────────────
  if (loading) return (
    <div
      className="flex justify-center items-center min-h-[60vh] text-[14px]"
      style={{ color: C.textMuted, fontFamily: FONT.body, background: C.bg }}
    >
      Loading profile…
    </div>
  );

  if (!user) return null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: FONT.body }}>

      {/* Toast notification */}
      <Toast toast={toast} />

      {/* Hero banner with avatar */}
      <ProfileHero
        user={user}
        uploading={uploadingPhoto}
        onPhotoChange={handlePhotoChange}
      />

      {/* Loyalty points + Customer ID card */}
      <LoyaltyCard user={user} />

      <div className="max-w-[700px] mx-auto px-6 pt-6 pb-10 flex flex-col gap-5">

        {/* Profile details / edit form */}
        <ProfileDetails
          user={user}
          editing={editing}
          saving={saving}
          fullName={fullName}
          phone={phone}
          address={address}
          onFullNameChange={setFullName}
          onPhoneChange={setPhone}
          onAddressChange={setAddress}
          onEdit={() => setEditing(true)}
          onCancel={() => {
            setEditing(false);
            setFullName(user.fullName || "");
            setPhone(user.phone || "");
            setAddress(user.address || "");
          }}
          onSave={handleSave}
        />

        {/* Quick navigation links */}
        <QuickLinks navigate={navigate} />

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-[13px] rounded-xl text-[14px] font-bold cursor-pointer"
          style={{
            background: C.dangerBg,
            color: C.dangerText,
            border: `1.5px solid ${C.dangerBorder}`,
            fontFamily: FONT.body,
          }}
        >
          <LogOut size={16} /> Log Out
        </button>

      </div>
    </div>
  );
}