import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI, activationAPI } from '../lib/api';
import { Loader2, Save, Github, User, Link as LinkIcon, Upload, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fieldClass =
  'w-full rounded-md border border-input bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all';

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    username: '',
    headline: '',
    location: '',
    bio: '',
    githubUrl: '',
    linkedinUrl: '',
    portfolioUrl: '',
    avatarUrl: '',
    skills: [],
  });
  const [activationChecklist, setActivationChecklist] = useState({ profile_items: [], owner_items: [], top_items: [] });
  const [initialForm, setInitialForm] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await profileAPI.get();
        const data = response.data;
        const nextForm = {
          displayName: data.display_name || user?.name || '',
          username: data.username || user?.username || '',
          headline: data.headline || '',
          location: data.location || '',
          bio: data.bio || '',
          githubUrl: data.github_url || '',
          linkedinUrl: data.linkedin_url || '',
          portfolioUrl: data.portfolio_url || '',
          avatarUrl: data.avatar_url || user?.picture || '',
          skills: data.skills || [],
        };
        setForm(nextForm);
        setInitialForm(nextForm);
        try {
          const checklistRes = await activationAPI.getChecklist();
          setActivationChecklist(checklistRes.data || { profile_items: [], owner_items: [], top_items: [] });
        } catch (_err) {
          console.debug('Activation checklist unavailable on profile load', _err);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setErrorMessage('Could not load your profile. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id, user?.name, user?.username, user?.picture]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [form.avatarUrl, user?.picture]);

  const isDirty = useMemo(() => {
    if (!initialForm) return false;
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  useEffect(() => {
    const handler = (event) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addSkill = (value) => {
    const normalized = value.trim();
    if (!normalized) return;
    setForm((prev) => {
      if (prev.skills.some((skill) => skill.toLowerCase() === normalized.toLowerCase())) {
        return prev;
      }
      return { ...prev, skills: [...prev.skills, normalized] };
    });
    setSkillInput('');
  };

  const removeSkill = (value) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== value),
    }));
  };

  const handleSkillKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addSkill(skillInput);
    }
    if (event.key === 'Backspace' && !skillInput && form.skills.length) {
      event.preventDefault();
      removeSkill(form.skills[form.skills.length - 1]);
    }
  };

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload an image file (PNG, JPG, WebP, etc).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Image is too large. Please upload a file smaller than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setField('avatarUrl', typeof reader.result === 'string' ? reader.result : '');
      setErrorMessage('');
    };
    reader.onerror = () => setErrorMessage('Could not read this image. Try another one.');
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setField('avatarUrl', '');
    setAvatarLoadFailed(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await profileAPI.update({
        display_name: form.displayName || null,
        username: form.username || null,
        headline: form.headline || null,
        location: form.location || null,
        bio: form.bio || null,
        skills: form.skills,
        github_url: form.githubUrl || null,
        linkedin_url: form.linkedinUrl || null,
        portfolio_url: form.portfolioUrl || null,
        avatar_url: form.avatarUrl || null,
      });
      setInitialForm(form);
      setSuccessMessage('Profile updated successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage(error?.response?.data?.detail || 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const previewAvatar = (!avatarLoadFailed && form.avatarUrl) || (!avatarLoadFailed && user?.picture);
  const avatarSrc = form.avatarUrl || user?.picture || '';
  const completenessFields = useMemo(
    () => [
      form.displayName,
      form.username,
      form.headline,
      form.location,
      form.bio,
      form.githubUrl,
      form.linkedinUrl,
      form.portfolioUrl,
      form.skills.length ? 'has-skills' : '',
      form.avatarUrl || user?.picture ? 'has-avatar' : '',
    ],
    [
      form.displayName,
      form.username,
      form.headline,
      form.location,
      form.bio,
      form.githubUrl,
      form.linkedinUrl,
      form.portfolioUrl,
      form.skills.length,
      form.avatarUrl,
      user?.picture,
    ]
  );
  const profileCompleteness = Math.round(
    (completenessFields.filter(Boolean).length / completenessFields.length) * 100
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="profile-page">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <User className="w-8 h-8 text-primary" />
            Edit Profile
          </h1>
          <p className="text-muted-foreground mt-1">Build your public developer identity</p>
        </div>

        {activationChecklist.profile_items?.length > 0 && (
          <div className="bg-card border border-border rounded-xl shadow-card p-4 mb-6">
            <h3 className="font-semibold text-foreground mb-2">Activation Nudges</h3>
            <ul className="space-y-2 text-sm">
              {activationChecklist.profile_items.slice(0, 2).map((item) => (
                <li key={item.id} className="text-muted-foreground">
                  <span className="text-foreground font-medium">{item.title}:</span> {item.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl shadow-card p-6 mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              {previewAvatar ? (
                <img
                  src={avatarSrc}
                  alt={form.displayName || user?.name || ''}
                  className="w-16 h-16 shrink-0 rounded-full ring-2 ring-border object-cover"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <div className="w-16 h-16 shrink-0 bg-muted rounded-full flex items-center justify-center text-xl font-bold text-foreground">
                  {(form.displayName || user?.name || user?.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-foreground truncate">{form.displayName || user?.name || 'Developer'}</h2>
                <p className="text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <div className="w-full sm:w-56 shrink-0 space-y-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Profile completeness</span>
                <span className="text-foreground font-semibold tabular-nums">{profileCompleteness}%</span>
              </div>
              <div
                className="h-2 rounded-full bg-muted overflow-hidden border border-border"
                role="progressbar"
                aria-valuenow={profileCompleteness}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Profile completeness"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                  style={{ width: `${profileCompleteness}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-primary text-sm">
            {successMessage}
          </div>
        )}

        {isDirty && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            You have unsaved changes. On your phone, use the save bar at the bottom; on larger screens, use Save below.
          </div>
        )}

        <form id="profile-edit-form" onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-card border border-border rounded-xl shadow-card p-6">
            <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-1">Profile</h3>
            <p className="text-lg font-semibold text-foreground mb-4">Basic information</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="avatar-upload-input" className="block text-sm font-medium text-foreground mb-1.5">Avatar</label>
                <div className="flex items-center gap-3">
                  {previewAvatar ? (
                    <img
                      src={avatarSrc}
                      alt={form.displayName || user?.name || ''}
                      className="w-14 h-14 rounded-full ring-2 ring-border object-cover"
                      onError={() => setAvatarLoadFailed(true)}
                    />
                  ) : (
                    <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center text-lg font-bold text-foreground">
                      {(form.displayName || user?.name || user?.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <input id="avatar-upload-input" ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4" />
                    Upload
                  </Button>
                  <Button type="button" variant="outline" onClick={handleRemoveAvatar}>
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">PNG/JPG/WebP up to 2MB.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="display-name-input" className="block text-sm font-medium text-foreground mb-1.5">Display Name</label>
                  <input
                    id="display-name-input"
                    type="text"
                    value={form.displayName}
                    onChange={(e) => setField('displayName', e.target.value)}
                    placeholder="Your public display name"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="username-input" className="block text-sm font-medium text-foreground mb-1.5">Username</label>
                  <input
                    id="username-input"
                    type="text"
                    value={form.username}
                    onChange={(e) => setField('username', e.target.value.toLowerCase())}
                    placeholder="your_handle"
                    className={fieldClass}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Lowercase letters, numbers, underscores only.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="headline-input" className="block text-sm font-medium text-foreground mb-1.5">Headline / Role</label>
                  <input
                    id="headline-input"
                    type="text"
                    value={form.headline}
                    onChange={(e) => setField('headline', e.target.value)}
                    placeholder="e.g. FastAPI and React Builder"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="location-input" className="block text-sm font-medium text-foreground mb-1.5">Location</label>
                  <div className="relative">
                    <MapPin
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <input
                      id="location-input"
                      type="text"
                      value={form.location}
                      onChange={(e) => setField('location', e.target.value)}
                      placeholder="City, Country"
                      className={`${fieldClass} pl-10`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="bio-input" className="block text-sm font-medium text-foreground mb-1.5">Bio</label>
                <textarea
                  id="bio-input"
                  value={form.bio}
                  onChange={(e) => setField('bio', e.target.value)}
                  placeholder="Tell your story as a builder..."
                  className={`${fieldClass} px-4 py-3 resize-none`}
                  rows={4}
                  data-testid="bio-input"
                />
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-xl shadow-card p-6">
            <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notifications</h3>
            <p className="text-lg font-semibold text-foreground mb-2">Manage communication preferences</p>
            <p className="text-sm text-muted-foreground">
              Digest and collaboration email settings are managed in{' '}
              <Link to="/settings" className="text-primary hover:underline">
                Settings
              </Link>
              .
            </p>
          </section>

          <section className="bg-card border border-border rounded-xl shadow-card p-6">
            <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-1">Links</h3>
            <p className="text-lg font-semibold text-foreground mb-4">Social & portfolio</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="github-input" className="block text-sm font-medium text-foreground mb-1.5">
                  <Github className="w-4 h-4 inline mr-1" />
                  GitHub URL
                </label>
                <input
                  id="github-input"
                  type="url"
                  value={form.githubUrl}
                  onChange={(e) => setField('githubUrl', e.target.value)}
                  placeholder="https://github.com/yourusername"
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="linkedin-input" className="block text-sm font-medium text-foreground mb-1.5">
                  <LinkIcon className="w-4 h-4 inline mr-1" />
                  LinkedIn URL
                </label>
                <input
                  id="linkedin-input"
                  type="url"
                  value={form.linkedinUrl}
                  onChange={(e) => setField('linkedinUrl', e.target.value)}
                  placeholder="https://www.linkedin.com/in/yourhandle"
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="portfolio-input" className="block text-sm font-medium text-foreground mb-1.5">
                  <LinkIcon className="w-4 h-4 inline mr-1" />
                  Portfolio URL
                </label>
                <input
                  id="portfolio-input"
                  type="url"
                  value={form.portfolioUrl}
                  onChange={(e) => setField('portfolioUrl', e.target.value)}
                  placeholder="https://yourportfolio.com"
                  className={fieldClass}
                />
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-xl shadow-card p-6">
            <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-1">Skills</h3>
            <p className="text-lg font-semibold text-foreground mb-4">Technologies you work with</p>
            <div className="border border-input rounded-md px-3 py-2 flex flex-wrap gap-2 items-center">
              {form.skills.map((skill) => (
                <span key={skill} className="inline-flex items-center gap-2 bg-muted text-foreground text-sm px-2 py-1 rounded-full">
                  {skill}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => removeSkill(skill)}
                    aria-label={`Remove ${skill}`}
                  >
                    x
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                onBlur={() => addSkill(skillInput)}
                placeholder={form.skills.length ? 'Add another skill' : 'Type a skill and press Enter'}
                className="bg-transparent border-0 outline-none text-foreground min-w-[180px] flex-1"
              />
            </div>
          </section>

          <section className="bg-card border border-border rounded-xl shadow-card p-6">
            <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-1">Preview</h3>
            <p className="text-lg font-semibold text-foreground mb-4">How others see your profile</p>
            <div className="rounded-lg border border-border p-4 bg-background/40">
              <div className="flex items-center gap-3 mb-3">
                {previewAvatar ? (
                  <img
                    src={avatarSrc}
                    alt={form.displayName || user?.name || ''}
                    className="w-12 h-12 rounded-full object-cover"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center font-semibold">
                    {(form.displayName || user?.name || user?.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-foreground">{form.displayName || 'Your name'}</div>
                  <div className="text-sm text-muted-foreground">{form.username ? `@${form.username}` : '@username'}</div>
                </div>
              </div>
              <p className="text-sm text-foreground mb-2">{form.headline || 'Your headline appears here'}</p>
              <p className="text-sm text-muted-foreground">{form.bio || 'Your public bio appears here.'}</p>
            </div>
          </section>

          <div className={`flex items-center gap-4 ${isDirty ? 'pb-24 sm:pb-6' : 'pb-6'}`}>
            <Button type="submit" disabled={saving || !isDirty} data-testid="save-profile-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </form>

        {isDirty && (
          <div
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] sm:hidden"
            role="region"
            aria-label="Save profile"
          >
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground truncate">Unsaved changes</p>
              <Button
                type="submit"
                form="profile-edit-form"
                disabled={saving || !isDirty}
                className="shrink-0"
                data-testid="save-profile-sticky-btn"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </Button>
            </div>
          </div>
        )}
    </div>
  );
}
