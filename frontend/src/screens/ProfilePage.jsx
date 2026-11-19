'use client';

import { useEffect, useState } from 'react';
import { Camera, LockKeyhole, Save, UserRound } from 'lucide-react';
import { authApi, assetUrl } from '../services/api.js';

const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxImageBytes = 5 * 1024 * 1024;

export default function ProfilePage({ user, onProfileUpdate }) {
  const [profile, setProfile] = useState(user);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  useEffect(() => {
    let active = true;
    authApi.profile()
      .then(({ profile: result }) => {
        if (!active) return;
        setProfile(result);
        setForm({ name: result.name || '', phone: result.phone || '' });
        onProfileUpdate(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load your profile.');
      });
    return () => { active = false; };
  }, [onProfileUpdate]);

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const { profile: updated } = await authApi.updateProfile(form);
      setProfile(updated);
      setForm({ name: updated.name, phone: updated.phone || '' });
      onProfileUpdate(updated);
      setMessage('Profile details saved.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!acceptedImageTypes.has(file.type) || file.size > maxImageBytes) {
      setError('Choose a JPG, PNG, or WebP image no larger than 5 MB.');
      return;
    }
    setError('');
    setMessage('');
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
    setPhotoProgress(0);
    try {
      const { profile: updated } = await authApi.uploadProfilePhoto(file, setPhotoProgress);
      setProfile(updated);
      onProfileUpdate(updated);
      setPhotoPreview('');
      setMessage('Profile photo updated.');
    } catch (requestError) {
      setPhotoPreview('');
      setError(requestError instanceof Error ? requestError.message : 'Unable to upload your profile photo.');
    } finally {
      setPhotoProgress(null);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password.newPassword !== password.confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword
      });
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password updated.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to change your password.');
    } finally {
      setSaving(false);
    }
  };

  const photo = photoPreview || assetUrl(profile?.profile_photo);
  return <section className="account-page profile-page">
    <header className="account-page-heading">
      <div><p className="eyebrow">ACCOUNT / PROFILE</p><h1>My profile</h1><p className="muted">Manage your personal information and account security.</p></div>
    </header>
    {error && <p className="error" role="alert">{error}</p>}
    {message && <p className="notice" role="status">{message}</p>}
    <div className="profile-layout">
      <aside className="panel profile-summary">
        <div className="profile-photo-wrap">
          {photo
            ? <img src={photo} alt={`${profile?.name || 'Your'} profile`} className="profile-photo" />
            : <span className="profile-photo-placeholder"><UserRound size={32} aria-hidden="true" /></span>}
          <input id="profile-photo-input" className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} disabled={photoProgress !== null} />
          <label className="profile-photo-edit" htmlFor="profile-photo-input" aria-label="Change profile photo"><Camera size={16} aria-hidden="true" /></label>
        </div>
        <h2>{profile?.name || user?.name}</h2>
        <p>{profile?.email || user?.email}</p>
        <span className="account-role">{String(profile?.role || user?.role || '').replaceAll('_', ' ')}</span>
        {photoProgress !== null && <div className="upload-progress" role="status" aria-live="polite">
          <span>Uploading photo {photoProgress}%</span><progress aria-label="Profile photo upload progress" max="100" value={photoProgress}>{photoProgress}%</progress>
        </div>}
        <p className="field-hint">JPG, PNG, or WebP · up to 5 MB</p>
      </aside>

      <div className="profile-content">
        <section className="panel profile-card" id="edit">
          <div className="profile-card-heading"><div><h2>Personal information</h2><p className="muted">Update the details associated with your account.</p></div></div>
          <form onSubmit={saveProfile}>
            <div className="field"><label htmlFor="profile-name">Full name</label><input id="profile-name" className="search" autoComplete="name" minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></div>
            <div className="field"><label htmlFor="profile-email">Email address</label><input id="profile-email" className="search" type="email" autoComplete="email" value={profile?.email || user?.email || ''} readOnly /><small className="field-hint">Contact support to change your sign-in email.</small></div>
            <div className="field"><label htmlFor="profile-phone">Phone number</label><input id="profile-phone" className="search" type="tel" autoComplete="tel" maxLength={32} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></div>
            <button type="submit" className="primary profile-submit" disabled={saving}><Save size={16} aria-hidden="true" />{saving ? 'Saving…' : 'Save changes'}</button>
          </form>
        </section>

        <section className="panel profile-card profile-account-info">
          <h2>Account information</h2>
          <dl>
            <div><dt>Role</dt><dd>{String(profile?.role || user?.role || '').replaceAll('_', ' ')}</dd></div>
            <div><dt>Member since</dt><dd>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</dd></div>
            <div><dt>Account ID</dt><dd className="profile-account-id">{profile?.id || user?.id || '—'}</dd></div>
          </dl>
        </section>

        <section className="panel profile-card" id="password">
          <div className="profile-card-heading"><div><h2>Change password</h2><p className="muted">Use at least 12 characters for your new password.</p></div><LockKeyhole size={19} aria-hidden="true" /></div>
          <form onSubmit={changePassword}>
            <div className="field"><label htmlFor="current-password">Current password</label><input id="current-password" className="search" type="password" autoComplete="current-password" maxLength={72} value={password.currentPassword} onChange={(event) => setPassword((current) => ({ ...current, currentPassword: event.target.value }))} required /></div>
            <div className="field"><label htmlFor="new-password">New password</label><input id="new-password" className="search" type="password" autoComplete="new-password" minLength={12} maxLength={72} value={password.newPassword} onChange={(event) => setPassword((current) => ({ ...current, newPassword: event.target.value }))} required /></div>
            <div className="field"><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" className="search" type="password" autoComplete="new-password" minLength={12} maxLength={72} value={password.confirmPassword} onChange={(event) => setPassword((current) => ({ ...current, confirmPassword: event.target.value }))} required /></div>
            <button type="submit" className="secondary profile-submit" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</button>
          </form>
        </section>
      </div>
    </div>
  </section>;
}
