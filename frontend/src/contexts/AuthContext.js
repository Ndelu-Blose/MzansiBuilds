import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getBackendOrigin } from '../lib/backendUrl';
import { supabase } from '../lib/supabase';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync profile with backend when user authenticates via Supabase
  const syncUserWithBackend = useCallback(async (supabaseUser, accessToken) => {
    if (!supabaseUser) return null;

    const backendOrigin = getBackendOrigin();
    if (!backendOrigin) {
      return {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name:
          supabaseUser.user_metadata?.full_name ||
          supabaseUser.user_metadata?.name ||
          supabaseUser.email?.split('@')[0],
        picture:
          supabaseUser.user_metadata?.avatar_url ||
          supabaseUser.user_metadata?.picture,
      };
    }

    try {
      // Call backend to sync/create user profile
      const response = await axios.post(`${backendOrigin}/api/auth/sync`, {
        supabase_id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0],
        picture: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
        provider: supabaseUser.app_metadata?.provider || 'email',
        email_confirmed_at: supabaseUser.email_confirmed_at ?? null,
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        withCredentials: true
      });
      return response.data.user;
    } catch (error) {
      console.error('Failed to sync user with backend:', error);
      // Return basic user info from Supabase if backend sync fails
      return {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name,
        picture: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture
      };
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const backendUser = await syncUserWithBackend(session.user, session.access_token);
        setUser(backendUser);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const backendUser = await syncUserWithBackend(session.user, session.access_token);
        setUser(backendUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [syncUserWithBackend]);

  const getAuthRedirectOrigin = () =>
    typeof window !== 'undefined' ? window.location.origin : '';

  // Email/Password Sign Up via Supabase
  const register = async (email, password, name) => {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedName = (name || '').trim();
    if (!normalizedEmail) {
      throw new Error('Email is required.');
    }
    if (!normalizedName) {
      throw new Error('Name is required.');
    }
    const origin = getAuthRedirectOrigin();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: normalizedName,
        },
        emailRedirectTo: origin ? `${origin}/auth/confirmed` : undefined,
      },
    });

    if (error) throw error;
    return data;
  };

  const resendSignupConfirmation = async (email) => {
    const origin = getAuthRedirectOrigin();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: origin ? { emailRedirectTo: `${origin}/auth/confirmed` } : undefined,
    });
    if (error) throw error;
  };

  const requestPasswordReset = async (email) => {
    const origin = getAuthRedirectOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: origin ? `${origin}/auth/reset-password` : undefined,
    });
    if (error) throw error;
  };

  // Email/Password Sign In - Try Supabase first, fallback to legacy backend
  const login = async (email, password) => {
    // Try Supabase Auth first
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      const code = error.code || '';
      const msg = (error.message || '').toLowerCase();
      if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
        throw error;
      }
    }

    if (!error && data?.session) {
      return data;
    }

    // If Supabase fails, try legacy backend auth
    const legacyOrigin = getBackendOrigin();
    if (!legacyOrigin) {
      if (error) throw error;
      throw new Error('Login failed');
    }
    try {
      const response = await axios.post(`${legacyOrigin}/api/auth/login`, {
        email,
        password
      }, {
        withCredentials: true
      });
      
      // Create a mock session for legacy auth
      const legacyUser = response.data.user;
      setUser(legacyUser);
      setSession({ user: legacyUser, legacy: true });
      
      return { session: { user: legacyUser, legacy: true }, user: legacyUser };
    } catch (legacyError) {
      // If both fail, throw the original Supabase error or a combined error
      if (error) {
        throw error;
      }
      throw new Error(legacyError.response?.data?.detail || 'Login failed');
    }
  };

  // Google Sign In
  const loginWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
    return data;
  };

  // GitHub Sign In
  const loginWithGitHub = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
    return data;
  };

  // Sign Out
  const logout = async () => {
    // Logout from Supabase
    await supabase.auth.signOut();
    
    // Also logout from backend (for legacy sessions)
    const logoutOrigin = getBackendOrigin();
    if (logoutOrigin) {
      try {
        await axios.post(`${logoutOrigin}/api/auth/logout`, {}, { withCredentials: true });
      } catch (_error) {
        // Ignore logout errors
      }
    }
    
    setUser(null);
    setSession(null);
  };

  // Get access token for API calls
  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }, []);

  const value = {
    session,
    user,
    loading,
    login,
    register,
    resendSignupConfirmation,
    requestPasswordReset,
    logout,
    loginWithGoogle,
    loginWithGitHub,
    getAccessToken,
    isAuthenticated: !!(session?.user || user),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
