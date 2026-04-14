import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { digestAPI } from '../lib/api';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const { user } = useAuth();
  const [emailDigest, setEmailDigest] = useState(true);
  const [commentEmails, setCommentEmails] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadPreferences = async () => {
      setInitialLoading(true);
      setMessage('');
      try {
        const res = await digestAPI.getPreferences();
        const data = res.data || {};
        const channels = Array.isArray(data.channels) ? data.channels : [];
        setEmailDigest(channels.includes('email_digest'));
        setCommentEmails(channels.includes('comment_emails'));
      } catch (_err) {
        setMessage('Could not load preferences; using defaults.');
        setEmailDigest(true);
        setCommentEmails(true);
      } finally {
        setInitialLoading(false);
      }
    };
    loadPreferences();
  }, []);

  const saveSettings = async () => {
    setLoading(true);
    setMessage('');
    try {
      const channels = [];
      if (emailDigest) channels.push('email_digest');
      if (commentEmails) channels.push('comment_emails');
      await digestAPI.updatePreferences({
        frequency: 'weekly',
        channels,
      });
      setMessage('Settings saved.');
    } catch (_err) {
      setMessage('Could not save settings right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account preferences for {user?.email}.</p>
        {initialLoading ? <p className="text-sm text-muted-foreground mt-2">Loading preferences...</p> : null}

        <div className="mt-6 rounded-xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">Weekly digest emails</p>
              <p className="text-sm text-muted-foreground">Receive summary updates about trending projects and milestones.</p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 mt-1"
              checked={emailDigest}
              onChange={(e) => setEmailDigest(e.target.checked)}
            />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">Comment and collaboration emails</p>
              <p className="text-sm text-muted-foreground">Get notified when builders comment or request to collaborate.</p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 mt-1"
              checked={commentEmails}
              onChange={(e) => setCommentEmails(e.target.checked)}
            />
          </div>

          <div className="pt-2">
            <Button onClick={saveSettings} disabled={loading}>
              {loading ? 'Saving...' : 'Save changes'}
            </Button>
            {message ? <p className="text-sm text-muted-foreground mt-2">{message}</p> : null}
          </div>
        </div>
    </div>
  );
}
