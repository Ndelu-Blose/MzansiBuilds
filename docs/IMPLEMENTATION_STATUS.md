# Implementation Status

This document tracks what is implemented in the live product stack and where quality hardening has already been applied.

## Sprint 01 — Discovery + Collaboration Intelligence

Implemented:
- Project bookmarks (`/api/projects/{id}/bookmark`, `/api/my/bookmarks`).
- Matched projects (`/api/projects/matched`).
- Suggested collaborators (`/api/projects/{id}/suggested-collaborators`).
- Project health status integrated into project responses.

Quality notes:
- Matching and health logic extracted into backend services.
- Basic API contract and service tests added.

## Sprint 02 — Builder Reputation Layer

Implemented:
- Builder score endpoint (`/api/users/{id}/builder-score`).
- Build timeline endpoint (`/api/projects/{id}/timeline`).
- Collaboration receipts model + endpoints.
- Trust fields propagated through profile/user/collaborator payloads.

Quality notes:
- Reputation and timeline logic implemented in dedicated services.
- UI surfaces added for trust rows, score cards, receipts, and timeline.

## Sprint 03 — Growth and Community Loops

Implemented:
- Open roles endpoint and page (`/api/open-roles`, `/open-roles`).
- Trending endpoints (`/api/trending/projects`, `/api/trending/builders`).
- Notification expansion (growth-oriented types and triggers).
- Digest preview and preferences (`/api/digest/preview`, `/api/digest/preferences`).

Hardening applied:
- Discovery ranking/filter hardening with seeded relative-order tests.
- Notification dedupe guardrails for repeated short-window alerts.
- Digest shaping: dedupe, signal ordering, sparse-data fallback.

## Sprint 04 — Activation Layer

Implemented:
- Activation checklist endpoint (`/api/activation/checklist`).
- Dashboard activation state (`/api/dashboard/activation-state`).
- Profile nudges and owner nudges in UI.
- First-match banner and context-aware empty states.

Quality notes:
- Seeded checklist tests.
- Auth and API regression coverage updated.

## Sprint 05 — Distribution + Positioning Layer

Implemented:
- Share-card endpoints:
  - `/api/projects/{id}/share-card`
  - `/api/users/{id}/share-card`
- Share preview components and copy-link CTAs on public project/profile pages.
- Landing positioning copy aligned to differentiation.
- Public surface trust/readability improvements and navigation emphasis.
- Positioning docs and roadmap docs introduced/updated.

## Current Product Layers

1. Discovery: open roles, matching, bookmarks, suggestions, trending.
2. Credibility: score, trust signals, receipts, health, timeline.
3. Growth: notifications, digest, momentum ranking.
4. Activation: nudges, first-match moments, intelligent empty states.
5. Distribution: share cards, positioning-first entry surfaces.

## Verification Snapshot

Focused regression suites cover:
- backend API/auth contracts
- discovery ranking behavior
- notification/digest hardening behavior
- activation behavior
- frontend API contract exports

Known non-blocking warnings:
- FastAPI `on_event` deprecation warnings remain and can be migrated to lifespan handlers in a maintenance pass.
