import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI } from '../lib/api';
import { Loader2, Save, Github, User } from 'lucide-react';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';

const fieldClass =
  'w-full rounded-md border border-input bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all';

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [githubUrl, setGithubUrl] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await profileAPI.get();
      const data = response.data;
      setBio(data.bio || '');
      setSkills(data.skills?.join(', ') || '');
      setGithubUrl(data.github_url || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const skillsArray = skills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await profileAPI.update({
        bio,
        skills: skillsArray,
        github_url: githubUrl || null,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="profile-page">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <User className="w-8 h-8 text-primary" />
            Edit Profile
          </h1>
          <p className="text-muted-foreground mt-1">Update your public profile information</p>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-card p-6 mb-8">
          <div className="flex items-center gap-4">
            {user?.picture ? (
              <img src={user.picture} alt={user.name || ''} className="w-16 h-16 rounded-full ring-2 ring-border" />
            ) : (
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-xl font-bold text-foreground">
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-foreground">{user?.name || 'Developer'}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                {user?.auth_provider === 'google' ? 'Google Account' : 'Email Account'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className={`${fieldClass} px-4 py-3 resize-none`}
              rows={4}
              data-testid="bio-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Skills</label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g., React, Python, AWS (comma separated)"
              className={fieldClass}
              data-testid="skills-input"
            />
            <p className="text-xs text-muted-foreground mt-1">Separate skills with commas</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <Github className="w-4 h-4 inline mr-1" />
              GitHub URL
            </label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/yourusername"
              className={fieldClass}
              data-testid="github-input"
            />
          </div>

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={saving} data-testid="save-profile-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>

            {success && <span className="text-primary text-sm font-medium animate-fade-in">Profile updated successfully!</span>}
          </div>
        </form>
      </div>
    </Layout>
  );
}
