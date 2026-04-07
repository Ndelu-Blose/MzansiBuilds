import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Lock, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const inputClass =
  'w-full rounded-md border border-input bg-background px-4 py-2.5 pl-10 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading'); // loading | ready | expired | noconfig
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setPhase('noconfig');
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(() => {
      if (cancelled) return;
      setPhase((p) => (p === 'loading' ? 'expired' : p));
    }, 5000);

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        clearTimeout(timeout);
        setPhase('ready');
        return;
      }
      await new Promise((r) => setTimeout(r, 250));
      const { data: { session: s2 } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (s2) {
        clearTimeout(timeout);
        setPhase('ready');
        return;
      }
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        clearTimeout(timeout);
        setPhase('ready');
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;
      await supabase.auth.signOut();
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true, state: { passwordReset: true } }), 1200);
    } catch (err) {
      setError(err.message || 'Could not update password. Try requesting a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (phase === 'noconfig') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card text-center">
          <p className="text-muted-foreground mb-6">Supabase is not configured. Password reset is unavailable.</p>
          <Button asChild variant="outline">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'expired') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Reset link invalid or expired</h1>
          <p className="text-muted-foreground text-sm">
            Open the latest password reset email from MzansiBuilds, or request a new link from the sign-in page.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'loading' && !success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Validating reset link…</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card text-center">
          <p className="text-foreground font-medium">Password updated. Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card">
        <Link to="/" className="text-2xl font-bold text-foreground">
          Mzansi<span className="text-primary">Builds</span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-foreground tracking-tight">Set a new password</h1>
        <p className="mt-2 text-muted-foreground text-sm">Choose a strong password for your account.</p>

        {error && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive/25 rounded-md flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="reset-password-new" className="block text-sm font-medium text-foreground mb-1.5">
              New password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="reset-password-new"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className={inputClass}
                data-testid="reset-password-input"
              />
            </div>
          </div>
          <div>
            <label htmlFor="reset-password-confirm" className="block text-sm font-medium text-foreground mb-1.5">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="reset-password-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className={inputClass}
                data-testid="reset-password-confirm-input"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading} data-testid="reset-password-submit">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Update password
          </Button>
        </form>

        <p className="mt-6 text-center">
          <Link to="/login" className="text-sm text-primary hover:text-primary-hover font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
