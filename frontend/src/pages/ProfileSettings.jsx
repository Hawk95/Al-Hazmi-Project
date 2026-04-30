import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const defaultProfile = {
  fullName: 'Martin Jansen',
  email: 'martin.jansen@alhazmi.com',
  phone: '+1 (555) 118-4234',
  role: 'Administrator',
  department: 'Operations',
};

const generateSerial = () => {
  const stored = localStorage.getItem('erpSerial');
  if (stored) return stored;
  const serial = '#MDE-00001';
  localStorage.setItem('erpSerial', serial);
  return serial;
};

function ProfileSettings() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [avatar, setAvatar] = useState(() => localStorage.getItem('erpAvatar') || '');
  const [profile, setProfile] = useState(() => {
    const stored = localStorage.getItem('erpProfile');
    return stored ? JSON.parse(stored) : defaultProfile;
  });
  const [serial, setSerial] = useState(generateSerial);

  useEffect(() => {
    localStorage.setItem('erpAvatar', avatar);
  }, [avatar]);

  useEffect(() => {
    localStorage.setItem('erpProfile', JSON.stringify(profile));
  }, [profile]);

  const [showToast, setShowToast] = useState(false);

  const openPhotoPicker = () => fileInputRef.current?.click();

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleInput = (key) => (event) => {
    setProfile((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSaveChanges = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2600);
  };

  const initials = profile.fullName
    .split(' ')
    .map((segment) => segment[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="profile-settings-page">
      <div className="profile-header">
        <div>
          <h1>Profile Settings</h1>
          <p>Manage your account details, contact info, and password.</p>
        </div>
        <button className="profile-back" type="button" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>

      <div className="profile-settings-grid">
        <aside className="profile-card-sidebar">
          <div className="profile-avatar-block">
            {avatar ? <img src={avatar} alt="Profile" /> : <span>{initials}</span>}
          </div>
          <div className="profile-card-info">
            <h2>{profile.fullName}</h2>
            <span className="role-badge">Administrator</span>
            <p className="profile-serial">{serial}</p>
          </div>
          <button className="change-photo-btn" type="button" onClick={openPhotoPicker}>
            Change Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </aside>

        <section className="profile-form-panel">
          <div className="profile-form-card">
            <h2>Account Details</h2>
            <div className="profile-form-grid">
              <label className="form-field">
                <span>Full Name</span>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={handleInput('fullName')}
                  className="dark-input"
                />
              </label>
              <label className="form-field">
                <span>Email</span>
                <input
                  type="email"
                  value={profile.email}
                  onChange={handleInput('email')}
                  className="dark-input"
                />
              </label>
              <label className="form-field">
                <span>Phone</span>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={handleInput('phone')}
                  className="dark-input"
                />
              </label>
              <label className="form-field">
                <span>Role</span>
                <input type="text" value={profile.role} readOnly className="dark-input readonly" />
              </label>
              <label className="form-field full-width">
                <span>Department</span>
                <input
                  type="text"
                  value={profile.department}
                  onChange={handleInput('department')}
                  className="dark-input"
                />
              </label>
            </div>
            <div className="profile-form-actions">
              <button className="save-changes-btn" type="button" onClick={handleSaveChanges}>
                Save Changes
              </button>
            </div>
          </div>

          <div className="password-section">
            <div className="section-header">
              <div>
                <h3>Change Password</h3>
                <p>Update your password periodically to keep your account secure.</p>
              </div>
              <button className="save-password-btn" type="button">
                Change Password
              </button>
            </div>
            <div className="password-fields">
              <label className="form-field">
                <span>Current Password</span>
                <input type="password" className="dark-input" />
              </label>
              <label className="form-field">
                <span>New Password</span>
                <input type="password" className="dark-input" />
              </label>
              <label className="form-field full-width">
                <span>Confirm New Password</span>
                <input type="password" className="dark-input" />
              </label>
            </div>
          </div>
        </section>
      </div>
      {showToast && (
        <div className="toast-notification success-toast">
          <span>✅ Profile information saved successfully.</span>
        </div>
      )}
    </div>
  );
}

export default ProfileSettings;
