import { useState, useEffect } from 'react';
import { getProfile, saveProfile, clearAllData } from '../utils/storage';
import type { BusinessProfile, BusinessType, Tone } from '../types';

const businessTypes: { value: BusinessType; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant / Cafe' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'hotel', label: 'Hotel / Hospitality' },
  { value: 'salon', label: 'Salon / Spa' },
  { value: 'clinic', label: 'Clinic / Healthcare' },
  { value: 'other', label: 'Other' },
];

const toneOptions: { value: Tone; label: string }[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'professional', label: 'Professional' },
  { value: 'apologetic', label: 'Apologetic' },
  { value: 'promotional', label: 'Promotional' },
];

const emptyProfile: BusinessProfile = {
  name: '',
  type: 'other',
  address: '',
  phone: '',
  email: '',
  defaultTone: 'friendly',
};

export const SettingsPage = () => {
  const [form, setForm] = useState<BusinessProfile>(getProfile() ?? emptyProfile);
  const [saved, setSaved] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Owner auth state
  const [isOwner, setIsOwner] = useState(false);
  const [ownerKey, setOwnerKey] = useState('');
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerError, setOwnerError] = useState('');
  const [ownerSuccess, setOwnerSuccess] = useState('');

  // Check owner status on mount
  useEffect(() => {
    fetch('/api/owner/status', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setIsOwner(data.isOwner))
      .catch(() => {});
  }, []);

  const handleChange = (field: keyof BusinessProfile, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClear = () => {
    clearAllData();
    setForm(emptyProfile);
    setShowClearConfirm(false);
    setSaved(false);
  };

  const handleOwnerLogin = async () => {
    if (!ownerKey.trim() || ownerLoading) return;
    setOwnerLoading(true);
    setOwnerError('');
    setOwnerSuccess('');

    try {
      const res = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key: ownerKey.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setIsOwner(true);
        setOwnerSuccess('Owner session activated! You now have unlimited usage.');
        setOwnerKey('');
        setTimeout(() => setOwnerSuccess(''), 5000);
      } else {
        setOwnerError(data.error || 'Login failed');
      }
    } catch {
      setOwnerError('Could not connect to server.');
    } finally {
      setOwnerLoading(false);
    }
  };

  const handleOwnerLogout = async () => {
    await fetch('/api/owner/logout', { method: 'POST', credentials: 'include' });
    setIsOwner(false);
  };

  return (
    <div className="page-settings">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your business profile and app preferences.</p>
      </div>

      {/* Business Profile */}
      <section className="card">
        <h2 className="section-title">Business Profile</h2>
        <p className="muted-text" style={{ marginBottom: 16 }}>
          This info is used to personalize your generated responses and reports.
        </p>

        <div className="settings-form">
          <div className="settings-row">
            <label className="field-label" htmlFor="settings-name">Business Name</label>
            <input
              id="settings-name"
              className="text-input"
              type="text"
              placeholder="e.g. Joe's Coffee Shop"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
            />
          </div>

          <div className="settings-row">
            <label className="field-label" htmlFor="settings-type">Business Type</label>
            <select
              id="settings-type"
              className="text-input"
              value={form.type}
              onChange={e => handleChange('type', e.target.value)}
            >
              {businessTypes.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="settings-row">
            <label className="field-label" htmlFor="settings-address">Address</label>
            <input
              id="settings-address"
              className="text-input"
              type="text"
              placeholder="123 Main St, City, State"
              value={form.address}
              onChange={e => handleChange('address', e.target.value)}
            />
          </div>

          <div className="settings-row-2col">
            <div className="settings-row">
              <label className="field-label" htmlFor="settings-phone">Phone</label>
              <input
                id="settings-phone"
                className="text-input"
                type="tel"
                placeholder="(555) 123-4567"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
              />
            </div>
            <div className="settings-row">
              <label className="field-label" htmlFor="settings-email">Email</label>
              <input
                id="settings-email"
                className="text-input"
                type="email"
                placeholder="info@business.com"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
              />
            </div>
          </div>

          <div className="settings-row">
            <label className="field-label" htmlFor="settings-tone">Default Response Tone</label>
            <select
              id="settings-tone"
              className="text-input"
              value={form.defaultTone}
              onChange={e => handleChange('defaultTone', e.target.value)}
            >
              {toneOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="settings-actions">
            <button type="button" className="primary-button" onClick={handleSave}>
              Save Profile
            </button>
            {saved && <span className="save-toast">Profile saved!</span>}
          </div>
        </div>
      </section>

      {/* Owner Authentication */}
      <section className="card">
        <h2 className="section-title">Owner Access</h2>
        <p className="muted-text" style={{ marginBottom: 16 }}>
          {isOwner
            ? 'You are authenticated as the owner. Unlimited usage is active.'
            : 'Enter your owner key to unlock unlimited usage. This is only for the app owner.'}
        </p>

        {isOwner ? (
          <div className="settings-actions">
            <span className="save-toast" style={{ color: 'var(--green-text)' }}>
              Owner session active
            </span>
            <button type="button" className="secondary-button secondary-button-sm" onClick={handleOwnerLogout}>
              Logout Owner
            </button>
          </div>
        ) : (
          <div className="settings-form">
            <div className="settings-row">
              <label className="field-label" htmlFor="owner-key">Owner Key</label>
              <input
                id="owner-key"
                className="text-input"
                type="password"
                placeholder="Enter your owner key"
                value={ownerKey}
                onChange={e => setOwnerKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleOwnerLogin()}
              />
            </div>
            <div className="settings-actions">
              <button
                type="button"
                className="primary-button"
                onClick={handleOwnerLogin}
                disabled={!ownerKey.trim() || ownerLoading}
              >
                {ownerLoading ? 'Authenticating...' : 'Activate Owner Access'}
              </button>
            </div>
            {ownerError && <p className="error-text">{ownerError}</p>}
            {ownerSuccess && <span className="save-toast">{ownerSuccess}</span>}
          </div>
        )}
      </section>

      {/* Danger Zone */}
      <section className="card danger-zone">
        <h2 className="section-title">Danger Zone</h2>
        <p className="muted-text" style={{ marginBottom: 12 }}>
          Permanently delete all saved sessions, reports, and profile data.
        </p>
        {!showClearConfirm ? (
          <button
            type="button"
            className="danger-button"
            onClick={() => setShowClearConfirm(true)}
          >
            Clear All Data
          </button>
        ) : (
          <div className="danger-confirm">
            <p className="danger-confirm-text">Are you sure? This cannot be undone.</p>
            <div className="danger-confirm-actions">
              <button type="button" className="danger-button" onClick={handleClear}>
                Yes, Delete Everything
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
