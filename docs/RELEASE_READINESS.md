# Release Readiness

This checklist is the operator-facing release gate for MzansiBuilds.

## Verified Green Command Chain

Run from repository root unless otherwise noted.

### 1) Backend test suite
```bash
pytest backend/tests -q
```
Validates:
- API contract behavior
- service-layer logic
- ranking hardening tests
- activation/growth hardening tests

### 2) Frontend unit/API tests
Run in `frontend/`:
```bash
npm test -- --watchAll=false
```
Validates:
- frontend utility contracts
- API client method contracts
- baseline React test harness health

### 3) Frontend production build
Run in `frontend/`:
```bash
npm run build
```
Validates:
- production compile path
- static bundle output
- route/component import integrity

### 4) Browser automation (Playwright)
Run in `frontend/`:
```bash
npm run test:e2e
```
Validates:
- landing + login flows
- project/collaboration browser journeys
- dashboard/project-detail interaction integrity

## CI Coverage Map

- **Backend correctness:** `pytest backend/tests -q`
- **Frontend unit/API safety:** `npm test -- --watchAll=false`
- **Deployability/build safety:** `npm run build`
- **User-flow regression safety:** `npm run test:e2e`

A release is considered green only when all four command groups pass.

## Pre-Release Checklist

- [ ] Pull latest code and ensure dependencies are installed.
- [ ] Confirm backend env is present (`backend/.env`) for local integration tests.
- [ ] Confirm frontend env is present (`frontend/.env.local`) with backend/supabase vars.
- [ ] Run full green command chain in order.
- [ ] Smoke-check high-value surfaces manually:
  - landing page
  - open roles
  - dashboard
  - project detail
  - public profile
  - share card flows (project/profile copy-link)
- [ ] Confirm no accidental private data appears in public share-card responses.
- [ ] Confirm migration/data changes (if any) are backward-safe.

## Rollback Readiness

- Ensure last known green commit SHA is documented before deploying.
- Keep release notes concise with changed areas and potential impact.
- If a release fails:
  1. roll back to last known green commit
  2. rerun backend + frontend unit/API tests
  3. rerun targeted Playwright suite for impacted flow

## Known Non-Blocking Warnings

- FastAPI deprecation warnings for `on_event` lifecycle hooks may appear in tests.
  - Status: known, non-blocking
  - Recommended maintenance follow-up: migrate to lifespan handlers.
- Node warning about `NO_COLOR` and `FORCE_COLOR` during Playwright runs.
  - Status: non-blocking output noise

## Release Gate Summary

Do not release if any of the following are red:
- backend tests
- frontend unit/API tests
- production build
- Playwright e2e suite
