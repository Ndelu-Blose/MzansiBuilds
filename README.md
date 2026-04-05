# MzansiBuilds

[![CI](https://github.com/mzansibuilds/MzansiBuilds-Emergent/actions/workflows/ci.yml/badge.svg)](https://github.com/mzansibuilds/MzansiBuilds-Emergent/actions/workflows/ci.yml)

A builder-focused platform for developer profiles, projects, progress updates, and discovery—oriented toward the South African tech community.

## What it does

- User profiles and project pages with updates, milestones, and comments
- Feed and discovery flows
- Optional FastAPI backend for app APIs and transactional email (Resend)
- Authentication via Supabase (OAuth and session handling in the frontend)

## Tech stack

| Area        | Stack |
|------------|--------|
| Frontend   | React 19, React Router, Create React App + [Craco](https://craco.js.org/), Tailwind CSS, Radix UI, Supabase JS client |
| Backend    | Python, FastAPI, SQLAlchemy (async), PostgreSQL (via Supabase) |
| Email      | [Resend](https://resend.com) (API key server-side only) |

## UML diagrams (project profiling)

Maintained under [`docs/uml/`](docs/uml/) as **Mermaid** in Markdown (easy to update when the product or schema changes):

- [Use case — actors & user stories](docs/uml/use-case.md)
- [ERD — domain entities](docs/uml/erd.md)
- [Architecture — SPA, API, Supabase, hosting](docs/uml/architecture.md)

See [`docs/uml/README.md`](docs/uml/README.md) for conventions and editing tips.

## Run locally — frontend

Dependencies live in `frontend/`.

```bash
cd frontend
npm install
npm start
```

Dev server: [http://localhost:3000](http://localhost:3000). Production build: `npm run build` (output in `frontend/build/`).

From the repository root you can also run `npm start`, `npm run build`, or `npm run install:frontend` (see root `package.json`). See **`frontend/README.md`** for OAuth setup, env vars, and troubleshooting.

## Deploy frontend (Vercel)

The repo includes [vercel.json](vercel.json) at the **repository root** so you can import the project without changing Vercel’s “Root Directory” (it builds `frontend/` and outputs `frontend/build`). Client-side routes use a SPA fallback to `index.html`.

1. In [Vercel](https://vercel.com), **Add New Project** → import this Git repository.
2. Leave **Root Directory** as `.` (default). Vercel will use `installCommand` / `buildCommand` / `outputDirectory` from `vercel.json`.
3. Under **Environment Variables**, add every `REACT_APP_*` variable from [`frontend/.env.example`](frontend/.env.example) (at minimum `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`). Set `REACT_APP_BACKEND_URL` to your **deployed** API URL when you use the FastAPI backend (not `localhost`).
4. In **Supabase** → **Authentication** → **URL configuration**, set **Site URL** to your production origin (e.g. `https://<your-domain>`) and add these paths to **Redirect URLs** (each exact origin you use—local and production):
   - `https://<your-domain>/auth/callback` (OAuth)
   - `https://<your-domain>/auth/confirmed` (email signup confirmation)
   - `https://<your-domain>/auth/reset-password` (password recovery)
   For local dev, also add `http://localhost:3000/auth/callback`, `/auth/confirmed`, and `/auth/reset-password` (use the port your dev server prints).
5. **Branded auth emails (Supabase):** In **Authentication** → **Email Templates**, customize **Confirm signup** and **Reset password** (subject, sender name, HTML). Keep Supabase variables such as `{{ .ConfirmationURL }}` so links stay valid. Optional: **Authentication** → **SMTP** (e.g. Resend SMTP) so messages come from your domain.
6. Deploy. The **Python backend is not run on Vercel** with this setup—host it separately (e.g. Railway, Render, Fly.io) and point `REACT_APP_BACKEND_URL` at it.

## Run locally — backend (optional)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Copy `backend/.env.example` → `backend/.env` and set variables from your Supabase project and any secrets. Point the frontend at the API with `REACT_APP_BACKEND_URL` in `frontend/.env.local` (see `frontend/.env.example`).

**Resend:** set `RESEND_API_KEY` in `backend/.env` only. Optionally set `SENDER_EMAIL` to a domain verified in Resend. Do not put the Resend key in the frontend bundle.

**Security:** never commit real `.env` files or share database URLs, API keys, or JWT secrets in public channels. Rotate credentials if they were ever exposed.

The backend currently allows all origins in CORS in code (`server.py`); tighten this for production if needed.

**API test scripts:** `backend_test.py` and `enhanced_backend_test.py` can write JSON summaries to paths configured in those scripts (e.g. container layouts). Do not commit ad hoc `*_test_results.json` files from local or CI runs unless you intend to snapshot them deliberately.

## CI (GitHub Actions)

The workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on **push** and **pull_request** to `main` and `develop`:

- **Frontend:** `npm ci`, ESLint, Jest (`CI=true`), production build (with placeholder `REACT_APP_SUPABASE_*` for the bundle).
- **Backend:** Postgres service container, `DATABASE_URL` for integration tests, **Ruff**, **Flake8**, **pytest** (schema unit tests + FastAPI `TestClient` checks for `/api/` and `/api/health`). `server.py` is excluded from Ruff/Flake8 because it loads environment before imports; the rest of the backend package is linted.
- **E2E:** Playwright smoke tests against the built SPA (`frontend/e2e/`), with `npx playwright install --with-deps chromium` on the runner.

**Optional deploy (Render):** add a repository secret `DEPLOY_HOOK_URL` with your [Render deploy hook](https://render.com/docs/deploy-hooks) URL. On **push to `main`**, the workflow POSTs to that URL if the secret is set; otherwise the deploy step no-ops. For **Railway**, use their [CLI or webhook](https://docs.railway.app/guides/deployment) instead and wire a similar curl step if you prefer.

If the badge above 404s, replace `mzansibuilds/MzansiBuilds-Emergent` in the README with your GitHub `owner/repo`.

## Maintaining this repository

Add a `LICENSE` and contribution guidelines when you publish or onboard collaborators. Keep secrets in `.env` files only (never committed); use the tracked `*.env.example` files as templates.
