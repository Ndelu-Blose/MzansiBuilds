import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

function parseUrlAuthError() {
  if (typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  const hash = window.location.hash?.startsWith('#')
    ? new URLSearchParams(window.location.hash.slice(1))
    : new URLSearchParams();
  return (
    search.get('error_code') ||
    hash.get('error_code') ||
    search.get('error') ||
    hash.get('error') ||
    null
  );
}

export default function EmailConfirmedPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading');
  const [urlError, setUrlError] = useState(null);

  useEffect(() => {
    const err = parseUrlAuthError();
    if (err) {
      setUrlError(err);
      setPhase('link_error');
      return;
    }

    if (!isSupabaseConfigured) {
      setPhase('noconfig');
      return;
    }

    let cancelled = false;

    const resolveSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setPhase('has_session');
        return;
      }
      await new Promise((r) => setTimeout(r, 200));
      const { data: { session: s2 } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (s2) {
        setPhase('has_session');
        return;
      }
      setPhase('no_session');
    };

    resolveSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled || !session) return;
      setPhase('has_session');
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleContinue = () => {
    navigate('/dashboard', { replace: true });
  };

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Confirming your email…</p>
        </div>
      </div>
    );
  }

  if (phase === 'noconfig') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card text-center">
          <p className="text-muted-foreground mb-6">
            Supabase is not configured. Add your project URL and anon key to use email confirmation.
          </p>
          <Button asChild variant="outline">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'link_error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Link invalid or expired</h1>
          <p className="text-muted-foreground text-sm">
            This confirmation link is no longer valid. Request a new confirmation email from the sign-in page, or try signing up again.
          </p>
          {urlError && (
            <p className="text-xs text-muted-foreground font-mono break-all">{urlError}</p>
          )}
          <Button asChild className="w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'no_session') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card text-center space-y-6">
          <Link to="/" className="text-2xl font-bold text-foreground inline-block">
            Mzansi<span className="text-primary">Builds</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Almost there</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              We could not start a session from this page. If you already confirmed your email, sign in with your password. You can also open the confirmation link from your latest email again.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card text-center space-y-6">
        <Link to="/" className="text-2xl font-bold text-foreground inline-block">
          Mzansi<span className="text-primary">Builds</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email confirmed</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Your account is verified. You can continue into the app or finish setting up your profile.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button className="w-full" onClick={handleContinue} data-testid="email-confirmed-continue">
            Continue to dashboard
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/profile">Complete your profile</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
