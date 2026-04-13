# API Surfaces Reference

This is a concise reference for the highest-value product API surfaces currently implemented.

## Discovery

- `GET /api/projects/matched`
- `GET /api/open-roles`
- `GET /api/trending/projects`
- `GET /api/trending/builders`
- `POST /api/projects/{project_id}/bookmark`
- `DELETE /api/projects/{project_id}/bookmark`
- `GET /api/my/bookmarks`
- `GET /api/projects/{project_id}/suggested-collaborators`

## Credibility

- `GET /api/users/{user_id}/builder-score`
- `GET /api/projects/{project_id}/timeline`
- `POST /api/collaborations/{collab_id}/receipt`
- `GET /api/users/{user_id}/receipts`

## Growth

- `GET /api/notifications`
- `PATCH /api/notifications/{notification_id}/read`
- `GET /api/digest/preview`
- `PUT /api/digest/preferences`

## Activation

- `GET /api/activation/checklist`
- `GET /api/dashboard/activation-state`

## Distribution

- `GET /api/projects/{project_id}/share-card`
- `GET /api/users/{user_id}/share-card`

## Notes

- Most mutation routes require authentication.
- Share-card routes are intentionally compact and public-safe for distribution use.
- Ranking endpoints use signal-based scoring and have seeded relative-order hardening tests.
