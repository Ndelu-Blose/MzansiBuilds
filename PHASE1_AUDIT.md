# Phase 1 execution audit

**Status:** Implemented and verified (Agent mode). Backend, frontend, tests, and Playwright e2e are in place.

---

## What was delivered (summary)

| Area | Files / artifacts | Purpose |
|------|---------------------|---------|
| Backend | `models.py`, `notification_service.py`, `schemas.py`, `server.py` | Notifications table + API; project update author; PATCH/DELETE updates; DELETE comments; list/mark-read notifications; enqueue notifications on comments, collab requests, milestones, updates |
| Frontend | `api.js`, `ProjectDetailPage.js`, `SiteHeader.js` | Client calls; owner edit/delete updates; delete comments; bell + popover + mark read |
| Tests | `backend/tests/test_notification_service.py`, `frontend/e2e/phase1-updates-comments-notifications.spec.js` | Unit + mocked e2e for Phase 1 flows |
| Auth hardening | `frontend/src/contexts/AuthContext.js` | Legacy login no longer overwritten when Supabase reports `session: null` (failed password attempt) or when `getSession()` resolves after legacy login |

---

## Detailed checklist (what / where / why)

### 1. Backend — `backend/models.py`

| Change | Where | Why |
|--------|--------|-----|
| `Notification` model | New class | Persist in-app notifications |
| `notifications` on `User` | `User` relationships | ORM navigation / cascade |
| `author` on `ProjectUpdate` | `relationship("User", foreign_keys=[author_user_id])` | Serialize author on update cards |

### 2. Backend — `backend/notification_service.py`

| Change | Where | Why |
|--------|--------|-----|
| Constants | `NOTIFICATION_TYPE_*` | Stable `type` string values |
| `add_notification(...)` | Function | Single place that builds `Notification` and `session.add()` |

### 3. Backend — `backend/schemas.py`

| Change | Where | Why |
|--------|--------|-----|
| `ProjectUpdatePatch` | Optional fields | PATCH body validation |
| `ProjectUpdateResponse` | Optional `author` | API contract for UI |
| `NotificationResponse`, `NotificationListResponse` | Pydantic models | List + mark-read responses |

### 4. Backend — `backend/server.py`

| Change | Where | Why |
|--------|--------|-----|
| `project_update_to_response` | Include `author` when loaded | Show author name |
| `PATCH/DELETE .../updates/{update_id}` | Routes | Owner update/delete |
| `get_project_updates` / activity queries | `selectinload(ProjectUpdate.author)` | Author in JSON |
| `create_project_update` | `add_notification` when author ≠ owner | Avoid self-noise for owner-authored updates |
| `DELETE .../comments/{comment_id}` | Route | Owner or commenter delete |
| `create_comment`, `request_collaboration`, `update_milestone` | Notification enqueue | In-app alerts |
| `GET /notifications`, `PATCH /notifications/{id}/read` | Routes | Bell UI |

### 5. Frontend — `frontend/src/lib/api.js`

| Change | Where | Why |
|--------|--------|-----|
| `updatesAPI.update`, `updatesAPI.delete` | `updatesAPI` | Match new endpoints |
| `commentsAPI.delete` | `commentsAPI` | Comment delete |
| `notificationsAPI.list`, `notificationsAPI.markRead` | New export | Bell + dropdown |

### 6. Frontend — `frontend/src/pages/ProjectDetailPage.js`

| Change | Where | Why |
|--------|--------|-----|
| Author on cards | Update list | UX |
| Owner edit / save / cancel / delete | Updates section | PATCH/DELETE |
| `data-testid`s | Buttons / form | Playwright |
| Comment delete | Comment row | DELETE API |

### 7. Frontend — `frontend/src/components/SiteHeader.js`

| Change | Where | Why |
|--------|--------|-----|
| Bell + `Popover` | `variant === 'app'` | Notifications UI |
| Poll + refresh on open | `useEffect` | Unread badge |
| Mark read on row click | Handler + navigate to `project_id` | Clears unread + deep link |

### 8. Frontend — `frontend/src/contexts/AuthContext.js` (post-plan fix)

| Change | Where | Why |
|--------|--------|-----|
| `legacyAuthActiveRef` | Ref + login/logout/onAuthStateChange/getSession | Supabase `onAuthStateChange` and late `getSession()` must not replace a successful **legacy** session with `null` |
| `legacyAuthActiveRef` true before legacy `axios.post` | Legacy branch | Mark intent before async work |
| Clear ref on Supabase success, legacy failure, logout | Various | Avoid stale “legacy active” flag |

### 9. Tests

| Artifact | Where | Why |
|----------|--------|-----|
| `backend/tests/test_notification_service.py` | New | `add_notification` calls `session.add` with expected fields |
| `frontend/e2e/phase1-updates-comments-notifications.spec.js` | New | Mocked API: login → dashboard → project; post/edit/delete update; delete comment; bell + mark read |

### 10. E2E mock fixes (`phase1-updates-comments-notifications.spec.js`)

| Issue | Fix | Why |
|-------|-----|-----|
| Login never fired | Use password with **≥ 6 characters** (e.g. `any-password`) | `LoginPage` password input has `minLength={6}`; shorter passwords never submit |
| Delete did not run | `page.once('dialog', …)` **before** delete click | `confirm()` runs during click; handler must be registered first |
| Mark read had no effect | Parse notification id from `/api/notifications/{id}/read` with `path.split('/').filter(Boolean)[…]` | `pop()` returned `"read"` instead of the id |

### 11. DB

| Note | Why |
|------|-----|
| App uses `Base.metadata.create_all` on startup (`server.py`) | `notifications` table appears on next deploy if migrations are not used |

---

## Test commands and results (2026-04-12, this workspace)

```bash
cd backend
python -m pytest tests/test_notification_service.py tests/test_project_activity_service.py -q
# 2 passed

cd frontend
yarn build
npx playwright test e2e/ --workers=1
# 9 passed (landing, login, phase1 x3, milestones x2)
```

---

## Revision history

| Date | Note |
|------|------|
| 2026-04-12 | Audit file created in Plan mode (intended checklist only) |
| 2026-04-12 | Implementation completed; AuthContext legacy guard; Phase 1 e2e fixes (password length, dialog order, PATCH id parsing); pytest + full Playwright green |
