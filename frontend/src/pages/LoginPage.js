import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { Mail, Lock, User, Loader2, AlertCircle, Github } from 'lucide-react';

function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  
  const { login, register, loginWithGoogle, loginWithGitHub } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(formatApiErrorDetail(err.message) || 'Authentication failed');
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link to="/" className="text-2xl font-bold text-white">
              Mzansi<span className="text-amber-500">Builds</span>
            </Link>
            <h1 className="mt-6 text-3xl font-bold text-white tracking-tight">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="mt-2 text-zinc-400">
              {isLogin ? 'Sign in to continue building' : 'Start building in public today'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {!isSupabaseConfigured && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/25 rounded-sm text-amber-200/90 text-sm">
              Google/GitHub sign-in is disabled until you add{' '}
              <code className="text-xs bg-zinc-900 px-1 py-0.5 rounded">REACT_APP_SUPABASE_URL</code> and{' '}
              <code className="text-xs bg-zinc-900 px-1 py-0.5 rounded">REACT_APP_SUPABASE_ANON_KEY</code> to{' '}
              <code className="text-xs bg-zinc-900 px-1 py-0.5 rounded">frontend/.env.local</code>. Email sign-in can still use the legacy API if{' '}
              <code className="text-xs bg-zinc-900 px-1 py-0.5 rounded">REACT_APP_BACKEND_URL</code> is set.
            </div>
          )}

          {/* Social Login Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogleLogin}
              disabled={socialLoading !== null || !isSupabaseConfigured}
              className="w-full bg-transparent text-white border border-zinc-700 px-6 py-2.5 rounded-sm hover:border-zinc-500 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="google-signin-btn"
            >
              {socialLoading === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>

            <button
              onClick={handleGitHubLogin}
              disabled={socialLoading !== null || !isSupabaseConfigured}
              className="w-full bg-transparent text-white border border-zinc-700 px-6 py-2.5 rounded-sm hover:border-zinc-500 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="github-signin-btn"
            >
              {socialLoading === 'github' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Github className="w-5 h-5" />
              )}
              Continue with GitHub
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-zinc-950 text-zinc-500">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-2.5 pl-10 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                    data-testid="register-name-input"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-2.5 pl-10 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  data-testid="email-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-4 py-2.5 pl-10 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  data-testid="password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || socialLoading !== null}
              className="w-full bg-amber-500 text-zinc-950 font-semibold px-6 py-2.5 rounded-sm hover:bg-amber-400 transition-colors focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="submit-btn"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-zinc-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-amber-500 hover:text-amber-400 font-medium"
              data-testid="toggle-auth-mode"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div 
        className="hidden lg:flex flex-1 items-center justify-center relative"
        style={{
          backgroundImage: 'url(/images/hero-login.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"></div>
        <div className="relative z-10 text-center px-12">
          <h2 className="text-4xl font-bold text-white mb-4">Build in Public</h2>
          <p className="text-xl text-zinc-300">
            Join the community of developers sharing their journey
          </p>
        </div>
      </div>
    </div>
  );
}
