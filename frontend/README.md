# MzansiBuilds — frontend

React app built with [Create React App](https://github.com/facebook/create-react-app) and [Craco](https://craco.js.org/) for webpack configuration.

## Local runbook

From the repository root:

```bash
cd frontend
npm install
npm start
```

- **Dev server:** [http://localhost:3000](http://localhost:3000)
- **Production build:** `npm run build` (output in `build/`)

Peer dependency conflicts (e.g. `date-fns` vs `react-day-picker`) are handled via **`frontend/.npmrc`** (`legacy-peer-deps=true`), so you do not need to pass `--legacy-peer-deps` on every install.

**Package manager:** this repo is set up for **npm**. Yarn is optional; if you use Corepack/Yarn on Windows, you may need an elevated shell to install shims under `Program Files\nodejs`.

**Blank / black screen in the browser:** the page background is dark by design. If you see **no header, text, or buttons**, ensure `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` are set (copy `frontend/.env.example` to `frontend/.env.local`) so the app can initialize. In development, missing vars no longer crash the bundle; OAuth buttons stay disabled until real keys are set (see `src/lib/supabase.js`).

### OAuth: Google and GitHub

Sign-in uses **Supabase Auth** (`signInWithOAuth` in `src/contexts/AuthContext.js`). The browser does **not** call Google or GitHub directly; Supabase handles the OAuth exchange once you configure the following:

1. **Supabase (required)**  
   - **Authentication → Providers:** enable **Google** and **GitHub**.  
   - Paste the **Client ID** and **Client secret** from Google Cloud and GitHub (see below).  
   - **Authentication → URL configuration:** set **Site URL** (e.g. `http://localhost:3000` for dev) and **Redirect URLs** to include (use the **exact** origin and port your dev server prints):
     - `http://localhost:3000/auth/callback` (OAuth return)
     - `http://localhost:3000/auth/confirmed` (email confirmation after the user clicks the link in their inbox)
     - `http://localhost:3000/auth/reset-password` (password reset after the user clicks the reset link)
     Add the same three paths for **production** (HTTPS) in Supabase. Without these, confirm/reset links may fall back to the wrong URL or be rejected.
   - **Email templates:** In **Authentication → Email Templates**, set **From name** (e.g. `MzansiBuilds`), subjects (e.g. “Confirm your MzansiBuilds account”), and HTML so messages match your product. Do not remove Supabase link placeholders (`{{ .ConfirmationURL }}`, etc.). Optional: configure **SMTP** (e.g. Resend) under **Authentication** for a custom **From** domain.

2. **Google Cloud Console**  
   - Create or use an **OAuth 2.0 Client ID** (Web application).  
   - **Authorized redirect URIs** must include Supabase’s callback (usually `https://<project-ref>.supabase.co/auth/v1/callback`). Store it in **`REACT_APP_GOOGLE_OAUTH_CALLBACK_URL`** in `.env.local` for reference; the app derives the same URL from `REACT_APP_SUPABASE_URL` if you omit it. Use `getGoogleOAuthCallbackUrl()` in `src/lib/supabase.js` if you need it in code.

3. **GitHub → Settings → Developer settings → OAuth Apps**    
   - Set **Authorization callback URL** to the same Supabase callback (`https://<project-ref>.supabase.co/auth/v1/callback`). Optional env: **`REACT_APP_GITHUB_OAUTH_CALLBACK_URL`**. Use `getGithubOAuthCallbackUrl()` from `src/lib/supabase.js` if you need it in code.

**Frontend env:** `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` in `frontend/.env.local` must match this Supabase project. Restart `npm start` after env changes.

If OAuth still fails, confirm redirect URLs match **exactly** (scheme, host, port, path) in Supabase, Google, and GitHub.

**If installs behave oddly** (missing `lodash`, missing `webpack`, or `MODULE_NOT_FOUND` under `node_modules`), do a clean reinstall:

```bash
cd frontend
npx rimraf@5 node_modules
npm install
```

## Scripts

| Command | Purpose |
|--------|---------|
| `npm start` | Dev server at [http://localhost:3000](http://localhost:3000) (hot reload) |
| `npm test` | Interactive test runner ([CRA testing docs](https://facebook.github.io/create-react-app/docs/running-tests)) |
| `npm run build` | Production bundle in `build/` |

See [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started) for deployment, troubleshooting, and advanced configuration.
