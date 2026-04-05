// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

/** True when real project URL + anon key are set (OAuth and Supabase email auth work). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Supabase-hosted callback used by both Google and GitHub OAuth apps (…/auth/v1/callback). */
function getSupabaseHostedProviderCallbackUrl(explicitFromEnv) {
  if (explicitFromEnv) return explicitFromEnv.trim().replace(/\/$/, '');
  if (!supabaseUrl) return '';
  return `${supabaseUrl.replace(/\/$/, '')}/auth/v1/callback`;
}

/**
 * URL for GitHub → OAuth App → **Authorization callback URL** (same as Supabase → Providers → GitHub).
 * Optional `REACT_APP_GITHUB_OAUTH_CALLBACK_URL`; otherwise derived from `REACT_APP_SUPABASE_URL`.
 */
export function getGithubOAuthCallbackUrl() {
  return getSupabaseHostedProviderCallbackUrl(process.env.REACT_APP_GITHUB_OAUTH_CALLBACK_URL);
}

/**
 * URL for Google Cloud → OAuth client → **Authorized redirect URIs** (same Supabase callback).
 * Optional `REACT_APP_GOOGLE_OAUTH_CALLBACK_URL`; otherwise derived from `REACT_APP_SUPABASE_URL`.
 */
export function getGoogleOAuthCallbackUrl() {
  return getSupabaseHostedProviderCallbackUrl(process.env.REACT_APP_GOOGLE_OAUTH_CALLBACK_URL);
}

const authOptions = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
};

/**
 * When env vars are missing in development, we must NOT point createClient at a fake host
 * (e.g. placeholder.supabase.co) — that breaks OAuth with DNS errors. This stub only
 * implements `auth` APIs used in this app and returns safe values / clear errors.
 */
function createUnconfiguredDevAuthStub() {
  const notConfiguredMsg =
    'Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to frontend/.env.local (see .env.example).';

  const oauthMsg =
    'Google and GitHub sign-in require a real Supabase project. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY, enable the providers in Supabase, and add your redirect URL (e.g. http://localhost:3000/auth/callback).';

  const err = (message) => {
    const e = new Error(message);
    e.name = 'AuthError';
    return e;
  };

  // eslint-disable-next-line no-console -- intentional dev-only warning
  console.warn(`[MzansiBuilds] ${notConfiguredMsg}`);

  return {
    auth: {
      getSession: async () => ({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: (callback) => {
        queueMicrotask(() => callback('INITIAL_SESSION', null));
        return {
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        };
      },
      signUp: async () => ({
        data: { user: null, session: null },
        error: err(notConfiguredMsg),
      }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: err('Supabase sign-in unavailable (not configured).'),
      }),
      signInWithOAuth: async () => ({
        data: { provider: null, url: null },
        error: err(oauthMsg),
      }),
      signOut: async () => ({ error: null }),
    },
  };
}

function createSupabaseClient() {
  if (isSupabaseConfigured) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: authOptions,
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    return createUnconfiguredDevAuthStub();
  }

  throw new Error(
    'Missing Supabase environment variables. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY for production builds.'
  );
}

export const supabase = createSupabaseClient();
