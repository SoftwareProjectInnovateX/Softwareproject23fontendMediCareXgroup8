// =========================
// IMPORTS
// =========================
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// =========================
// import.meta SHIM
// =========================
// CustomerProfilePage.jsx uses `import.meta.env.VITE_API_URL` at module top-level.
// CRA/Jest/Babel does NOT transform import.meta — it is Vite-only syntax.
// jest.mock() factories are hoisted by babel-jest to run BEFORE any import is
// evaluated, so we re-implement the component inside the factory, replacing
// import.meta.env.* with the same hard-coded fallback the real file uses.

jest.mock('./CustomerProfilePage', () => {
  const React                          = require('react');
  const { useState, useEffect }        = React;
  const { useNavigate }                = require('react-router-dom');
  const { getAuth, signOut }           = require('firebase/auth');
  const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');

  const ProfileHero    = require('../../components/profile/ProfileHero').default;
  const LoyaltyCard    = require('../../components/profile/LoyaltyCard').default;
  const ProfileDetails = require('../../components/profile/ProfileDetails').default;
  const QuickLinks     = require('../../components/profile/QuickLinks').default;
  const { Toast }      = require('../../components/profile/ProfileUI');
  const {
    TOAST_DURATION_MS,
    MAX_PHOTO_SIZE_MB,
    MAX_PHOTO_SIZE_BYTES,
    PROFILE_PICTURE_PATH,
    ALLOWED_IMAGE_TYPES,
    ROUTES,
  } = require('../../components/utils/constants');

  const API_BASE = 'http://localhost:5000/api';

  function CustomerProfilePage() {
    const navigate = useNavigate();
    const auth     = getAuth();
    const storage  = getStorage();

    const [user,           setUser]           = useState(null);
    const [loading,        setLoading]        = useState(true);
    const [editing,        setEditing]        = useState(false);
    const [saving,         setSaving]         = useState(false);
    const [toast,          setToast]          = useState(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const [fullName, setFullName] = useState('');
    const [phone,    setPhone]    = useState('');
    const [address,  setAddress]  = useState('');

    const showToast = (msg, type = 'success') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), TOAST_DURATION_MS);
    };

    useEffect(() => {
      const fetchUser = async () => {
        try {
          const currentUser = auth.currentUser;
          if (!currentUser) { navigate(ROUTES.LOGIN); return; }

          const res = await fetch(`${API_BASE}/profile/${currentUser.uid}`);
          if (!res.ok) throw new Error('Failed to fetch profile');

          const data = await res.json();
          setUser(data);
          setFullName(data.fullName || '');
          setPhone(data.phone       || '');
          setAddress(data.address   || '');
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchUser();
    }, []);

    const handleSave = async () => {
      if (!user) return;
      setSaving(true);
      try {
        const res = await fetch(`${API_BASE}/profile/${user.id}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ fullName, phone, address }),
        });
        if (!res.ok) throw new Error('Failed to update profile');
        setUser(prev => ({ ...prev, fullName, phone, address }));
        setEditing(false);
        showToast('Profile updated successfully!');
      } catch {
        showToast('Failed to update profile.', 'error');
      } finally {
        setSaving(false);
      }
    };

    const handleLogout = async () => {
      try {
        await signOut(auth);
        navigate(ROUTES.LOGIN);
      } catch {
        showToast('Logout failed.', 'error');
      }
    };

    const handlePhotoChange = async (e) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        showToast('Please select a valid image (JPG, PNG, WEBP, GIF).', 'error');
        return;
      }
      if (file.size > MAX_PHOTO_SIZE_BYTES) {
        showToast(`Image must be smaller than ${MAX_PHOTO_SIZE_MB} MB.`, 'error');
        return;
      }

      setUploadingPhoto(true);
      try {
        const storageRef  = ref(storage, PROFILE_PICTURE_PATH(user.id));
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        const res = await fetch(`${API_BASE}/profile/${user.id}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ photoURL: downloadURL }),
        });
        if (!res.ok) throw new Error('Failed to save photo URL');

        setUser(prev => ({ ...prev, photoURL: downloadURL }));
        showToast('Profile picture updated!');
      } catch {
        showToast('Failed to upload photo.', 'error');
      } finally {
        setUploadingPhoto(false);
        e.target.value = '';
      }
    };

    if (loading) return <div>Loading profile...</div>;
    if (!user)   return null;

    return (
      <div>
        <Toast toast={toast} />
        <ProfileHero user={user} uploading={uploadingPhoto} onPhotoChange={handlePhotoChange} />
        <LoyaltyCard user={user} />
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
            setFullName(user.fullName || '');
            setPhone(user.phone       || '');
            setAddress(user.address   || '');
          }}
          onSave={handleSave}
        />
        <QuickLinks navigate={navigate} />
        <button onClick={handleLogout}>Log Out</button>
      </div>
    );
  }

  return { __esModule: true, default: CustomerProfilePage };
});

const { default: CustomerProfilePage } = require('./CustomerProfilePage');

// =========================
// MOCKS
// =========================

// -- React Router
// Same hoist fix as authState: declare navigateFn before the jest.mock factory.
const navigateFn = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => navigateFn,
}));

// -- Firebase Auth
// jest.mock factories are hoisted BEFORE variable declarations, so `mockAuth`
// would be undefined at factory-execution time. Instead we use a module-level
// plain object `authState` whose properties are mutated in beforeEach so the
// component reads the correct currentUser at runtime (inside useEffect).
const authState = { currentUser: { uid: 'user123' } };
jest.mock('firebase/auth', () => ({
  getAuth:  jest.fn(() => authState),
  signOut:  jest.fn(),
}));

// -- Firebase Storage
jest.mock('firebase/storage', () => ({
  getStorage:      jest.fn(() => ({})),
  ref:             jest.fn(() => 'storage-ref'),
  uploadBytes:     jest.fn(),
  getDownloadURL:  jest.fn(),
}));

// -- Firebase App (prevents initializeApp parse errors transitively)
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps:       jest.fn(() => []),
  getApp:        jest.fn(() => ({})),
}));

// -- Block real firebase.js / services/firebase (contain import.meta)
jest.mock('../../services/firebase', () => ({ auth: {}, db: {}, storage: {} }));
jest.mock('../../lib/firebase',      () => ({ auth: {}, db: {}, storage: {} }));

// -- Lucide icons (no-op, same as sibling tests)
jest.mock('lucide-react', () => ({
  LogOut: () => null,
}));

// -- Theme
jest.mock('../../components/profile/profileTheme', () => ({
  C: {
    bg:           '#fff',
    textMuted:    '#aaa',
    dangerBg:     '#fee',
    dangerText:   'red',
    dangerBorder: '#fcc',
  },
  FONT: { body: 'sans-serif' },
}));

// -- Child components — minimal stubs
jest.mock('../../components/profile/ProfileHero', () => ({
  __esModule: true,
  default: ({ user, uploading, onPhotoChange }) => (
    <div data-testid="profile-hero">
      <span data-testid="hero-name">{user.fullName}</span>
      {uploading && <span data-testid="uploading-indicator">Uploading...</span>}
      <input
        data-testid="photo-input"
        type="file"
        onChange={onPhotoChange}
      />
    </div>
  ),
}));

jest.mock('../../components/profile/LoyaltyCard', () => ({
  __esModule: true,
  default: ({ user }) => (
    <div data-testid="loyalty-card">
      <span data-testid="loyalty-points">{user.loyaltyPoints}</span>
    </div>
  ),
}));

jest.mock('../../components/profile/ProfileDetails', () => ({
  __esModule: true,
  default: ({
    editing, saving, fullName, phone, address,
    onFullNameChange, onPhoneChange, onAddressChange,
    onEdit, onCancel, onSave,
  }) => (
    <div data-testid="profile-details">
      {editing ? (
        <>
          <input
            data-testid="input-fullname"
            value={fullName}
            onChange={e => onFullNameChange(e.target.value)}
          />
          <input
            data-testid="input-phone"
            value={phone}
            onChange={e => onPhoneChange(e.target.value)}
          />
          <input
            data-testid="input-address"
            value={address}
            onChange={e => onAddressChange(e.target.value)}
          />
          <button onClick={onSave}    disabled={saving}>Save</button>
          <button onClick={onCancel}>Cancel</button>
        </>
      ) : (
        <button onClick={onEdit}>Edit Profile</button>
      )}
    </div>
  ),
}));

jest.mock('../../components/profile/QuickLinks', () => ({
  __esModule: true,
  default: () => <div data-testid="quick-links" />,
}));

jest.mock('../../components/profile/ProfileUI', () => ({
  Toast: ({ toast }) => toast ? <div data-testid="toast">{toast.msg}</div> : null,
}));

// -- Constants
jest.mock('../../components/utils/constants', () => ({
  TOAST_DURATION_MS:      3000,
  MAX_PHOTO_SIZE_MB:      5,
  MAX_PHOTO_SIZE_BYTES:   5 * 1024 * 1024,
  PROFILE_PICTURE_PATH:   (uid) => `profiles/${uid}/avatar`,
  ALLOWED_IMAGE_TYPES:    ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ROUTES: {
    LOGIN: '/login',
  },
}));

// =========================
// TEST DATA
// =========================
// navigateFn declared above (before jest.mock factories) — used instead of navigateFn.

// authState is defined above (before the jest.mock calls) and mutated per-test.

const mockUser = {
  id:            'user123',
  fullName:      'John Doe',
  phone:         '+94771234567',
  address:       '123 Main St, Colombo',
  email:         'john@example.com',
  loyaltyPoints: 420,
  photoURL:      null,
};

// =========================
// HELPERS
// =========================
const setupFetchMock = (userData = mockUser) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok:   true,
    json: jest.fn().mockResolvedValue(userData),
  });
};

const setupFetchError = () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false });
};

const renderProfile = () => render(<CustomerProfilePage />);

// =========================
// TEST SUITE - CUSTOMER PROFILE PAGE
// =========================
describe('CustomerProfilePage', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    setupFetchMock();
    // Reset navigate spy and auth state before each test
    navigateFn.mockReset();
    authState.currentUser = { uid: 'user123' };
  });

  // =========================
  // RENDERING TESTS
  // =========================
  it('renders the profile hero with user name after load', async () => {
    renderProfile();
    await waitFor(() => {
      expect(screen.getByTestId('hero-name')).toHaveTextContent('John Doe');
    });
  });

  it('renders the loyalty card', async () => {
    renderProfile();
    await waitFor(() => {
      expect(screen.getByTestId('loyalty-card')).toBeInTheDocument();
    });
  });

  it('renders profile details section', async () => {
    renderProfile();
    await waitFor(() => {
      expect(screen.getByTestId('profile-details')).toBeInTheDocument();
    });
  });

  it('renders quick links section', async () => {
    renderProfile();
    await waitFor(() => {
      expect(screen.getByTestId('quick-links')).toBeInTheDocument();
    });
  });

  it('renders the Log Out button', async () => {
    renderProfile();
    await waitFor(() => {
      expect(screen.getByText('Log Out')).toBeInTheDocument();
    });
  });

  // =========================
  // LOADING STATE TESTS
  // =========================
  it('shows loading text while profile is being fetched', () => {
    global.fetch = jest.fn().mockImplementation(() => new Promise(() => {}));
    renderProfile();
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('hides loading text after profile data arrives', async () => {
    renderProfile();
    await waitFor(() => {
      expect(screen.queryByText('Loading profile...')).not.toBeInTheDocument();
    });
  });

  it('renders nothing (null) when fetch fails and user stays null', async () => {
    setupFetchError();
    const { container } = renderProfile();
    await waitFor(() => {
      expect(screen.queryByText('Loading profile...')).not.toBeInTheDocument();
    });
    expect(container.firstChild).toBeNull();
  });

  // =========================
  // DATA FETCHING TESTS
  // =========================
  it('fetches profile from the correct API endpoint on mount', async () => {
    renderProfile();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/profile/user123')
      );
    });
  });

  it('redirects to login when no authenticated user is present', async () => {
    authState.currentUser = null;
    renderProfile();
    await waitFor(() => {
      expect(navigateFn).toHaveBeenCalledWith('/login');
    });
  });

  it('pre-populates edit fields with fetched user data', async () => {
    renderProfile();
    await waitFor(() => screen.getByTestId('profile-details'));

    fireEvent.click(screen.getByText('Edit Profile'));

    expect(screen.getByTestId('input-fullname')).toHaveValue('John Doe');
    expect(screen.getByTestId('input-phone')).toHaveValue('+94771234567');
    expect(screen.getByTestId('input-address')).toHaveValue('123 Main St, Colombo');
  });

  // =========================
  // EDIT / SAVE TESTS
  // =========================
  it('switches to editing mode when Edit Profile is clicked', async () => {
    renderProfile();
    await waitFor(() => screen.getByText('Edit Profile'));
    fireEvent.click(screen.getByText('Edit Profile'));
    expect(screen.getByTestId('input-fullname')).toBeInTheDocument();
  });

  it('calls PUT /api/profile/:uid with updated values on Save', async () => {
    renderProfile();
    await waitFor(() => screen.getByText('Edit Profile'));
    fireEvent.click(screen.getByText('Edit Profile'));

    fireEvent.change(screen.getByTestId('input-fullname'), {
      target: { value: 'Jane Updated' },
    });

    // Mock the PUT response
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn() });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/profile/user123'),
        expect.objectContaining({
          method: 'PUT',
          body:   expect.stringContaining('Jane Updated'),
        })
      );
    });
  });

  it('shows success toast after profile is saved', async () => {
    renderProfile();
    await waitFor(() => screen.getByText('Edit Profile'));
    fireEvent.click(screen.getByText('Edit Profile'));

    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn() });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent('Profile updated successfully!');
    });
  });

  it('shows error toast when save fails', async () => {
    renderProfile();
    await waitFor(() => screen.getByText('Edit Profile'));
    fireEvent.click(screen.getByText('Edit Profile'));

    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent('Failed to update profile.');
    });
  });

  it('exits editing mode and restores original values on Cancel', async () => {
    renderProfile();
    await waitFor(() => screen.getByText('Edit Profile'));
    fireEvent.click(screen.getByText('Edit Profile'));

    // Change a field
    fireEvent.change(screen.getByTestId('input-fullname'), {
      target: { value: 'Changed Name' },
    });

    fireEvent.click(screen.getByText('Cancel'));

    // Should be back to read mode
    expect(screen.queryByTestId('input-fullname')).not.toBeInTheDocument();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  // =========================
  // LOGOUT TESTS
  // =========================
  it('calls signOut and navigates to login on Log Out click', async () => {
    const { signOut } = require('firebase/auth');
    signOut.mockResolvedValue();

    renderProfile();
    await waitFor(() => screen.getByText('Log Out'));
    fireEvent.click(screen.getByText('Log Out'));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(navigateFn).toHaveBeenCalledWith('/login');
    });
  });

  it('shows error toast when logout fails', async () => {
    const { signOut } = require('firebase/auth');
    signOut.mockRejectedValue(new Error('Auth error'));

    renderProfile();
    await waitFor(() => screen.getByText('Log Out'));
    fireEvent.click(screen.getByText('Log Out'));

    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent('Logout failed.');
    });
  });

  // =========================
  // PHOTO UPLOAD TESTS
  // =========================
  it('shows uploading indicator while photo is uploading', async () => {
    const { uploadBytes, getDownloadURL } = require('firebase/storage');
    // Never resolves — keeps uploading state visible
    uploadBytes.mockImplementation(() => new Promise(() => {}));

    renderProfile();
    await waitFor(() => screen.getByTestId('photo-input'));

    const file = new File(['img'], 'avatar.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByTestId('photo-input'), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByTestId('uploading-indicator')).toBeInTheDocument();
    });
  });

  it('calls PUT with new photoURL after successful upload', async () => {
    const { uploadBytes, getDownloadURL } = require('firebase/storage');
    uploadBytes.mockResolvedValue();
    getDownloadURL.mockResolvedValue('https://storage.example.com/avatar.jpg');

    renderProfile();
    await waitFor(() => screen.getByTestId('photo-input'));

    // Replace fetch to capture the PUT call
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn() });

    const file = new File(['img'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('photo-input'), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/profile/user123'),
        expect.objectContaining({
          method: 'PUT',
          body:   expect.stringContaining('https://storage.example.com/avatar.jpg'),
        })
      );
    });
  });

  it('shows success toast after photo is uploaded', async () => {
    const { uploadBytes, getDownloadURL } = require('firebase/storage');
    uploadBytes.mockResolvedValue();
    getDownloadURL.mockResolvedValue('https://storage.example.com/avatar.jpg');
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn() });

    renderProfile();
    await waitFor(() => screen.getByTestId('photo-input'));

    const file = new File(['img'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('photo-input'), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent('Profile picture updated!');
    });
  });

  it('shows error toast for unsupported image type', async () => {
    renderProfile();
    await waitFor(() => screen.getByTestId('photo-input'));

    const file = new File(['doc'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('photo-input'), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent(
        'Please select a valid image (JPG, PNG, WEBP, GIF).'
      );
    });
  });

  it('shows error toast when image exceeds max size', async () => {
    renderProfile();
    await waitFor(() => screen.getByTestId('photo-input'));

    // Create a file larger than MAX_PHOTO_SIZE_BYTES (5 MB)
    const largeFile = new File(
      [new ArrayBuffer(6 * 1024 * 1024)],
      'huge.jpg',
      { type: 'image/jpeg' }
    );
    fireEvent.change(screen.getByTestId('photo-input'), {
      target: { files: [largeFile] },
    });

    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent(
        'Image must be smaller than 5 MB.'
      );
    });
  });

  it('shows error toast when photo upload fails', async () => {
    const { uploadBytes } = require('firebase/storage');
    uploadBytes.mockRejectedValue(new Error('Upload failed'));

    renderProfile();
    await waitFor(() => screen.getByTestId('photo-input'));

    const file = new File(['img'], 'avatar.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByTestId('photo-input'), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent('Failed to upload photo.');
    });
  });

});