import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI } from '../lib/api';
import { Loader2, Save, Github, User } from 'lucide-react';
import Layout from '../components/Layout';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
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
      setProfile(data);
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
        .map(s => s.trim())
        .filter(s => s.length > 0);

      await profileAPI.update({
        bio,
        skills: skillsArray,
        github_url: githubUrl || null
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
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="profile-page">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <User className="w-8 h-8 text-amber-500" />
            Edit Profile
          </h1>
          <p className="text-zinc-400 mt-1">Update your public profile information</p>
        </div>

        {/* User Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-6 mb-8">
          <div className="flex items-center gap-4">
            {user?.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 bg-zinc-700 rounded-full flex items-center justify-center text-xl font-bold text-white">
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-white">{user?.name || 'Developer'}</h2>
              <p className="text-zinc-400">{user?.email}</p>
              <span className="font-mono text-xs text-zinc-500 uppercase tracking-wider">
                {user?.auth_provider === 'google' ? 'Google Account' : 'Email Account'}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-3 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none"
              rows={4}
              data-testid="bio-input"
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Skills</label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g., React, Python, AWS (comma separated)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-2.5 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              data-testid="skills-input"
            />
            <p className="text-xs text-zinc-500 mt-1">Separate skills with commas</p>
          </div>

          {/* GitHub URL */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              <Github className="w-4 h-4 inline mr-1" />
              GitHub URL
            </label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/yourusername"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-2.5 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              data-testid="github-input"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-amber-500 text-zinc-950 font-semibold px-6 py-2.5 rounded-sm hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center gap-2"
              data-testid="save-profile-btn"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
            
            {success && (
              <span className="text-green-400 text-sm animate-fade-in">
                Profile updated successfully!
              </span>
            )}
          </div>
        </form>
      </div>
    </Layout>
  );
}
