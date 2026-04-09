import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { Mail, Lock, User, Loader2, AlertCircle, Github, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const inputClass =
  'w-full rounded-md border border-input bg-background px-4 py-2.5 pl-10 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all';

function formatApiErrorDetail(detail) {
  if (detail == null) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e))).filter(Boolean).join(' ');
  if (detail && typeof detail === 'object') {
    const message = detail.message || detail.detail || detail.msg;
    const hint = detail.hint;
    if (message && hint) return `${message} ${hint}`;
    if (message) return String(message);
  }
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
}

function getFriendlyAuthError(err, { isLogin }) {
  const code = (err?.code || '').toLowerCase();
  const raw =
    formatApiErrorDetail(err?.response?.data?.detail || err?.message || err?.error_description || err?.description) ||
    '';
  const msg = raw.toLowerCase();

  if (!isLogin && (msg.includes('error sending confirmation email') || msg.includes('sending confirmation email'))) {
    return 'We could not send your verification email right now. Please tap "Try again", and if it still fails, use Continue with Google or Continue with GitHub.';
  }

  if (!isLogin && (msg.includes('smtp') || msg.includes('mailer') || code.includes('smtp'))) {
    return 'Email signup is temporarily unavailable. Please try again in a moment, or continue with Google/GitHub.';
  }

  if (msg.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.';
  }

  if (isLogin && isEmailNotConfirmed(err)) {
    return 'Your email is not verified yet. Check your inbox for the confirmation link, or resend it below.';
  }

  return raw || 'Something went wrong. Please try again.';
}

function isEmailNotConfirmed(err) {
  const code = err?.code || '';
  const msg = (err?.message || '').toLowerCase();
  return code === 'email_not_confirmed' || msg.includes('email not confirmed');
}

function isAlreadyRegistered(err) {
  const code = (err?.code || '').toLowerCase();
  const msg = (err?.message || '').toLowerCase();
  return (
    code.includes('user_already_exists') ||
    code.includes('email_exists') ||
    msg.includes('already registered') ||
    msg.includes('already exists')
  );
}

function isLikelySocialAccountConflict(err) {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('identity') ||
    msg.includes('provider') ||
    msg.includes('oauth') ||
    msg.includes('social')
  );
}

function maskEmail(value) {
  if (!value || !value.includes('@')) return value;
  const [u, domain] = value.split('@');
  if (u.length <= 2) return `${u[0]}•••@${domain}`;
  return `${u.slice(0, 2)}•••@${domain}`;
}

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [showResendForLogin, setShowResendForLogin] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [infoBanner, setInfoBanner] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);

  const { login, register, resendSignupConfirmation, requestPasswordReset, loginWithGoogle, loginWithGitHub } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.error) {
      setError(formatApiErrorDetail(location.state.error));
    }
    if (location.state?.passwordReset) {
      setInfoBanner('Your password was updated. Sign in with your new password.');
    }
  }, [location.state]);

  const resetAuthMode = (loginMode) => {
    setIsLogin(loginMode);
    setError('');
    setShowResendForLogin(false);
    setForgotMode(false);
    setForgotMessage('');
    setPendingVerificationEmail(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoBanner('');
    setLoading(true);
    setShowResendForLogin(false);

    try {
      const trimmedEmail = email.trim();
      const trimmedName = name.trim();

      if (isLogin) {
        await login(trimmedEmail, password);
        navigate('/dashboard');
      } else {
        if (!trimmedName) {
          throw new Error('Please add your name to finish creating your account.');
        }
        const data = await register(trimmedEmail, password, trimmedName);
        if (data?.session) {
          navigate('/dashboard');
        } else {
          setPendingVerificationEmail(trimmedEmail);
        }
      }
    } catch (err) {
      if (!isLogin && isAlreadyRegistered(err)) {
        const target = email.trim();
        if (isLikelySocialAccountConflict(err)) {
          setIsLogin(true);
          setError(
            'This email is already linked to a social account. Sign in with Continue with GitHub or Continue with Google.'
          );
          setPendingVerificationEmail(null);
        } else {
          setError(
            'An account with this email already exists. If it is not verified yet, resend the confirmation email.'
          );
          setPendingVerificationEmail(target || null);
        }
        return;
      }
      if (isLogin && isEmailNotConfirmed(err)) {
        setError(
          'Your email is not verified yet. Check your inbox for the confirmation link, or resend it below.'
        );
        setShowResendForLogin(true);
      } else {
        setError(getFriendlyAuthError(err, { isLogin }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendSignup = async (targetEmail) => {
    const addr = (targetEmail || email || '').trim();
    if (!addr) {
      setError('Enter the email you signed up with, then try resend.');
      return;
    }
    setResendLoading(true);
    setError('');
    try {
      await resendSignupConfirmation(addr);
      setInfoBanner(`We sent another confirmation link to ${maskEmail(addr)}.`);
    } catch (err) {
      setError(formatApiErrorDetail(err.message) || 'Could not resend email.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    const addr = email.trim();
    if (!addr) {
      setError('Enter your email address.');
      return;
    }
    setForgotLoading(true);
    setError('');
    setForgotMessage('');
    try {
      await requestPasswordReset(addr);
      setForgotMessage(
        'If an account exists for that email, we sent a link to reset your password. Check your inbox.'
      );
    } catch (err) {
      setError(formatApiErrorDetail(err.message) || 'Could not send reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(formatApiErrorDetail(err.message) || 'Google sign in failed');
      setSocialLoading(null);
    }
  };

  const handleGitHubLogin = async () => {
    setSocialLoading('github');
    try {
      await loginWithGitHub();
    } catch (err) {
      setError(formatApiErrorDetail(err.message) || 'GitHub sign in failed');
      setSocialLoading(null);
    }
  };

  if (pendingVerificationEmail) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="flex-1 flex items-center justify-center p-8">
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card"
            data-testid="check-email-panel"
          >
            <Link to="/" className="text-2xl font-bold text-foreground">
              Mzansi<span className="text-primary">Builds</span>
            </Link>
            <h1 className="mt-6 text-2xl font-bold text-foreground tracking-tight">Check your email</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              We sent a confirmation link to <strong className="text-foreground">{maskEmail(pendingVerificationEmail)}</strong>.
              Please verify your email to activate your MzansiBuilds account.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={resendLoading}
                onClick={() => handleResendSignup(pendingVerificationEmail)}
                data-testid="resend-confirmation-btn"
              >
                {resendLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Resend confirmation email
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => {
                  setPendingVerificationEmail(null);
                  resetAuthMode(true);
                }}
                data-testid="back-to-signin-btn"
              >
                Back to sign in
              </Button>
            </div>
            {infoBanner && (
              <p className="mt-4 text-sm text-primary" data-testid="check-email-info">
                {infoBanner}
              </p>
            )}
          </div>
        </div>
        <div
          className="hidden lg:flex flex-1 items-center justify-center relative"
          style={{
            backgroundImage: 'url(/images/hero-login.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-background/75 backdrop-blur-sm" />
          <div className="relative z-10 text-center px-12 max-w-lg">
            <h2 className="text-4xl font-bold text-foreground mb-4">Build in Public</h2>
            <p className="text-xl text-muted-foreground">Join the community of developers sharing their journey</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card">
          <div className="mb-8">
            <Link to="/" className="text-2xl font-bold text-foreground">
              Mzansi<span className="text-primary">Builds</span>
            </Link>
            <h1 className="mt-6 text-3xl font-bold text-foreground tracking-tight">
              {forgotMode ? 'Reset password' : isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {forgotMode
                ? 'Enter your email and we will send you a reset link.'
                : isLogin
                  ? 'Sign in to continue building'
                  : 'Start building in public today'}
            </p>
          </div>

          {infoBanner && !forgotMode && (
            <div className="mb-4 p-3 rounded-md border border-primary/30 bg-primary/10 text-sm text-foreground">
              {infoBanner}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/25 rounded-md flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-destructive text-sm space-y-2">
                <p>{error}</p>
                {!isLogin && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      disabled={loading}
                      onClick={(e) => handleSubmit(e)}
                    >
                      Try again
                    </Button>
                    <button
                      type="button"
                      className="text-xs underline underline-offset-2"
                      onClick={() => setShowHelpPanel((prev) => !prev)}
                    >
                      {showHelpPanel ? 'Hide help' : 'Need help?'}
                    </button>
                  </div>
                )}
                {!isLogin && showHelpPanel && (
                  <div className="text-xs text-foreground/80 bg-background/60 rounded-md p-2 border border-border">
                    You can continue with Google or GitHub now and finish setup in seconds. If you prefer email signup, wait a minute and try again.
                  </div>
                )}
                {showResendForLogin && isSupabaseConfigured && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    disabled={resendLoading}
                    onClick={() => handleResendSignup(email)}
                  >
                    {resendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Resend confirmation email
                  </Button>
                )}
              </div>
            </div>
          )}

          {!isSupabaseConfigured && (
            <div className="mb-4 p-3 bg-accent border border-border rounded-md text-accent-foreground text-sm">
              Google/GitHub sign-in is disabled until you add{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">REACT_APP_SUPABASE_URL</code> and{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">REACT_APP_SUPABASE_ANON_KEY</code> to{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">frontend/.env.local</code>. Email sign-in can still use the legacy API if{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">REACT_APP_BACKEND_URL</code> is set.
            </div>
          )}

          {forgotMode ? (
            <form onSubmit={handleForgotSubmit} className="space-y-4" data-testid="forgot-password-panel">
              {forgotMessage && (
                <div className="p-3 rounded-md border border-border bg-muted/30 text-sm text-foreground">{forgotMessage}</div>
              )}
              <div>
                <label htmlFor="forgot-email-input" className="block text-sm font-medium text-foreground mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="forgot-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className={inputClass}
                    data-testid="forgot-email-input"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={forgotLoading} data-testid="forgot-submit-btn">
                {forgotLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Send reset link
              </Button>
              <p className="text-center">
                <button
                  type="button"
                  className="text-sm text-primary hover:text-primary-hover font-medium"
                  onClick={() => {
                    setForgotMode(false);
                    setForgotMessage('');
                    setError('');
                  }}
                >
                  Back to sign in
                </button>
              </p>
            </form>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={socialLoading !== null || !isSupabaseConfigured}
                  className="w-full bg-background text-foreground border border-border px-6 py-2.5 rounded-md hover:bg-muted transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="google-signin-btn"
                >
                  {socialLoading === 'google' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  Continue with Google
                </button>

                <button
                  type="button"
                  onClick={handleGitHubLogin}
                  disabled={socialLoading !== null || !isSupabaseConfigured}
                  className="w-full bg-background text-foreground border border-border px-6 py-2.5 rounded-md hover:bg-muted transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="github-signin-btn"
                >
                  {socialLoading === 'github' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <Github className="w-5 h-5" />
                  )}
                  Continue with GitHub
                </button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted-foreground">or sign in with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label htmlFor="register-name-input" className="block text-sm font-medium text-foreground mb-1.5">
                      Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        id="register-name-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className={inputClass}
                        data-testid="register-name-input"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email-input" className="block text-sm font-medium text-foreground mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="auth-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className={inputClass}
                      data-testid="email-input"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="auth-password-input" className="block text-sm font-medium text-foreground">
                      Password
                    </label>
                    {isLogin && isSupabaseConfigured && (
                      <button
                        type="button"
                        className="text-xs text-primary hover:text-primary-hover font-medium"
                        onClick={() => {
                          setForgotMode(true);
                          setError('');
                          setInfoBanner('');
                          setShowResendForLogin(false);
                        }}
                        data-testid="forgot-password-link"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="auth-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className={`${inputClass} pr-12`}
                      data-testid="password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      data-testid="toggle-password-visibility"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading || socialLoading !== null} data-testid="submit-btn">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              <p className="mt-6 text-center text-muted-foreground">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetAuthMode(!isLogin);
                  }}
                  className="text-primary hover:text-primary-hover font-medium"
                  data-testid="toggle-auth-mode"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>

      <div
        className="hidden lg:flex flex-1 items-center justify-center relative"
        style={{
          backgroundImage: 'url(/images/hero-login.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-background/75 backdrop-blur-sm" />
        <div className="relative z-10 text-center px-12 max-w-lg">
          <h2 className="text-4xl font-bold text-foreground mb-4">Build in Public</h2>
          <p className="text-xl text-muted-foreground">Join the community of developers sharing their journey</p>
        </div>
      </div>
    </div>
  );
}
