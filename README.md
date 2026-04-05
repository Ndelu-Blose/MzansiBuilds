# MzansiBuilds

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

## Run locally — frontend

Dependencies live in `frontend/`.

```bash
cd frontend
npm install
npm start
```

Dev server: [http://localhost:3000](http://localhost:3000). Production build: `npm run build` (output in `frontend/build/`).

From the repository root you can also run `npm start`, `npm run build`, or `npm run install:frontend` (see root `package.json`). See **`frontend/README.md`** for OAuth setup, env vars, and troubleshooting.

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

## Maintaining this repository

Add a `LICENSE` and contribution guidelines when you publish or onboard collaborators. Keep secrets in `.env` files only (never committed); use the tracked `*.env.example` files as templates.
